// POST /api/admin/action { action, …fields } — staff changes from the admin
// console. Same-origin + staff sign-in required; every action is audited.

import { NextResponse } from "next/server";
import { requireAdmin, checkAdminPassword } from "@backend/adminAuth";
import { checkStaffPassword } from "@backend/staffAuth";
import { adminLog } from "@backend/adminAudit";
import { assertSameOrigin, clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { readJson, toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";
import { runAction } from "@backend/adminActions";
import { assertAccess, grantAccess, patientOfAction, ACTION_PERMS, ReasonRequired } from "@backend/access";
import { runStaffAction } from "@backend/staffAdmin";
import { cancelDeletion, runDeletion } from "@backend/privacy";
import { prisma } from "@backend/db";

export async function POST(req: Request) {
  let admin: Awaited<ReturnType<typeof requireAdmin>> | null = null, action = "";
  try {
    await assertSameOrigin();
    admin = await requireAdmin();
    const { actor } = admin;
    const { ip } = await clientMeta();
    if (!(await rateLimit(`admin-action:${ip}`, 240, 60 * 1000))) throw new HttpError(429, "Too many requests. Please wait a moment.");
    const b = await readJson(req, 100_000);
    action = typeof b.action === "string" ? b.action.slice(0, 40) : "";

    // Break-glass: a written reason opens one patient (or one area) for 60 minutes.
    if (action === "access.grant") {
      await grantAccess(admin, String(b.target || ""), String(b.reason || ""), ip);
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }
    // The reveal dialog already asks for a reason — it counts as the break-glass reason.
    const pid = await patientOfAction(b);
    if (action === "reveal" && pid && typeof b.reason === "string" && b.reason.trim().length >= 3 && admin.staff?.perms["patients.record.read"] === "reason") {
      await grantAccess(admin, "patient:" + pid, b.reason, ip);
    }
    await assertAccess(admin, ACTION_PERMS[action], pid);

    // Unlocking an idle-locked console re-checks the password (own password; old shared one for shared sessions).
    if (b.action === "session.unlock") {
      if (!(await rateLimit(`admin-unlock:${ip}`, 10, 15 * 60 * 1000))) throw new HttpError(429, "Too many attempts. Please wait a few minutes.");
      const pw = typeof b.password === "string" ? b.password.slice(0, 200) : "";
      const ok = !!pw && (admin.staff ? await checkStaffPassword(admin.staff.id, pw) : checkAdminPassword(pw));
      await adminLog({ actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Account", action: ok ? "Unlocked session" : "Failed unlock", resource: "Admin console", result: ok ? "Success" : "Denied" });
      if (!ok) throw new HttpError(401, "That password isn't right.");
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }

    const staffResult = await runStaffAction(b, admin, ip);
    if (staffResult) return NextResponse.json(staffResult, { headers: NO_STORE });

    if (action === "privacy.deletion.cancel" || action === "privacy.deletion.now") {
      const r = await prisma.deletionRequest.findUnique({ where: { id: String(b.requestId || "").slice(0, 40) } });
      if (!r || !r.patientId || r.status !== "pending") throw new HttpError(404, "No pending request.");
      const reason = String(b.reason || "").trim().slice(0, 300);
      if (reason.length < 5) throw new HttpError(400, "Write a short reason (it is saved in the audit log).");
      const p = await prisma.patient.findUnique({ where: { id: r.patientId }, select: { firstName: true, lastName: true } });
      // Logged first: after a deletion the patient (and their access log) no longer exists.
      await adminLog({ actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Account", action: action === "privacy.deletion.cancel" ? "Cancelled account deletion" : "Deleted account now (skipped hold)", resource: "Deletion request", subjectType: "patient", subjectId: r.patientId, subject: p ? `${p.firstName} ${p.lastName}` : null, reason });
      if (action === "privacy.deletion.cancel") await cancelDeletion(r.patientId, "staff", { ip, actor });
      else await runDeletion(r.id, true);
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }

    const result = await runAction(b, { actor, ip, role: admin.role, staffId: admin.staff?.id });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (e) {
    if (admin && e instanceof HttpError && e.status === 403 && !(e instanceof ReasonRequired)) {
      const { ip } = await clientMeta();
      await adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Change", action: "Action refused", resource: "Action · " + action, result: "Denied" });
    }
    return toResponse(e);
  }
}
