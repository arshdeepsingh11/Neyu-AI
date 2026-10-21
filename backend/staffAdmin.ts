// Staff (Phase 4): two kinds of people sign in to the console.
//
//   Super admin → everything. Only a super admin can add, change or suspend staff.
//   Admin       → only the features a super admin ticks for that person (backend/features.ts).
//
// The super admin can type a simple password for a new person (8+ characters) or let the
// console make a strong one, and decide per person whether a 2-step code is also required.
//
// Safety rules
//  • Only super admins manage staff; nobody can change their own type, features or status.
//  • The .env super admin (SUPER_ADMIN_USERNAME) is managed in the server settings only.
//  • The last active super admin can't be suspended or turned into an admin (no lock-out).
//  • Passwords are never stored in plain text and never emailed; a generated one is shown once.

import { randomBytes } from "crypto";
import { prisma } from "@backend/db";
import { HttpError, hashPassword, verifyPassword } from "@backend/patientAuth";
import { adminLog } from "@backend/adminAudit";
import { endAllStaffSessions, isEnvSuperAdmin, normalizeStaffEmail } from "@backend/staffAuth";
import { FEATURES, withNeeds, permsForFeatures, featuresFromPerms, adminRoleKey, type FeatureKey } from "@backend/features";
import type { Admin } from "@backend/adminAuth";

const ORG = "org_neyu";
const SUPER_ROLE = "role_super_admin";

export function strongPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let s = ""; for (const b of randomBytes(20)) s += abc[b % abc.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const WEAK = ["password", "12345678", "123456789", "qwerty12", "neyuhealth", "neyu1234", "admin123", "welcome1", "11111111", "abcd1234"];

/** Staff password rule: 8+ characters, not an obvious one. */
export function staffPasswordProblem(pw: string, username = ""): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 200) return "Password is too long.";
  const low = pw.toLowerCase();
  if (WEAK.some((w) => low === w || low.startsWith(w))) return "That password is too easy to guess.";
  if (/^(.)\1+$/.test(pw)) return "That password is too easy to guess.";
  if (username && low === username.toLowerCase()) return "The password can't be the same as the username.";
  return null;
}

/** Username or email, lower-case: 3–40 letters, numbers, dot, dash, underscore — or an email. */
export function cleanUsername(v: unknown): string {
  const u = normalizeStaffEmail(v);
  if (/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(u)) return u;
  if (/^[a-z0-9][a-z0-9._-]{2,39}$/.test(u)) return u;
  throw new HttpError(400, "Username: 3–40 letters or numbers (dot, dash and underscore allowed), or an email.");
}

type Kind = "super" | "admin";

function describe(s: { memberships: { status: string; role: { key: string; permissions: { permissionKey: string; scope: string }[] } }[] }) {
  const active = s.memberships.filter((m) => m.status === "active");
  if (active.some((m) => m.role.key === "super_admin")) return { kind: "super" as Kind, features: FEATURES.map((f) => f.key) };
  const perms: Record<string, string> = {};
  for (const m of active) for (const p of m.role.permissions) perms[p.permissionKey] = p.scope;
  return { kind: "admin" as Kind, features: featuresFromPerms(perms) };
}

const staffInclude = { memberships: { include: { role: { include: { permissions: true } } } } } as const;

export async function staffView(admin: Admin) {
  const rows = await prisma.staffUser.findMany({ orderBy: { createdAt: "asc" }, include: staffInclude });
  const now = new Date();
  return {
    me: admin.staff?.id || null,
    features: FEATURES.map((f) => ({ key: f.key, label: f.label, description: f.description, needs: f.needs || [] })),
    staff: rows.map((s) => {
      const d = describe(s);
      return {
        id: s.id, username: s.email, name: s.name, status: s.status, kind: d.kind, features: d.features,
        twoStepRequired: s.mfaRequired, twoStepOn: !!s.mfaEnabledAt, env: isEnvSuperAdmin(s.email),
        locked: !!(s.lockedUntil && s.lockedUntil > now),
        lastLoginAt: s.lastLoginAt?.toISOString() || null, createdAt: s.createdAt.toISOString(),
      };
    }),
  };
}

