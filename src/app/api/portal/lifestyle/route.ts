// GET    /api/portal/lifestyle — today + last 7 days + sleep coaching
// POST   /api/portal/lifestyle — { kind: water|caffeine|alcohol|mood|stress|meal, value?, note? }
//        water/caffeine/alcohol: value = +1 or -1 (undo); mood/stress: 1–5; meal: note text
// DELETE /api/portal/lifestyle?id= — remove a meal
import { prisma } from "@backend/db";
import { getLifestyle } from "@backend/universe";
import { LIFESTYLE_KINDS, evaluateRewards } from "@backend/health";
import { dayKey } from "@/lib/portal/metrics";
import { audit } from "@backend/audit";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

export const GET = () => withPatient(async ({ patient }) => getLifestyle(patient));

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`life:${patient.id}`, 120, 60_000))) throw new HttpError(429, "Slow down a little.");
  const b = await readJson(req);
  const kind = str(b.kind, 12) as (typeof LIFESTYLE_KINDS)[number];
  if (!LIFESTYLE_KINDS.includes(kind)) throw new HttpError(400, "Unknown check-in.");
  const day = dayKey(new Date(), patient.timezone);
  if (kind === "water" || kind === "caffeine" || kind === "alcohol") {
    const v = Number(b.value ?? 1);
    if (v === -1) {
      const last = await prisma.lifestyleLog.findFirst({ where: { patientId: patient.id, day, kind }, orderBy: { at: "desc" }, select: { id: true } });
      if (last) await prisma.lifestyleLog.delete({ where: { id: last.id } });
    } else if (v === 1) {
      const n = await prisma.lifestyleLog.count({ where: { patientId: patient.id, day, kind } });
      if (n >= 30) throw new HttpError(400, "That's a lot for one day — please check.");
      await prisma.lifestyleLog.create({ data: { patientId: patient.id, kind, value: 1, day } });
    } else throw new HttpError(400, "Value must be 1 or -1.");
  } else if (kind === "mood" || kind === "stress") {
    const v = Number(b.value);
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new HttpError(400, "Choose 1 to 5.");
    await prisma.lifestyleLog.create({ data: { patientId: patient.id, kind, value: v, day } });
  } else {
    const note = str(b.note, 300);
    if (note.length < 2) throw new HttpError(400, "Describe what you ate.");
    await prisma.lifestyleLog.create({ data: { patientId: patient.id, kind: "meal", value: 1, note, day } });
  }
  await evaluateRewards(patient).catch(() => 0);
  audit(patient.id, "patient", "create", `lifestyle:${kind}`, ip);
  return getLifestyle(patient);
});

export const DELETE = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const id = (new URL(req.url).searchParams.get("id") || "").slice(0, 40);
  const r = await prisma.lifestyleLog.deleteMany({ where: { id, patientId: patient.id } });
  if (!r.count) throw new HttpError(404, "Not found.");
  audit(patient.id, "patient", "delete", "lifestyle", ip);
  return getLifestyle(patient);
});
