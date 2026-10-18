// Staff sign-in for the admin console (Phase 3).
//
//   1. Email + password  (scrypt hash, 5 wrong tries → locked 15 minutes)
//   2. 2-step code       (authenticator app; first sign-in shows a QR code to set it up)
//   3. Session           (random token in an httpOnly cookie; only its SHA-256 hash is stored)
//
// Roles and permissions come from Membership → Role → RolePermission (see schema.prisma).
// Scope per permission: "full", "reason" (break-glass: a reason must be recorded) or "own".

import { randomBytes, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@backend/db";
import { HttpError, sha256, verifyPassword, burnPasswordCheck, hashPassword } from "@backend/patientAuth";
import { encrypt, decrypt } from "@backend/oauth";
import { newTotpSecret, verifyTotp, otpauthUri } from "@backend/totp";
import { kv } from "@backend/kv";

export const STAFF_COOKIE = "neyu_staff";
export const STAFF_SESSION_HOURS = 8; // one shift; the console also locks after 15 min idle
const PENDING_MINUTES = 10; // time allowed between password and 2-step code
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type Scope = "full" | "reason" | "own";
const RANK: Record<Scope, number> = { own: 1, reason: 2, full: 3 };

export interface Staff {
  id: string;
  email: string;
  name: string;
  sessionId: string;
  orgId: string;
  roles: { key: string; name: string }[];
  perms: Record<string, Scope>;
  isSuper: boolean;
}

const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSec,
});

export const normalizeStaffEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase().slice(0, 254) : "");

// Shared store (Redis, or memory on a laptop): last accepted 30-s step per staff
// member (a code works once) and wrong codes per pending sign-in.
const STEP_KEY = (staffId: string) => `totp:last:${staffId}`;
const TRIES_KEY = (sessionId: string) => `totp:tries:${sessionId}`;

// ── Step 1: password ────────────────────────────────────────────────────────
export interface PasswordResult {
  ok: boolean;
  reason?: "unknown" | "bad_password" | "locked" | "suspended"; // when ok is false
  step?: "code" | "setup" | "done"; // when ok is true ("done" = no 2-step code needed for this person)
  staffId?: string;
  email: string;
  secret?: string;
  otpauth?: string;
}

// ── Super admin from the server settings (.env) ─────────────────────────────
//   SUPER_ADMIN_USERNAME=arsh           (a username or an email)
//   SUPER_ADMIN_PASSWORD=…              (8+ characters; the login checks this value)
//   SUPER_ADMIN_NAME="Arsh Singh"       (optional)
//   SUPER_ADMIN_2STEP=on                (optional — also ask for the authenticator code)
// This account always exists and can't be suspended, demoted or locked out from the console.
// It's the way back in if every other admin is lost. Change the password in .env, restart the app.
export function envSuperAdmin() {
  const username = normalizeStaffEmail(process.env.SUPER_ADMIN_USERNAME || "");
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  if (!username || password.length < 8) return null;
  return { username, password, name: (process.env.SUPER_ADMIN_NAME || "Super Admin").slice(0, 80), twoStep: process.env.SUPER_ADMIN_2STEP === "on" };
}
export const isEnvSuperAdmin = (email: string) => envSuperAdmin()?.username === email;

let envSynced = 0;
/** Makes sure the .env super admin exists in the database with the right password and role. */
async function syncEnvSuperAdmin(force = false) {
  const env = envSuperAdmin();
  if (!env || (!force && Date.now() - envSynced < 60_000)) return;
  let s = await prisma.staffUser.findUnique({ where: { email: env.username } });
  if (!s) s = await prisma.staffUser.create({ data: { email: env.username, name: env.name, passwordHash: await hashPassword(env.password), status: "active", mfaRequired: env.twoStep } });
  else {
    const data: Record<string, unknown> = {};
    if (!(await verifyPassword(env.password, s.passwordHash))) data.passwordHash = await hashPassword(env.password);
    if (s.status !== "active") data.status = "active";
    if (s.mfaRequired !== env.twoStep) data.mfaRequired = env.twoStep;
    if (s.name !== env.name) data.name = env.name;
    if (Object.keys(data).length) s = await prisma.staffUser.update({ where: { id: s.id }, data });
  }
  await prisma.membership.upsert({
    where: { staffId_orgId_roleId: { staffId: s.id, orgId: "org_neyu", roleId: "role_super_admin" } },
    update: { status: "active" },
    create: { staffId: s.id, orgId: "org_neyu", roleId: "role_super_admin" },
  });
  envSynced = Date.now();
}
const sameSecret = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest(), y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

export async function staffExists(email: string) {
  if (isEnvSuperAdmin(email)) { await syncEnvSuperAdmin(); return true; }
  return !!(await prisma.staffUser.findUnique({ where: { email }, select: { id: true } }));
}

