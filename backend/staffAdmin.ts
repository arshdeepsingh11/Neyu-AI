// Staff & Roles screen: list staff, invite, change role, suspend/activate,
// reset password or 2-step code, change my own password.
//
// Safety rules
//  • Nobody can give a role with more power than they have (no privilege escalation).
//    Only a super admin can make another super admin.
//  • You can't suspend yourself or change your own role.
//  • The last active super admin can't be suspended or demoted (no lock-out).
//  • New passwords are shown ONCE to the person who created them, never emailed, never stored in plain text.

import { randomBytes } from "crypto";
import { prisma } from "@backend/db";
import { HttpError, hashPassword, verifyPassword } from "@backend/patientAuth";
import { passwordProblem } from "@/lib/portal/password";
import { adminLog } from "@backend/adminAudit";
import { endAllStaffSessions } from "@backend/staffAuth";
import type { Admin } from "@backend/adminAuth";

const ORG = "org_neyu";

export function strongPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let s = ""; for (const b of randomBytes(20)) s += abc[b % abc.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const isEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);

async function systemRoles() {
  return prisma.role.findMany({ where: { orgId: null }, include: { permissions: true }, orderBy: { createdAt: "asc" } });
}

/** Role keys this admin may hand out: roles whose permissions they fully have themselves. */
async function assignable(admin: Admin) {
  const roles = await systemRoles();
  if (!admin.staff || admin.staff.isSuper) return roles.map((r) => r.key);
  const mine = admin.staff.perms;
  return roles.filter((r) => r.key !== "super_admin" && r.permissions.every((p) => mine[p.permissionKey])).map((r) => r.key);
}

export async function staffView(admin: Admin) {
  const [rows, roles, perms, can] = await Promise.all([
    prisma.staffUser.findMany({ orderBy: { createdAt: "asc" }, include: { memberships: { include: { role: true } } } }),
    systemRoles(),
    prisma.permission.findMany({ orderBy: [{ area: "asc" }, { key: "asc" }] }),
    assignable(admin),
  ]);
  const now = new Date();
  return {
    me: admin.staff?.id || null,
    assignable: can,
    staff: rows.map((s) => {
      const active = s.memberships.filter((m) => m.status === "active");
      return {
        id: s.id, email: s.email, name: s.name, status: s.status,
        twoStep: !!s.mfaEnabledAt, locked: !!(s.lockedUntil && s.lockedUntil > now),
        lastLoginAt: s.lastLoginAt?.toISOString() || null, createdAt: s.createdAt.toISOString(),
        roles: active.map((m) => ({ key: m.role.key, name: m.role.name })),
      };
    }),
    roles: roles.map((r) => ({ key: r.key, name: r.name, description: r.description || "", perms: Object.fromEntries(r.permissions.map((p) => [p.permissionKey, p.scope])) })),
    permissions: perms.map((p) => ({ key: p.key, area: p.area, description: p.description })),
  };
}

async function target(id: unknown) {
  const s = await prisma.staffUser.findUnique({ where: { id: cut(id, 40) }, include: { memberships: { include: { role: true } } } });
  if (!s) throw new HttpError(404, "Staff member not found.");
  return s;
}
const isSuperUser = (s: { memberships: { status: string; role: { key: string } }[] }) => s.memberships.some((m) => m.status === "active" && m.role.key === "super_admin");
async function activeSuperCount() {
  return prisma.staffUser.count({ where: { status: "active", memberships: { some: { status: "active", role: { key: "super_admin" } } } } });
}
function guardOthers(admin: Admin, s: { id: string; memberships: { status: string; role: { key: string } }[] }) {
  if (admin.staff && s.id === admin.staff.id) throw new HttpError(400, "You can't do this to your own account.");
  if (isSuperUser(s) && admin.staff && !admin.staff.isSuper) throw new HttpError(403, "Only a super admin can change another super admin.");
}

