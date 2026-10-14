// POST /api/admin/mfa { code } — second sign-in step: the 6-digit code from the
// authenticator app. Needs the short "pending" session from /api/admin/login.
// First-time setup: the first correct code turns the 2-step code on for good.

import { NextResponse } from "next/server";
import { finishStaffLogin } from "@backend/staffAuth";
import { adminLog } from "@backend/adminAudit";
import { assertSameOrigin, clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { readJson, toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const { ip } = await clientMeta();
    if (!rateLimit(`admin-mfa:${ip}`, 20, 15 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Please wait 15 minutes.");
    const b = await readJson(req);
    const code = typeof b.code === "string" ? b.code.replace(/\s/g, "") : "";
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from your authenticator app.");

    const r = await finishStaffLogin(code);
    if (!r.ok) {
      if (r.reason === "no_session") throw new HttpError(401, "Your sign-in expired. Enter your email and password again.");
      await adminLog({ actor: r.email || "unknown", staffId: r.staffId, ip, kind: "Account", action: r.reason === "too_many" ? "2-step code failed 5 times — sign-in cancelled" : "Wrong 2-step code", resource: "Admin console", result: "Denied" });
      if (r.reason === "too_many") throw new HttpError(401, "Too many wrong codes. Enter your email and password again.");
      throw new HttpError(401, "That code isn't right. Check the time on your phone and try the newest code.");
    }
    await adminLog({ actor: r.email, staffId: r.staffId, ip, kind: "Account", action: r.firstSetup ? "Turned on 2-step code and signed in" : "Signed in (2-step code)", resource: "Admin console" });
    return NextResponse.json({ ok: true, step: "done", actor: r.email }, { headers: NO_STORE });
  } catch (e) {
    return toResponse(e);
  }
}