export async function startStaffLogin(email: string, password: string, meta: { ip?: string; userAgent?: string }): Promise<PasswordResult> {
  const env = isEnvSuperAdmin(email) ? envSuperAdmin() : null;
  // The right .env password always re-syncs at once (row deleted, suspended in the DB or
  // membership removed → fixed on the next sign-in, not after the 60-second cache).
  if (env) await syncEnvSuperAdmin(sameSecret(password, env.password));
  const s = await prisma.staffUser.findUnique({ where: { email } });
  if (!s) { await burnPasswordCheck(password); return { ok: false, reason: "unknown", email }; }
  // The .env super admin is never locked (nobody can lock the owner out by guessing);
  // the per-IP sign-in limit still applies to it.
  if (!env && s.lockedUntil && s.lockedUntil > new Date()) return { ok: false, reason: "locked", staffId: s.id, email };
  if (s.status !== "active") { await burnPasswordCheck(password); return { ok: false, reason: "suspended", staffId: s.id, email }; }

  const passwordOk = env ? sameSecret(password, env.password) : await verifyPassword(password, s.passwordHash);
  if (!passwordOk && env) return { ok: false, reason: "bad_password", staffId: s.id, email };
  if (!passwordOk) {
    const n = s.failedLogins + 1;
    await prisma.staffUser.update({
      where: { id: s.id },
      data: n >= MAX_FAILED ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: n },
    });
    return { ok: false, reason: n >= MAX_FAILED ? "locked" : "bad_password", staffId: s.id, email };
  }

  // No 2-step code for this person (a super admin chose "password only") → signed in now.
  if (!s.mfaRequired) {
    await createSession(s.id, true, meta);
    await prisma.staffUser.update({ where: { id: s.id }, data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null } });
    legacyCache = null;
    return { ok: true, step: "done", staffId: s.id, email };
  }

  // Password OK → a short "pending" session that only allows entering the 2-step code.
  await createSession(s.id, false, meta);
  if (s.mfaEnabledAt && s.mfaSecretEnc) return { ok: true, step: "code", staffId: s.id, email };

  // First sign-in: new secret, kept encrypted until the first correct code turns it on.
  const secret = newTotpSecret();
  await prisma.staffUser.update({ where: { id: s.id }, data: { mfaSecretEnc: encrypt(secret) } });
  await kv.del(STEP_KEY(s.id)); // new secret → earlier codes don't matter
  return { ok: true, step: "setup", staffId: s.id, email, secret, otpauth: otpauthUri(email, secret) };
}

// ── Step 2: 2-step code ─────────────────────────────────────────────────────

export interface CodeResult { ok: boolean; reason?: "no_session" | "bad_code" | "too_many"; staffId?: string; email?: string; firstSetup?: boolean }

export async function finishStaffLogin(code: string): Promise<CodeResult> {
  const sess = await readSession();
  if (!sess || sess.mfaVerified) return { ok: false, reason: "no_session" };
  const s = sess.staff;
  if (!s.mfaSecretEnc || s.status !== "active") return { ok: false, reason: "no_session" };

  let secret = "";
  try { secret = decrypt(s.mfaSecretEnc); } catch { return { ok: false, reason: "no_session" }; }
  const last = await kv.get(STEP_KEY(s.id));
  const step = verifyTotp(secret, code, last ? Number(last) : -1);
  if (step === null) {
    const n = await kv.incr(TRIES_KEY(sess.id), PENDING_MINUTES * 60);
    if (n >= MAX_FAILED) {
      await kv.del(TRIES_KEY(sess.id));
      await prisma.staffSession.delete({ where: { id: sess.id } }).catch(() => {});
      (await cookies()).delete(STAFF_COOKIE);
      return { ok: false, reason: "too_many", staffId: s.id, email: s.email };
    }
    return { ok: false, reason: "bad_code", staffId: s.id, email: s.email };
  }
  await kv.set(STEP_KEY(s.id), String(step), 120);
  await kv.del(TRIES_KEY(sess.id));

  const firstSetup = !s.mfaEnabledAt;
  const expiresAt = new Date(Date.now() + STAFF_SESSION_HOURS * 3600_000);
  await prisma.$transaction([
    prisma.staffSession.update({ where: { id: sess.id }, data: { mfaVerified: true, expiresAt, lastSeenAt: new Date() } }),
    prisma.staffUser.update({ where: { id: s.id }, data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null, ...(firstSetup ? { mfaEnabledAt: new Date() } : {}) } }),
  ]);
  (await cookies()).set(STAFF_COOKIE, sess.token, cookieOpts(STAFF_SESSION_HOURS * 3600));
  legacyCache = null; // a super admin may just have finished setup → old shared password switches off
  return { ok: true, staffId: s.id, email: s.email, firstSetup };
}

