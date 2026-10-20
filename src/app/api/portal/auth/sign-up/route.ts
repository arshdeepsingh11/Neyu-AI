// POST /api/portal/auth/sign-up — create a My Health Space account.
// Controlled by PORTAL_SIGNUP_OPEN (default open). Set it to "false" to
// close public sign-up before the HIA Privacy Impact Assessment clears.

import { LEGAL } from "@/lib/legal";
import { NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { sendVerificationCode } from "@backend/emailVerification";
import { hashPassword, passwordProblem, createSession, normalizeEmail, isValidEmail, clientMeta, assertSameOrigin } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { linkVisitorToPatient, currentSessionId } from "@backend/visitors";
import { readJson, toResponse, str, HttpError } from "@backend/apiHelpers";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    if (process.env.PORTAL_SIGNUP_OPEN === "false") throw new HttpError(403, "New accounts aren't open yet. Please contact the clinic.");
    const { ip } = await clientMeta();
    if (!(await rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000))) throw new HttpError(429, "Too many attempts. Please try again later.");

    const b = await readJson(req);
    const firstName = str(b.firstName, 60), lastName = str(b.lastName, 60), email = normalizeEmail(str(b.email, 254));
    const password = typeof b.password === "string" ? b.password : "";
    if (!firstName || !lastName) throw new HttpError(400, "Please enter your first and last name.");
    if (!isValidEmail(email)) throw new HttpError(400, "Please enter a valid email address.");
    const pwErr = passwordProblem(password, email);
    if (pwErr) throw new HttpError(400, pwErr);
    if (b.consent !== true) throw new HttpError(400, `Please confirm you are ${LEGAL.minAge} or older and agree to the Terms of Use and Privacy Policy.`);

    let dateOfBirth: Date | null = null;
    if (b.dateOfBirth) {
      const d = new Date(String(b.dateOfBirth) + "T00:00:00Z");
      if (isNaN(d.getTime()) || d > new Date() || d.getUTCFullYear() < 1900) throw new HttpError(400, "Please check your date of birth.");
      // My Health Space is for adults (Privacy Policy → Age). Younger patients: care through the clinic with a parent.
      const now = new Date(), adultOn = new Date(Date.UTC(d.getUTCFullYear() + LEGAL.minAge, d.getUTCMonth(), d.getUTCDate()));
      if (adultOn > now) throw new HttpError(400, `My Health Space is for people ${LEGAL.minAge} and older. For care for a child or teen, please call the clinic.`);
      dateOfBirth = d;
    }
    const timezone = typeof b.timezone === "string" && b.timezone.length < 60 && Intl.supportedValuesOf?.("timeZone").includes(b.timezone) ? b.timezone : "America/Edmonton";

    const exists = await prisma.patient.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new HttpError(409, "An account with this email already exists. Try signing in.");

    const patient = await prisma.patient.create({
      data: {
        email, firstName, lastName, dateOfBirth, timezone, passwordHash: await hashPassword(password), termsAcceptedAt: new Date(),
        settings: { create: {} },
        emailPreference: { create: { news: b.news === true } },
      },
      select: { id: true },
    });
    // Consent record (legal proof of what was agreed, which version, when, from where).
    const { recordConsent } = await import("@backend/privacy");
    const meta = { ip, userAgent: req.headers.get("user-agent") || undefined };
    await recordConsent(patient.id, "terms", true, "signup", meta);
    await recordConsent(patient.id, "privacy", true, "signup", meta);
    if (b.news === true) await recordConsent(patient.id, "marketing", true, "signup", meta);
    await createSession(patient.id);
    audit(patient.id, "patient", "create", "account", ip);
    // Anything this browser did anonymously (Neyu, symptom checks…) joins the new record.
    await linkVisitorToPatient(await currentSessionId(), patient.id);
    // Email ownership must be confirmed before any health data is shown.
    let emailSent = true;
    try { await sendVerificationCode({ id: patient.id, email, firstName }); } catch { emailSent = false; }
    return NextResponse.json({ ok: true, verify: true, emailSent }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    return toResponse(e);
  }
}
