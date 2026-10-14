// POST /api/admin/login { identifier, password }
//
// Staff account (email found in StaffUser): checks the password, then asks for the 2-step code.
//   → { ok, step: "code" }                       enter the 6-digit code  (POST /api/admin/mfa)
//   → { ok, step: "setup", secret, otpauth, qr }  first sign-in: scan the QR code, then enter a code
// Old shared password (only until the first super admin has signed in with their own account):
//   → { ok, step: "done", actor }

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { checkAdminPassword, createAdminToken, cleanActor, ADMIN_COOKIE, ADMIN_SESSION_HOURS } from "@backend/adminAuth";
import { startStaffLogin, staffExists, legacyLoginAllowed, normalizeStaffEmail } from "@backend/staffAuth";
import { adminLog } from "@backend/adminAudit";
import { assertSameOrigin, clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { readJson, toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";

const WRONG = "That email or password isn't right.";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const { ip, userAgent } = await clientMeta();
    if (!rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Please wait 15 minutes.");
    const b = await readJson(req);
    if (typeof b.identifier !== "string" || !b.identifier.trim()) throw new HttpError(400, "Enter your work email.");
    if (typeof b.password !== "string" || !b.password) throw new HttpError(400, "Enter your password.");
    const email = normalizeStaffEmail(b.identifier);

    // 1 · Staff account
    if (await staffExists(email)) {
      const r = await startStaffLogin(email, b.password.slice(0, 200), { ip, userAgent });
      if (!r.ok) {
        await adminLog({ actor: email, staffId: r.staffId, ip, kind: "Account", action: r.reason === "locked" ? "Sign-in blocked (locked)" : r.reason === "suspended" ? "Sign-in blocked (suspended)" : "Failed sign-in", resource: "Admin console", result: "Denied" });
        if (r.reason === "locked") throw new HttpError(423, "Too many wrong passwords. This account is locked for 15 minutes.");
        throw new HttpError(401, WRONG); // same message for wrong password / suspended: don't reveal which
      }
      await adminLog({ actor: email, staffId: r.staffId, ip, kind: "Account", action: "Password accepted — waiting for 2-step code", resource: "Admin console" });
      if (r.step === "setup") {
        const qr = await QRCode.toDataURL(r.otpauth!, { margin: 1, width: 220, errorCorrectionLevel: "M" });
        return NextResponse.json({ ok: true, step: "setup", email, secret: r.secret, otpauth: r.otpauth, qr }, { headers: NO_STORE });
      }
      return NextResponse.json({ ok: true, step: "code", email }, { headers: NO_STORE });
    }

    // 2 · Old shared password (switches off by itself once a super admin has their own sign-in)
    if ((await legacyLoginAllowed()) && checkAdminPassword(b.password)) {
      const actor = cleanActor(b.identifier);
      (await cookies()).set(ADMIN_COOKIE, createAdminToken(actor), {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_HOURS * 60 * 60,
      });
      await adminLog({ actor, ip, kind: "Account", action: "Signed in (shared password)", resource: "Admin console", role: "Admin (shared)" });
      return NextResponse.json({ ok: true, step: "done", actor }, { headers: NO_STORE });
    }

    await adminLog({ actor: "unknown", ip, kind: "Account", action: "Failed sign-in", resource: "Admin console", subject: cleanActor(b.identifier), result: "Denied" });
    throw new HttpError(401, WRONG);
  } catch (e) {
    return toResponse(e);
  }
}