// ── Sessions ────────────────────────────────────────────────────────────────
async function createSession(staffId: string, mfaVerified: boolean, meta: { ip?: string; userAgent?: string }) {
  const token = randomBytes(32).toString("base64url");
  const minutes = mfaVerified ? STAFF_SESSION_HOURS * 60 : PENDING_MINUTES;
  await prisma.staffSession.create({
    data: { tokenHash: sha256(token), staffId, mfaVerified, ip: meta.ip?.slice(0, 60) || null, userAgent: meta.userAgent?.slice(0, 300) || null, expiresAt: new Date(Date.now() + minutes * 60_000) },
  });
  (await cookies()).set(STAFF_COOKIE, token, cookieOpts(minutes * 60));
  // Housekeeping: drop this person's expired sessions.
  await prisma.staffSession.deleteMany({ where: { staffId, expiresAt: { lt: new Date() } } }).catch(() => {});
}

async function readSession() {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const sess = await prisma.staffSession.findUnique({ where: { tokenHash: sha256(token) }, include: { staff: true } });
  if (!sess || sess.expiresAt < new Date()) return null;
  return { ...sess, token };
}

export async function endStaffSession() {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (token) await prisma.staffSession.deleteMany({ where: { tokenHash: sha256(token) } }).catch(() => {});
  (await cookies()).delete(STAFF_COOKIE);
}

/** Signs this person out everywhere (password change, suspension). */
export async function endAllStaffSessions(staffId: string) {
  await prisma.staffSession.deleteMany({ where: { staffId } });
}

/** The signed-in staff member (password + 2-step code done), with roles and permissions — or null. */
export async function getStaff(): Promise<Staff | null> {
  const sess = await readSession();
  if (!sess || !sess.mfaVerified || sess.staff.status !== "active") return null;
  const memberships = await prisma.membership.findMany({
    where: { staffId: sess.staffId, status: "active" },
    include: { role: { include: { permissions: true } } },
  });
  if (!memberships.length) return null; // an account with no role can't open the console

  const perms: Record<string, Scope> = {};
  for (const m of memberships) for (const rp of m.role.permissions) {
    const sc = (["full", "reason", "own"].includes(rp.scope) ? rp.scope : "own") as Scope;
    if (!perms[rp.permissionKey] || RANK[sc] > RANK[perms[rp.permissionKey]]) perms[rp.permissionKey] = sc;
  }
  // Keep "last seen" fresh without a write on every request.
  if (Date.now() - sess.lastSeenAt.getTime() > 5 * 60_000) {
    prisma.staffSession.update({ where: { id: sess.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const roles = memberships.map((m) => ({ key: m.role.key, name: m.role.name }));
  return {
    id: sess.staff.id, email: sess.staff.email, name: sess.staff.name, sessionId: sess.id,
    orgId: memberships[0].orgId, roles, perms, isSuper: roles.some((r) => r.key === "super_admin"),
  };
}

// ── Permission checks ───────────────────────────────────────────────────────
/** Does this staff member have the permission (at least the given scope)? */
export function can(staff: Staff | null | undefined, permission: string, atLeast: Scope = "own"): boolean {
  const sc = staff?.perms[permission];
  return !!sc && RANK[sc] >= RANK[atLeast];
}

/** Route guard: 403 unless allowed. A "reason" scope requires a written reason (break-glass). */
export function assertCan(staff: Staff, permission: string, reason?: string | null) {
  const sc = staff.perms[permission];
  if (!sc) throw new HttpError(403, "Your role doesn't allow this.");
  if (sc === "reason" && !(reason && reason.trim().length >= 5)) throw new HttpError(403, "Give a reason for opening this record (it is saved in the audit log).");
  return sc;
}

export async function checkStaffPassword(staffId: string, password: string) {
  const s = await prisma.staffUser.findUnique({ where: { id: staffId }, select: { passwordHash: true, status: true } });
  if (!s || s.status !== "active") return false;
  return verifyPassword(password, s.passwordHash);
}

// ── Old shared password (switch-off) ────────────────────────────────────────
// The shared ADMIN_PASSWORD keeps working only while no super admin exists yet: it is
// refused as soon as SUPER_ADMIN_USERNAME is set in .env, or a super admin has signed in
// with their own account. Then every old shared-password session stops working too.
// Force it off any time with ADMIN_LEGACY_LOGIN=off.
let legacyCache: { at: number; on: boolean } | null = null;
export async function legacyLoginAllowed(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_LEGACY_LOGIN === "off" || envSuperAdmin()) return false;
  if (legacyCache && Date.now() - legacyCache.at < 60_000) return legacyCache.on;
  const ready = await prisma.staffUser.count({
    where: { status: "active", lastLoginAt: { not: null }, memberships: { some: { status: "active", role: { key: "super_admin" } } } },
  });
  legacyCache = { at: Date.now(), on: ready === 0 };
  return legacyCache.on;
}
