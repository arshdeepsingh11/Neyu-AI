// GET /api/v1/patients/{id} — one patient's summary. Needs patients.record.read;
// roles with "reason" scope must first POST /api/v1/access-grants (break-glass).
import { prisma } from "@backend/db";
import { HttpError } from "@backend/patientAuth";
import { v1 } from "@backend/apiv1";
import { adminLog } from "@backend/adminAudit";

export const GET = v1({ perms: ["patients.record.read"], patientParam: "id" }, async ({ admin, ip, params }) => {
  const id = String(params.id || "").slice(0, 60);
  const p = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true, orgId: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, timezone: true, createdAt: true, lastLoginAt: true, accountStatus: true, emailVerifiedAt: true,
      _count: { select: { labResults: true, readings: true, documents: true, appointments: true, protocolItems: true } },
      appointments: { where: { status: "scheduled", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true, clinician: true, title: true } },
    },
  });
  if (!p || (admin.staff && p.orgId !== admin.staff.orgId)) throw new HttpError(404, "Patient not found.");
  await adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "View", action: "API · opened patient summary", resource: "Patient record", subjectType: "patient", subjectId: p.id, subject: `${p.firstName} ${p.lastName}` });
  const next = p.appointments[0];
  return {
    id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), email: p.email, phone: p.phone, dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10) || null,
    timezone: p.timezone, status: p.accountStatus, verified: !!p.emailVerifiedAt, createdAt: p.createdAt.toISOString(), lastLoginAt: p.lastLoginAt?.toISOString() || null,
    counts: p._count, nextAppointment: next ? { at: next.startsAt.toISOString(), clinician: next.clinician, title: next.title } : null,
  };
});
