// GET    /api/portal/documents/{id} — one report (Neyu's reading, no bytes)
// PATCH  /api/portal/documents/{id} — confirm / correct { title, kind, provider, date, values, confirm }
// DELETE /api/portal/documents/{id} — remove the report and values it added
import { storage } from "@backend/storage";
import { prisma } from "@backend/db";
import { audit } from "@backend/audit";
import { award } from "@backend/health";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";
import { docDTO, DOC_SELECT, DOC_KINDS, saveLabValues, type DocValue } from "@backend/documents";

const own = async (patientId: string, id: string) => {
  const d = await prisma.healthDocument.findFirst({ where: { id: id.slice(0, 40), patientId }, select: DOC_SELECT });
  if (!d) throw new HttpError(404, "We couldn't find that report.");
  return d;
};
type Ctx = { params: Promise<{ id: string }> };

export const GET = (_r: Request, { params }: Ctx) => withPatient(async ({ patient }) => {
  const d = await own(patient.id, (await params).id);
  const labs = await prisma.labResult.findMany({ where: { patientId: patient.id, documentId: d.id }, select: { id: true, code: true } });
  return { document: docDTO(d), labIds: labs.map((l) => ({ id: l.id, code: l.code })) };
});

export const PATCH = (req: Request, { params }: Ctx) => withPatientMutation(async ({ patient, ip }) => {
  const d = await own(patient.id, (await params).id);
  const b = await readJson(req, 64_000);
  const kind = DOC_KINDS.includes(b.kind) ? b.kind : d.kind;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? new Date(b.date + "T12:00:00Z") : b.date === null ? null : d.docDate;
  const prev = (() => { try { return JSON.parse(d.extracted || "{}"); } catch { return {}; } })();
  const values: DocValue[] = Array.isArray(b.values) ? b.values.slice(0, 60).map((v: any) => ({ name: str(v?.name, 80), value: str(v?.value, 40), unit: str(v?.unit, 20), ref: str(v?.ref, 40), flag: str(v?.flag, 12) })).filter((v: DocValue) => v.name && v.value) : prev.values || [];
  const provider = b.provider !== undefined ? str(b.provider, 120) || null : d.provider;
  const title = str(b.title, 120) || d.title;
  const status = b.confirm === true ? "saved" : d.status;
  const up = await prisma.healthDocument.update({ where: { id: d.id }, data: { title, kind, provider, docDate: date, status, extracted: JSON.stringify({ ...prev, values }) }, select: DOC_SELECT });
  let added = 0;
  if (status === "saved" && kind === "lab") added = await saveLabValues(patient.id, d.id, provider, date, title, values);
  else if (status === "saved") await prisma.labResult.deleteMany({ where: { patientId: patient.id, documentId: d.id } });
  audit(patient.id, "patient", "update", `document:${d.id}`, ip);
  if (status === "saved" && d.status !== "saved") await award(patient.id, "record", new Date().toISOString().slice(0, 10)).catch(() => 0);
  return { document: docDTO(up), labsAdded: added };
});

export const DELETE = (_r: Request, { params }: Ctx) => withPatientMutation(async ({ patient, ip }) => {
  const d = await own(patient.id, (await params).id);
  await prisma.labResult.deleteMany({ where: { patientId: patient.id, documentId: d.id } });
  const gone = await prisma.healthDocument.delete({ where: { id: d.id }, select: { storageKey: true } });
  if (gone.storageKey) await storage.del(gone.storageKey).catch((e) => console.error("file delete failed:", e?.message));
  audit(patient.id, "patient", "delete", `document:${d.id}`, ip);
  return { ok: true };
});