async function target(id: unknown) {
  const s = await prisma.staffUser.findUnique({ where: { id: cut(id, 40) }, include: staffInclude });
  if (!s) throw new HttpError(404, "Staff member not found.");
  return s;
}
async function activeSuperCount() {
  return prisma.staffUser.count({ where: { status: "active", memberships: { some: { status: "active", role: { key: "super_admin" } } } } });
}
function guard(admin: Admin, s: { id: string; email: string }) {
  if (admin.staff && !admin.staff.isSuper) throw new HttpError(403, "Only a super admin can manage staff.");
  if (admin.staff && s.id === admin.staff.id) throw new HttpError(400, "You can't change your own account here. Use “Change password” in your profile menu.");
  if (isEnvSuperAdmin(s.email)) throw new HttpError(400, "This super admin is set in the server settings (.env). Change it there.");
}

/** Gives a person their type and features (replaces whatever they had). */
async function setAccess(staffId: string, name: string, kind: Kind, features: FeatureKey[]) {
  const roleKey = adminRoleKey(staffId);
  await prisma.$transaction(async (tx) => {
    await tx.membership.deleteMany({ where: { staffId, orgId: ORG } });
    if (kind === "super") {
      await tx.membership.create({ data: { staffId, orgId: ORG, roleId: SUPER_ROLE } });
      await tx.role.deleteMany({ where: { orgId: ORG, key: roleKey } });
      return;
    }
    const role = await tx.role.upsert({
      where: { orgId_key: { orgId: ORG, key: roleKey } },
      update: { name: "Admin", description: name },
      create: { orgId: ORG, key: roleKey, name: "Admin", description: name, isSystem: false },
    });
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = permsForFeatures(features);
    if (rows.length) await tx.rolePermission.createMany({ data: rows.map((r) => ({ roleId: role.id, ...r })) });
    await tx.membership.create({ data: { staffId, orgId: ORG, roleId: role.id } });
  });
}

