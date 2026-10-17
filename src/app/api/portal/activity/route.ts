// POST /api/portal/activity — { events: [{ kind: "view"|"click", target, ms }] }
// Screens viewed (with time spent) and buttons used, so Neyu understands what
// the patient cares about. Only stored while "Neyu learns from my use" is on.
import { prisma } from "@backend/db";
import { rateLimit } from "@backend/rateLimit";
import { withPatientMutation, readJson, str } from "@backend/apiHelpers";

export const POST = (req: Request) => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`act:${patient.id}`, 30, 60_000))) return { ok: true };
  const s = await prisma.patientSettings.findUnique({ where: { patientId: patient.id }, select: { learnUsage: true } });
  if (s && !s.learnUsage) return { ok: true, stored: 0 };
  const b = await readJson(req, 32_000);
  const rows = (Array.isArray(b.events) ? b.events.slice(0, 60) : [])
    .map((e: any) => ({ patientId: patient.id, kind: e?.kind === "click" ? "click" : "view", target: str(e?.target, 80), ms: Math.max(0, Math.min(3_600_000, Math.round(Number(e?.ms) || 0))) }))
    .filter((e: { target: string }) => e.target);
  if (rows.length) await prisma.activityEvent.createMany({ data: rows });
  // Keep 90 days only.
  if (Math.random() < 0.05) prisma.activityEvent.deleteMany({ where: { patientId: patient.id, at: { lt: new Date(Date.now() - 90 * 864e5) } } }).catch(() => {});
  return { ok: true, stored: rows.length };
});
