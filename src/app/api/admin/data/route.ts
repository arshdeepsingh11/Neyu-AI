// GET /api/admin/data?view=… — read models for the admin console.
// Staff sign-in required, and every view checks the staff member's role
// (backend/access.ts). Opening a patient or visitor record (log=1), opening an
// AI item and every refused attempt are recorded in the audit log.

import { NextResponse } from "next/server";
import { requireAdmin } from "@backend/adminAuth";
import { adminLog } from "@backend/adminAudit";
import { clientMeta } from "@backend/patientAuth";
import { toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";
import * as data from "@backend/adminData";
import { backfillVisitors } from "@backend/visitors";
import { assertAccess, permsFor, VIEW_PERMS, ReasonRequired } from "@backend/access";
import { staffView } from "@backend/staffAdmin";
import { platformAudit, auditStats } from "@backend/auditData";
import { privacyAdminView } from "@backend/privacy";
import { cached, kv } from "@backend/kv";
import { storage } from "@backend/storage";
import { queueStats } from "@backend/queue";

export async function GET(req: Request) {
  let admin: Awaited<ReturnType<typeof requireAdmin>> | null = null, view = "";
  try {
    admin = await requireAdmin();
    const { actor } = admin;
    const who = { actor, role: admin.role, staffId: admin.staff?.id };
    const { ip } = await clientMeta();
    const q = new URL(req.url).searchParams;
    view = q.get("view") || "";
    const id = (q.get("id") || "").slice(0, 80);
    const range = q.get("range"), from = q.get("from"), to = q.get("to");
    let out: unknown;
    await assertAccess(admin, VIEW_PERMS[view], view === "patient" ? id : null);

    switch (view) {
      case "boot": out = { ...(await data.boot(actor, admin.role)), ...permsFor(admin), name: admin.staff?.name || actor, system: { store: kv.backend(), storage: storage.driver(), queue: (await queueStats()).mode } }; break;
      case "overview": out = await data.overview(range, from, to); break;
      case "inbox": out = { queue: await data.loadQueue() }; break;
      case "analytics": out = await cached(`analytics:${range}:${from}:${to}`, 60, () => data.analytics(range, from, to)); break;
      case "patients": out = { rows: await data.patientsList() }; break;
      case "patient": {
        const p = await data.patient360(id);
        if (!p) throw new HttpError(404, "Patient not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Opened Patient 360", resource: "Patient record", subjectType: "patient", subjectId: p.id, subject: p.name });
        out = p;
        break;
      }
      case "visitors": {
        await backfillVisitors(); // older activity recorded before visitor records existed
        out = { rows: await data.visitorsList() };
        break;
      }
      case "visitor": {
        const v = await data.visitorRecord(id);
        if (!v) throw new HttpError(404, "Visitor not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Opened visitor record", resource: "Visitor record", subjectType: "visitor", subjectId: v.id, subject: "Visitor " + v.id });
        out = v;
        break;
      }
      case "referrals": out = { rows: await data.referralsList() }; break;
      case "referral": {
        const r = await data.referralDetail(id);
        if (!r) throw new HttpError(404, "Referral not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Viewed referral", resource: "Referral " + r.code, subjectType: "referral", subjectId: r.id, subject: r.patient });
        out = r;
        break;
      }
      case "requests": out = { rows: await data.requestsList() }; break;
      case "ai": out = { rows: await data.aiList() }; break;
      case "ai-item": {
        const a = await data.aiDetail(id);
        if (!a) throw new HttpError(404, "Item not found.");
        const what = { symptom: "symptom check", alba: "Neyu conversation", assessment: "assessment", lab: "lab explainer" }[a.kind];
        await adminLog({ ...who, ip, kind: "View", action: "Viewed " + what, resource: "AI · " + a.id, subjectType: a.isVisitor ? "visitor" : "patient", subjectId: a.whoId, subject: a.who });
        out = a;
        break;
      }
      case "audit": out = { rows: await data.auditList() }; break;
      case "audit-item": {
        const e = await data.auditItem(id);
        if (!e) throw new HttpError(404, "Event not found.");
        out = e;
        break;
      }
      case "audit-platform": out = await platformAudit(q); break;
      case "audit-stats": out = await auditStats(); break;
      case "staff": out = await staffView(admin); break;
      case "privacy": out = await privacyAdminView(); break;
      case "settings": out = await data.settings(); break;
      case "search": out = await data.search((q.get("q") || "").slice(0, 80)); break;
      case "unlinked-referrals": out = { rows: (await data.referralsList()).filter((r) => !r.pid) }; break;
      default: throw new HttpError(400, "Unknown view.");
    }
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (e) {
    // A refused screen is part of the audit trail (break-glass prompts are not refusals).
    if (admin && e instanceof HttpError && e.status === 403 && !(e instanceof ReasonRequired)) {
      const { ip } = await clientMeta();
      await adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "View", action: "Access refused", resource: "Screen · " + view, result: "Denied" });
    }
    return toResponse(e);
  }
}