const featureLabels = (keys: FeatureKey[]) => (keys.length ? keys.map((k) => FEATURES.find((f) => f.key === k)!.label).join(", ") : "no features");
const kindOf = (v: unknown): Kind => (v === "super" ? "super" : "admin");
const featuresOf = (v: unknown) => withNeeds(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function runStaffAction(b: any, admin: Admin, ip: string) {
  const log = (action: string, s: { id: string; email: string }, extra: { before?: string; after?: string } = {}) =>
    adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Account", action, resource: "Staff account", subjectType: "staff", subjectId: s.id, subject: s.email, ...extra });
  const superOnly = () => { if (admin.staff && !admin.staff.isSuper) throw new HttpError(403, "Only a super admin can manage staff."); };

  switch (b.action) {
    case "staff.create": {
      superOnly();
      const username = cleanUsername(b.username);
      const name = cut(b.name, 80);
      if (name.length < 2) throw new HttpError(400, "Enter their full name.");
      if (isEnvSuperAdmin(username)) throw new HttpError(409, "That username is reserved for the server's super admin.");
      if (await prisma.staffUser.findUnique({ where: { email: username } })) throw new HttpError(409, "Someone already uses that username.");
      const typed = typeof b.password === "string" && b.password.length > 0;
      const password = typed ? b.password : strongPassword();
      const problem = staffPasswordProblem(password, username);
      if (problem) throw new HttpError(400, problem);
      const kind = kindOf(b.kind), features = kind === "super" ? [] : featuresOf(b.features);
      if (kind === "admin" && !features.length) throw new HttpError(400, "Tick at least one feature for this admin.");
      const s = await prisma.staffUser.create({ data: { email: username, name, passwordHash: await hashPassword(password), status: "active", mfaRequired: b.twoStep === true } });
      await setAccess(s.id, name, kind, features);
      await log(kind === "super" ? "Added super admin" : "Added admin", s, { after: kind === "super" ? "Super admin" : featureLabels(features) });
      return { ok: true, id: s.id, username, kind, features, ...(typed ? {} : { password }) };
    }
    case "staff.update": {
      const s = await target(b.staffId); guard(admin, s);
      const before = describe(s);
      const kind = b.kind === undefined ? before.kind : kindOf(b.kind);
      const features = kind === "super" ? [] : b.features === undefined ? before.features : featuresOf(b.features);
      if (kind === "admin" && !features.length) throw new HttpError(400, "Tick at least one feature, or suspend the account instead.");
      if (before.kind === "super" && kind === "admin" && (await activeSuperCount()) <= 1) throw new HttpError(400, "This is the last super admin. Make someone else super admin first.");
      const name = b.name === undefined ? s.name : cut(b.name, 80);
      if (name.length < 2) throw new HttpError(400, "Enter their full name.");
      const data: Record<string, unknown> = {};
      if (name !== s.name) data.name = name;
      if (typeof b.twoStep === "boolean" && b.twoStep !== s.mfaRequired) data.mfaRequired = b.twoStep;
      if (Object.keys(data).length) await prisma.staffUser.update({ where: { id: s.id }, data });
      await setAccess(s.id, name, kind, features);
      // Their next click uses the new access; when 2-step becomes required they sign in again.
      if (data.mfaRequired === true) await endAllStaffSessions(s.id);
      const show = (k: Kind, f: FeatureKey[]) => (k === "super" ? "Super admin" : "Admin · " + featureLabels(f));
      await log("Changed access", s, { before: show(before.kind, before.features) + (typeof b.twoStep === "boolean" ? ` · 2-step ${s.mfaRequired ? "on" : "off"}` : ""), after: show(kind, features) + (typeof b.twoStep === "boolean" ? ` · 2-step ${b.twoStep ? "on" : "off"}` : "") });
      return { ok: true };
    }
    case "staff.setPassword": case "staff.resetPassword": {
      const s = await target(b.staffId); guard(admin, s);
      const typed = typeof b.password === "string" && b.password.length > 0;
      const password = typed ? b.password : strongPassword();
      const problem = staffPasswordProblem(password, s.email);
      if (problem) throw new HttpError(400, problem);
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
      await endAllStaffSessions(s.id);
      await log("Set a new password", s);
      return { ok: true, username: s.email, ...(typed ? {} : { password }) };
    }
    case "staff.suspend": case "staff.activate": {
      const s = await target(b.staffId); guard(admin, s);
      const on = b.action === "staff.activate";
      if (!on && describe(s).kind === "super" && (await activeSuperCount()) <= 1) throw new HttpError(400, "This is the last super admin.");
      await prisma.staffUser.update({ where: { id: s.id }, data: { status: on ? "active" : "suspended", ...(on ? { failedLogins: 0, lockedUntil: null } : {}) } });
      if (!on) await endAllStaffSessions(s.id);
      await log(on ? "Re-activated staff account" : "Suspended staff account", s, { before: s.status, after: on ? "active" : "suspended" });
      return { ok: true, undo: { action: on ? "staff.suspend" : "staff.activate", staffId: s.id } };
    }
    case "staff.reset2step": {
      const s = await target(b.staffId); guard(admin, s);
      await prisma.staffUser.update({ where: { id: s.id }, data: { mfaSecretEnc: null, mfaEnabledAt: null } });
      await endAllStaffSessions(s.id);
      await log("Reset 2-step code", s);
      return { ok: true };
    }
    case "me.password": {
      if (!admin.staff) throw new HttpError(400, "The shared admin password is changed in the server settings.");
      const s = await prisma.staffUser.findUnique({ where: { id: admin.staff.id } });
      if (!s) throw new HttpError(404, "Account not found.");
      if (isEnvSuperAdmin(s.email)) throw new HttpError(400, "Your password is set in the server settings (SUPER_ADMIN_PASSWORD in .env).");
      if (!(await verifyPassword(cut(b.current, 200), s.passwordHash))) throw new HttpError(401, "Your current password isn't right.");
      const next = typeof b.next === "string" ? b.next : "";
      const problem = staffPasswordProblem(next, s.email);
      if (problem) throw new HttpError(400, problem);
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(next) } });
      await prisma.staffSession.deleteMany({ where: { staffId: s.id, id: { not: admin.staff.sessionId } } }); // other devices out
      await log("Changed own password", s);
      return { ok: true };
    }
  }
  return null;
}
