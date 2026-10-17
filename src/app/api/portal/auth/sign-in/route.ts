// POST /api/portal/auth/sign-in — email + password.
// Generic error message (no account enumeration), constant-time on unknown
// emails, per-IP and per-email rate limits, 15-minute lock after 8 misses.

import { NextResponse } from "next/server";
import { sendVerificationCode, hasActiveCode } from "@backend/emailVerification";
import { prisma } from "@backend/db";
import { verifyPassword, burnPasswordCheck, createSession, normalizeEmail, clientMeta, assertSameOrigin, isLocked, recordFailedLogin } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { linkVisitorToPatient, currentSessionId } from "@backend/visitors";
import { readJson, toResponse, str, HttpError } from "@backend/apiHelpers";

const WRONG = "Email or password is incorrect.";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const { ip } = await clientMeta();
    const b = await readJson(req);
    const email = normalizeEmail(str(b.email, 254));
    const password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
    if (!email || !password) throw new HttpError(400, "Please enter your email and password.");
    if (!(await rateLimit(`signin-ip:${ip}`, 30, 15 * 60 * 1000)) || !(await rateLimit(`signin-email:${email}`, 10, 15 * 60 * 1000))) {
      throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
    }

    const p = await prisma.patient.findUnique({ where: { email }, select: { id: true, passwordHash: true, failedLogins: true, lockedUntil: true, emailVerifiedAt: true, email: true, firstName: true, accountStatus: true } });
    if (!p) { await burnPasswordCheck(password); throw new HttpError(401, WRONG); }
    if (isLocked(p)) throw new HttpError(423, "This account is temporarily locked after several attempts. Please try again in 15 minutes.");
    if (!(await verifyPassword(password, p.passwordHash))) {
      await recordFailedLogin(p.id, p.failedLogins);
      throw new HttpError(401, WRONG);
    }
    if (p.accountStatus !== "active" && p.accountStatus !== "deletion_requested") throw new HttpError(403, "This account isn't active. Please contact the clinic.");
    await prisma.patient.update({ where: { id: p.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await createSession(p.id);
    audit(p.id, "patient", "login", "session", ip);
    await linkVisitorToPatient(await currentSessionId(), p.id);
    if (!p.emailVerifiedAt) {
      // Unverified: send a fresh code unless one is still valid (errors ignored — the verify page can resend).
      if (!(await hasActiveCode(p.id))) await sendVerificationCode(p).catch(() => {});
      return NextResponse.json({ ok: true, verify: true });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toResponse(e);
  }
}