export async function runStaffAction(b: any, admin: Admin, ip: string) {
  const log = (action: string, s: { id: string; email: string }, extra: { before?: string; after?: string } = {}) =>
    adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Account", action, resource: "Staff account", subjectType: "staff", subjectId: s.id, subject: s.email, ...extra });

  switch (b.action) {
    case "staff.invite": {
      const email = cut(b.email, 254).toLowerCase(), name = cut(b.name, 80), roleKey = cut(b.role, 40);
      if (!isEmail(email)) throw new HttpError(400, "Enter a valid work email.");
      if (!name) throw new HttpError(400, "Enter their full name.");
      if (!(await assignable(admin)).includes(roleKey)) throw new HttpError(403, "You can't give that role.");
      if (await prisma.staffUser.findUnique({ where: { email } })) throw new HttpError(409, "A staff account with that email already exists.");
      const role = (await prisma.role.findFirst({ where: { key: roleKey, orgId: null } }))!;
      const pw = strongPassword();
      const s = await prisma.staffUser.create({ data: { email, name, passwordHash: await hashPassword(pw), status: "active", memberships: { create: { orgId: ORG, roleId: role.id } } } });
      await log("Invited staff member", s, { after: role.name });
      return { ok: true, password: pw, email, role: role.name };
    }
    case "staff.role": {
      const s = await target(b.staffId); guardOthers(admin, s);
      const roleKey = cut(b.role, 40);
      if (!(await assignable(admin)).includes(roleKey)) throw new HttpError(403, "You can't give that role.");
      if (isSuperUser(s) && roleKey !== "super_admin" && (await activeSuperCount()) <= 1) throw new HttpError(400, "This is the last super admin. Make someone else super admin first.");
      const role = (await prisma.role.findFirst({ where: { key: roleKey, orgId: null } }))!;
      const before = s.memberships.filter((m) => m.status === "active").map((m) => m.role.name).join(", ") || "—";
      await prisma.$transaction([
        prisma.membership.deleteMany({ where: { staffId: s.id, orgId: ORG } }),
        prisma.membership.create({ data: { staffId: s.id, orgId: ORG, roleId: role.id } }),
      ]);
      await log("Changed role", s, { before, after: role.name });
      return { ok: true };
    }
    case "staff.suspend": case "staff.activate": {
      const s = await target(b.staffId); guardOthers(admin, s);
      const on = b.action === "staff.activate";
      if (!on && isSuperUser(s) && (await activeSuperCount()) <= 1) throw new HttpError(400, "This is the last super admin.");
      await prisma.staffUser.update({ where: { id: s.id }, data: { status: on ? "active" : "suspended", ...(on ? { failedLogins: 0, lockedUntil: null } : {}) } });
      if (!on) await endAllStaffSessions(s.id);
      await log(on ? "Re-activated staff account" : "Suspended staff account", s, { before: s.status, after: on ? "active" : "suspended" });
      return { ok: true, undo: { action: on ? "staff.suspend" : "staff.activate", staffId: s.id } };
    }
    case "staff.reset2step": {
      const s = await target(b.staffId); guardOthers(admin, s);
      await prisma.staffUser.update({ where: { id: s.id }, data: { mfaSecretEnc: null, mfaEnabledAt: null } });
      await endAllStaffSessions(s.id);
      await log("Reset 2-step code", s);
      return { ok: true };
    }
    case "staff.resetPassword": {
      const s = await target(b.staffId); guardOthers(admin, s);
      const pw = strongPassword();
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } });
      await endAllStaffSessions(s.id);
      await log("Reset password", s);
      return { ok: true, password: pw, email: s.email };
    }
    case "me.password": {
      if (!admin.staff) throw new HttpError(400, "The shared admin password is changed in the server settings.");
      const s = await prisma.staffUser.findUnique({ where: { id: admin.staff.id } });
      if (!s || !(await verifyPassword(cut(b.current, 200), s.passwordHash))) throw new HttpError(401, "Your current password isn't right.");
      const next = typeof b.next === "string" ? b.next : "";
      if (next.length < 12) throw new HttpError(400, "Use at least 12 characters.");
      const problem = passwordProblem(next, s.email);
      if (problem) throw new HttpError(400, problem);
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(next) } });
      // Sign out every other device, keep this one.
      await prisma.staffSession.deleteMany({ where: { staffId: s.id, id: { not: admin.staff.sessionId } } });
      await log("Changed own password", s);
      return { ok: true };
    }
  }
  return null;
}
