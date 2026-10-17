// Who may see and do what in the admin console (Phase 3 · roles & permissions).
//
// Every console screen (view) and every button (action) maps to a permission.
// A staff member's permissions come from their role(s) (Membership → Role → RolePermission).
//
// Scope of a permission:
//   full    → allowed
//   reason  → "break-glass": allowed after the staff member writes a reason. The reason is
//             saved in the audit log and the access stays open for 60 minutes for that
//             patient (or that area), then the console asks again.
//   own     → allowed (only their own items — used later for physicians' own patients)
//
// The old shared password (before the first super admin turned on 2-step) has every permission.

import { prisma } from "@backend/db";
import { kv } from "@backend/kv";
import { HttpError } from "@backend/patientAuth";
import { adminLog } from "@backend/adminAudit";
import type { Admin } from "@backend/adminAuth";
import type { Scope } from "@backend/staffAuth";

export const GRANT_MINUTES = 60;
const RANK: Record<Scope, number> = { own: 1, reason: 2, full: 3 };

/** 403 that tells the console to ask for a reason, then retry. */
export class ReasonRequired extends HttpError {
  code = "reason_required";
  constructor(public target: string, public label: string) {
    super(403, "Give a reason to open this. It is saved in the audit log.");
  }
}

// ── Screens ────────────────────────────────────────────────────────────────
// Any one of the listed permissions opens the screen. null = every signed-in staff member.
export const VIEW_PERMS: Record<string, string[] | null> = {
  boot: null,
  settings: null,
  overview: ["patients.list", "requests.manage", "referrals.manage", "analytics.read"],
  inbox: ["requests.manage", "referrals.manage", "appointments.manage", "patients.list"],
  analytics: ["analytics.read"],
  patients: ["patients.list"],
  patient: ["patients.record.read"],
  visitors: ["patients.list"],
  visitor: ["patients.list"],
  search: ["patients.list", "referrals.manage"],
  referrals: ["referrals.manage"],
  referral: ["referrals.manage"],
  "unlinked-referrals": ["referrals.manage"],
  requests: ["requests.manage"],
  ai: ["ai.logs.read"],
  "ai-item": ["ai.logs.read"],
  audit: ["audit.read"],
  "audit-item": ["audit.read"],
  "audit-platform": ["audit.read"],
  "audit-stats": ["audit.read"],
  staff: ["staff.invite", "staff.roles.manage"],
  privacy: ["privacy.deletion.manage", "privacy.export.manage"],
};

// ── Buttons ────────────────────────────────────────────────────────────────
export const ACTION_PERMS: Record<string, string[] | null> = {
  "session.unlock": null,
  "access.grant": null,
  "me.password": null,
  reveal: ["patients.record.read"],
  "ai.review": ["ai.logs.read"], "ai.unreview": ["ai.logs.read"],
  "queue.complete": ["requests.manage", "referrals.manage", "appointments.manage"],
  "queue.reopen": ["requests.manage", "referrals.manage", "appointments.manage"],
  "request.status": ["requests.manage"],
  "referral.status": ["referrals.manage"], "referral.link": ["referrals.manage"], "referral.note": ["referrals.manage"],
  "lab.add": ["patients.record.update"], "lab.remove": ["patients.record.update"],
  "protocol.save": ["patients.record.update"], "protocol.pause": ["patients.record.update"], "protocol.end": ["patients.record.update"],
  "care.add": ["patients.record.update"], "care.remove": ["patients.record.update"],
  "reading.add": ["patients.record.update"],
  "appt.save": ["appointments.manage"], "appt.complete": ["appointments.manage"], "appt.cancel": ["appointments.manage"],
  "account.unlock": ["requests.manage", "patients.record.update"],
  "account.resend": ["requests.manage", "patients.record.update"],
  "session.revoke": ["patients.record.update"],
  "account.deactivate": ["patients.record.update"],
  "account.delete": ["privacy.deletion.manage"],
  "export.patient": ["privacy.export.manage"],
  "export.patients": ["exports.create"],
  "export.system": ["exports.create"],
  "export.audit": ["audit.read"],
  "staff.invite": ["staff.invite"],
  "staff.role": ["staff.roles.manage", "staff.invite"],
  "staff.suspend": ["staff.invite"], "staff.activate": ["staff.invite"],
  "staff.reset2step": ["staff.invite"], "staff.resetPassword": ["staff.invite"],
  "privacy.deletion.cancel": ["privacy.deletion.manage"],
  "privacy.deletion.now": ["privacy.deletion.manage"],
};

