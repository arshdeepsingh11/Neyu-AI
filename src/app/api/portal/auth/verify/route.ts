// POST /api/portal/auth/verify — { code } confirm the 6-digit email code.
import { NextResponse } from "next/server";
import { requirePatient, assertSameOrigin, clientMeta } from "@backend/patientAuth";
import { confirmVerificationCode } from "@backend/emailVerification";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { readJson, toResponse, str, HttpError } from "@backend/apiHelpers";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const p = await requirePatient({ allowUnverified: true });
    if (p.emailVerified) return NextResponse.json({ ok: true });
    if (!(await rateLimit(`verify:${p.id}`, 20, 15 * 60 * 1000))) throw new HttpError(429, "Too many attempts. Please wait a few minutes.");
    await confirmVerificationCode(p.id, str((await readJson(req)).code, 10));
    audit(p.id, "patient", "update", "email-verified", (await clientMeta()).ip);
    return NextResponse.json({ ok: true });
  } catch (e) { return toResponse(e); }
}
