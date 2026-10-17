// My Health Space — patient authentication.
//
// • Passwords: scrypt (N=2^15, r=8, p=1, 64-byte key, 16-byte salt), stored
//   as "scrypt$N$r$p$salt$hash". Node's built-in crypto — no dependency.
// • Sessions: random 256-bit token in an httpOnly cookie; only its SHA-256
//   is stored, so a leaked DB can't be replayed. 30-day sliding expiry.
// • CSRF: cookie is SameSite=Lax and every mutating request must pass the
//   same-origin check (assertSameOrigin).

import { cookies, headers } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "@backend/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const PATIENT_COOKIE = "anra_pt";
const SESSION_DAYS = 30;
const TOUCH_EVERY_MS = 60 * 60 * 1000; // refresh lastSeen/expiry at most hourly
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

const N = 1 << 15, R = 8, P = 1, KEYLEN = 64;
const SCRYPT_OPTS = { N, r: R, p: P, maxmem: 128 * N * R * 2 };

// ── Passwords ────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT_OPTS);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// A pre-computed hash so failed lookups take the same time as real ones
// (prevents discovering which emails have accounts via response timing).
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("anra-timing-equaliser");
  await verifyPassword(password, await dummyHash);
}

// Rules shared with the browser's strength meter.
export { passwordProblem } from "@/lib/portal/password";

// ── Sessions ─────────────────────────────────────────────────────────────
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function clientMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return { ip, userAgent: (h.get("user-agent") || "").slice(0, 300) };
}

export async function createSession(patientId: string) {
  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await clientMeta();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.patientSession.create({ data: { tokenHash: sha256(token), patientId, ip, userAgent, expiresAt } });
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(PATIENT_COOKIE)?.value;
  if (token) await prisma.patientSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(PATIENT_COOKIE);
}

/** Revoke every session for a patient except the current one (password change). */
export async function revokeOtherSessions(patientId: string) {
  const token = (await cookies()).get(PATIENT_COOKIE)?.value;
  await prisma.patientSession.deleteMany({ where: { patientId, NOT: token ? { tokenHash: sha256(token) } : undefined } });
}

export interface CurrentPatient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  photoVersion: number;
  emailVerified: boolean;
}

/** Resolve the signed-in patient from the cookie (null if signed out / expired). */
export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const token = (await cookies()).get(PATIENT_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await prisma.patientSession.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true, expiresAt: true, lastSeenAt: true,
      patient: { select: { id: true, email: true, firstName: true, lastName: true, timezone: true, photoVersion: true, emailVerifiedAt: true, accountStatus: true } },
    },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await prisma.patientSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    // Sliding expiry. The cookie keeps its original expiry until next sign-in;
    // the DB row is the source of truth.
    await prisma.patientSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_DAYS * 86400000) },
    }).catch(() => {});
  }
  const { emailVerifiedAt, accountStatus, ...p } = session.patient;
  // Deactivated / deletion-requested accounts are signed out everywhere.
  // During the 30-day deletion hold the patient can still sign in (to download data or cancel).
  if (accountStatus !== "active" && accountStatus !== "deletion_requested") return null;
  return { ...p, emailVerified: !!emailVerifiedAt };
}

/** Cheap patient id lookup for activity logging (never throws). */
export async function currentPatientIdSafe(): Promise<string | undefined> {
  try {
    const p = await getCurrentPatient();
    return p?.id;
  } catch {
    return undefined;
  }
}

// ── Login lockout ────────────────────────────────────────────────────────
export function isLocked(p: { lockedUntil: Date | null }) {
  return !!p.lockedUntil && p.lockedUntil.getTime() > Date.now();
}

export async function recordFailedLogin(patientId: string, failedLogins: number) {
  const next = failedLogins + 1;
  await prisma.patient.update({
    where: { id: patientId },
    data: next >= MAX_FAILED
      ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
      : { failedLogins: next },
  });
}

// ── Request guards (Route Handlers) ─────────────────────────────────────
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Reject cross-site mutating requests (defence in depth on top of SameSite). */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / server calls
  const host = h.get("x-forwarded-host") || h.get("host");
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(403, "Bad origin");
  }
}

/** Signed-in patient. Health data needs a verified email (428 = verify first). */
export async function requirePatient(opts: { allowUnverified?: boolean } = {}): Promise<CurrentPatient> {
  const p = await getCurrentPatient();
  if (!p) throw new HttpError(401, "Please sign in.");
  if (!p.emailVerified && !opts.allowUnverified) throw new HttpError(428, "Please verify your email address first.");
  return p;
}

export const normalizeEmail = (e: string) => (e || "").trim().toLowerCase();
export const isValidEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 254;
