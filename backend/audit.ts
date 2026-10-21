// Audit trail for patient data (Alberta HIA): who touched which record,
// when, from where. Fire-and-forget — an audit write must never break the
// request, but failures are reported to the server log.

import { prisma } from "@backend/db";

export type AuditActor = "patient" | "admin" | "device" | "caregiver" | "share";
export type AuditAction = "read" | "create" | "update" | "delete" | "login" | "logout" | "export";

export function audit(patientId: string, actor: AuditActor, action: AuditAction, resource: string, ip?: string): Promise<void> {
  // Fire-and-forget for callers that don't wait; the returned promise lets others wait.
  return prisma.accessLog
    .create({ data: { patientId, actor, action, resource: resource.slice(0, 200), ip } })
    .then(() => undefined)
    .catch((e) => console.error("Audit log write failed:", e?.message));
}
