// GET    /api/portal/push                      — can this server send to phones; this patient's phones
// POST   /api/portal/push { token, platform }  — the NEYU app registers this phone for notifications
// DELETE /api/portal/push { token }            — this phone stops getting notifications (sign-out / switch off)
// A token belongs to one phone. If someone else signs in on that phone, it moves to them.
import { prisma } from "@backend/db";
import { pushConfigured } from "@backend/push";
import { audit } from "@backend/audit";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

const TOKEN = /^[A-Za-z0-9_:\-.]{20,400}$/;

export const GET = () => withPatient(async ({ patient }) => {
  const phones = await prisma.pushDevice.findMany({ where: { patientId: patient.id }, select: { platform: true, createdAt: true, lastSentAt: true }, orderBy: { createdAt: "desc" } });
  return { configured: pushConfigured(), phones: phones.map((p) => ({ platform: p.platform, since: p.createdAt.toISOString(), lastSentAt: p.lastSentAt?.toISOString() ?? null })) };
});

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const b = await readJson(req);
  const token = str(b.token, 400), platform = str(b.platform, 10), appVersion = str(b.appVersion, 20) || null;
  if (!TOKEN.test(token)) throw new HttpError(400, "That isn't a valid phone token.");
  if (platform !== "ios" && platform !== "android") throw new HttpError(400, "platform must be ios or android.");
  const before = await prisma.pushDevice.findUnique({ where: { token }, select: { patientId: true } });
  await prisma.pushDevice.upsert({
    where: { token },
    create: { patientId: patient.id, platform, token, appVersion },
    update: { patientId: patient.id, platform, appVersion, lastSeenAt: new Date(), lastError: null },
  });
  if (!before || before.patientId !== patient.id) audit(patient.id, "patient", "create", `push-device:${platform}`, ip);
  return { ok: true, configured: pushConfigured() };
});

export const DELETE = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const token = str((await readJson(req)).token, 400);
  const r = await prisma.pushDevice.deleteMany({ where: { token, patientId: patient.id } });
  if (r.count) audit(patient.id, "patient", "delete", "push-device", ip);
  return { ok: true, removed: r.count };
});