// The console screen each permission unlocks (for the menu).
export const NAV_PERMS: Record<string, string[] | null> = {
  overview: VIEW_PERMS.overview, inbox: VIEW_PERMS.inbox, patients: VIEW_PERMS.patients, visitors: VIEW_PERMS.visitors,
  referrals: VIEW_PERMS.referrals, requests: VIEW_PERMS.requests, ai: VIEW_PERMS.ai, analytics: VIEW_PERMS.analytics,
  audit: VIEW_PERMS.audit, settings: null,
};

const grantKey = (staffId: string, target: string) => `grant:${staffId}:${target}`;
const label = (perm: string) => perm.replace(/\./g, " ");

function bestScope(admin: Admin, perms: string[]): Scope | null {
  let best: Scope | null = null;
  for (const p of perms) {
    const sc = admin.staff!.perms[p];
    if (sc && (!best || RANK[sc] > RANK[best])) best = sc;
  }
  return best;
}

/**
 * Throws 403 unless allowed. `patientId` makes a break-glass reason apply to that one
 * patient; without it the reason opens the whole area (e.g. the patient list).
 */
export async function assertAccess(admin: Admin, perms: string[] | null | undefined, patientId?: string | null) {
  if (perms === undefined) throw new HttpError(400, "Unknown request.");
  if (!admin.staff || perms === null) return;
  const sc = bestScope(admin, perms);
  if (!sc) throw new HttpError(403, `Your role (${admin.role}) can't open this. Ask a super admin if you need it.`);
  if (sc !== "reason") return;
  const target = patientId ? `patient:${patientId}` : `area:${perms[0]}`;
  if (await kv.get(grantKey(admin.staff.id, target))) return;
  throw new ReasonRequired(target, patientId ? "this patient's record" : label(perms[0]));
}

/** Records a break-glass reason and opens access for GRANT_MINUTES. */
export async function grantAccess(admin: Admin, target: string, reason: string, ip: string) {
  if (!admin.staff) return;
  if (!/^(patient:[\w-]{1,60}|area:[a-z.]{1,40})$/.test(target)) throw new HttpError(400, "Unknown record.");
  const why = reason.trim().slice(0, 300);
  if (why.length < 5) throw new HttpError(400, "Write a short reason (at least 5 characters).");
  let subject: string | null = null, subjectId: string | null = null;
  if (target.startsWith("patient:")) {
    subjectId = target.slice(8);
    const p = await prisma.patient.findUnique({ where: { id: subjectId }, select: { firstName: true, lastName: true } });
    if (!p) throw new HttpError(404, "Patient not found.");
    subject = `${p.firstName} ${p.lastName}`.trim();
  }
  await kv.set(grantKey(admin.staff.id, target), why, GRANT_MINUTES * 60);
  await adminLog({
    actor: admin.actor, staffId: admin.staff.id, role: admin.role, ip, kind: "Reveal",
    action: `Break-glass access (${GRANT_MINUTES} min)`, resource: subjectId ? "Patient record" : "Area · " + label(target.slice(5)),
    subjectType: subjectId ? "patient" : undefined, subjectId, subject, reason: why,
  });
}

/** Patient an action touches (for break-glass per patient). */
export async function patientOfAction(b: any): Promise<string | null> {
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 60) : "");
  if (b?.patientId) return s(b.patientId);
  if (b?.labId) return (await prisma.labResult.findUnique({ where: { id: s(b.labId) }, select: { patientId: true } }))?.patientId || null;
  if (b?.itemId) return (await prisma.protocolItem.findUnique({ where: { id: s(b.itemId) }, select: { patientId: true } }))?.patientId || null;
  if (b?.apptId) return (await prisma.appointment.findUnique({ where: { id: s(b.apptId) }, select: { patientId: true } }))?.patientId || null;
  if (b?.careId) return (await prisma.careTeamMember.findUnique({ where: { id: s(b.careId) }, select: { patientId: true } }))?.patientId || null;
  return null;
}

/** Permissions summary sent to the console (null = everything, old shared password). */
export function permsFor(admin: Admin): { perms: Record<string, Scope> | null; roles: string[]; nav: string[] } {
  const nav = Object.entries(NAV_PERMS).filter(([, p]) => !admin.staff || p === null || p.some((k) => admin.staff!.perms[k])).map(([k]) => k);
  return { perms: admin.staff ? admin.staff.perms : null, roles: admin.staff ? admin.staff.roles.map((r) => r.key) : ["shared"], nav };
}
