// GET   /api/portal/settings — data-sharing consents + notification preferences
// PATCH /api/portal/settings — { key: boolean } for any of the fields below
import { prisma } from "@backend/db";
import { getSettings } from "@backend/patientData";
import { audit } from "@backend/audit";
import { withPatient, withPatientMutation, readJson, HttpError } from "@backend/apiHelpers";

const KEYS = ["shareWearables", "shareLabs", "shareRecords", "albaAccess", "learnUsage", "aiInsights", "notifDaily", "notifWorth", "notifProtocol", "notifAppt"] as const;

export const GET = () => withPatient(async ({ patient }) => getSettings(patient.id));

export const PATCH = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const b = await readJson(req);
  const data: Record<string, boolean> = {};
  KEYS.forEach((k) => { if (typeof b[k] === "boolean") data[k] = b[k]; });
  if (!Object.keys(data).length) throw new HttpError(400, "Nothing to update.");
  const before = await prisma.patientSettings.findUnique({ where: { patientId: patient.id }, select: { albaAccess: true } });
  await prisma.patientSettings.upsert({ where: { patientId: patient.id }, create: { patientId: patient.id, ...data }, update: data });
  // Neyu AI access is a consent: every change is recorded with the policy version.
  if (typeof data.albaAccess === "boolean" && data.albaAccess !== before?.albaAccess) {
    const { setAiConsent } = await import("@backend/privacy");
    await setAiConsent(patient.id, data.albaAccess, { ip, userAgent: req.headers.get("user-agent") || undefined });
  }
  audit(patient.id, "patient", "update", `settings:${Object.keys(data).join(",")}`, ip);
  return getSettings(patient.id);
});
