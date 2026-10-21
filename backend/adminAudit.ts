// Staff audit trail for the admin console (Alberta HIA). Append-only: there
// is no update or delete path anywhere in the code. Every event is written to
// AdminAuditEvent (the console's audit screen) and to AuditEvent (the
// platform-wide log, Phase 3). Events about a patient are also mirrored into
// that patient's AccessLog as actor "admin".

import { prisma } from "@backend/db";
import { audit, type AuditAction } from "@backend/audit";

export type AdminEventKind = "View" | "Reveal" | "Change" | "Export" | "Account";

export interface AdminEvent {
  actor: string;
  kind: AdminEventKind;
  action: string; // "Added lab result"
  resource: string; // "Lab · LDL cholesterol"
  subjectType?: "patient" | "visitor" | "referral" | "request" | "staff";
  subjectId?: string | null;
  subject?: string | null; // display label
  reason?: string;
  before?: string;
  after?: string;
  ip?: string;
  result?: "Success" | "Denied";
  role?: string; // e.g. "Super admin" — from the staff account; old shared password = "Admin (shared)"
  staffId?: string | null;
}

const cut = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

const MIRROR: Record<AdminEventKind, AuditAction> = { View: "read", Reveal: "read", Change: "update", Export: "export", Account: "update" };
const VERB: Record<AdminEventKind, string> = { View: "view", Reveal: "view", Change: "update", Export: "export", Account: "account" };

function auditVerb(e: AdminEvent) {
  if (e.kind !== "Account") return VERB[e.kind];
  const a = e.action.toLowerCase();
  return a.includes("signed out") ? "logout" : a.includes("sign-in") || a.includes("signed in") || a.includes("code") ? "login" : "account";
}

export async function adminLog(e: AdminEvent) {
  try {
    await prisma.adminAuditEvent.create({
      data: {
        actor: cut(e.actor, 80) || "admin",
        role: cut(e.role, 80) || (e.result === "Denied" && e.actor === "unknown" ? "—" : "Admin (shared)"),
        kind: e.kind,
        action: cut(e.action, 120)!,
        resource: cut(e.resource, 200)!,
        subjectType: e.subjectType ?? null,
        subjectId: cut(e.subjectId, 60),
        subject: cut(e.subject, 120),
        reason: cut(e.reason, 300),
        before: cut(e.before, 300),
        after: cut(e.after, 300),
        ip: cut(e.ip, 60),
        result: e.result || "Success",
      },
    });
    await prisma.auditEvent.create({
      data: {
        actorType: e.staffId ? "staff" : "admin_shared",
        actorId: e.staffId || null,
        actorLabel: cut(e.actor, 120),
        action: auditVerb(e),
        resource: cut(e.resource, 200)!,
        subjectPatientId: e.subjectType === "patient" ? cut(e.subjectId, 60) : null,
        subjectId: cut(e.subjectId, 60),
        reason: cut(e.reason, 300),
        result: e.result === "Denied" ? "denied" : "success",
        ip: cut(e.ip, 60),
        meta: { kind: e.kind, action: e.action, subjectType: e.subjectType ?? null, subject: cut(e.subject, 120), role: e.role ?? null },
      },
    });
    if (e.subjectType === "patient" && e.subjectId) await audit(e.subjectId, "admin", MIRROR[e.kind], `${e.action}: ${e.resource}`, e.ip);
  } catch (err: any) {
    // An audit failure must be visible in the server log, never silent.
    console.error("Admin audit write failed:", err?.message);
  }
}
