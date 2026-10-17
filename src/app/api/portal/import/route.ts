// POST /api/portal/import — readings from a file the patient chose
// (Apple Health export.xml or a CSV, parsed in the browser into daily values).
// Body: { readings: [{ metric, value, date }], bp: [{ sys, dia, pulse?, takenAt }] }
import { parseIngest } from "@backend/wearables";
import { storeReadings, storeBp, validBp, type BpIn } from "@backend/health";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatientMutation, readJson, HttpError } from "@backend/apiHelpers";

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`import:${patient.id}`, 30, 60_000))) throw new HttpError(429, "Too many uploads at once. Please wait a minute.");
  const b = await readJson(req, 3_000_000);
  const { readings, rejected } = parseIngest({ readings: Array.isArray(b.readings) ? b.readings.slice(0, 5000) : [] }, patient.timezone);
  const good = readings.filter((r) => r.metric !== "bp" && r.metric !== "ecg");
  const bp: BpIn[] = [];
  (Array.isArray(b.bp) ? b.bp.slice(0, 3000) : []).forEach((x: any) => {
    const t = new Date(String(x?.takenAt || ""));
    if (!validBp(x ?? {}) && !isNaN(t.getTime()) && t.getTime() <= Date.now() + 300000) bp.push({ sys: Number(x.sys), dia: Number(x.dia), pulse: x.pulse ? Math.round(Number(x.pulse)) || null : null, takenAt: new Date(Math.floor(t.getTime() / 1000) * 1000) });
  });
  if (!good.length && !bp.length) throw new HttpError(400, "We couldn't find any readings in this file.");
  const stored = (await storeReadings(patient.id, "import", good)) + (bp.length ? await storeBp(patient, "import", bp) : 0);
  audit(patient.id, "patient", "create", `import:${stored}`, ip);
  return { ok: true, stored, rejected: rejected.length };
});
