// GET  /api/portal/documents — the patient's reports (no file bytes)
// POST /api/portal/documents — multipart { file, source: upload|scan|photo }
//   Stores the original untouched, then Neyu reads it (status "review" until
//   the patient confirms what was found).
import { prisma } from "@backend/db";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatient, withPatientMutation, HttpError } from "@backend/apiHelpers";
import { readDocument, countPages, docDTO, DOC_SELECT, DOC_MIME, MAX_DOC_BYTES } from "@backend/documents";
import { storage, docKey, sha256Hex } from "@backend/storage";
import { createId } from "@backend/ids";

export const maxDuration = 90;

export const GET = () => withPatient(async ({ patient }) => {
  const docs = await prisma.healthDocument.findMany({ where: { patientId: patient.id, status: { not: "failed" } }, orderBy: [{ docDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], select: DOC_SELECT });
  return { documents: docs.map(docDTO) };
});

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`doc:${patient.id}`, 12, 10 * 60_000))) throw new HttpError(429, "You've added a lot of reports quickly. Please wait a few minutes.");
  if (Number(req.headers.get("content-length") || 0) > MAX_DOC_BYTES + 200_000) throw new HttpError(413, "This file is larger than 15 MB. Try a smaller PDF or a photo.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "Please choose a file.");
  const mime = (file.type || "").toLowerCase();
  if (!DOC_MIME.includes(mime)) throw new HttpError(415, "Please add a PDF or a photo (JPG, PNG, HEIC).");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) throw new HttpError(400, "This file is empty.");
  if (buf.length > MAX_DOC_BYTES) throw new HttpError(413, "This file is larger than 15 MB. Try a smaller PDF or a photo.");
  // Duplicate check: the exact same file is already in the Health Space (by fingerprint;
  // older rows without one are compared byte by byte).
  const hash = sha256Hex(buf);
  const dup = (await prisma.healthDocument.findFirst({ where: { patientId: patient.id, sha256: hash }, select: { id: true, title: true } }))
    || (await prisma.healthDocument.findMany({ where: { patientId: patient.id, size: buf.length, sha256: null, data: { not: null } }, select: { id: true, data: true, title: true } })).find((d) => d.data && Buffer.from(d.data).equals(buf));
  if (dup) throw new HttpError(409, `This report is already in your Health Space ("${dup.title}").`);
  const src = String(form?.get("source") || "upload");
  const source = ["upload", "scan", "photo"].includes(src) ? src : "upload";

  const [reading, pages] = await Promise.all([readDocument(buf, mime === "image/heif" ? "image/heic" : mime), countPages(buf, mime)]);
  const name = (file.name || "report").slice(0, 120);
  // The original goes to file storage (encrypted); the database keeps only its key.
  const id = createId(), key = docKey(patient.id, id);
  await storage.put(key, buf);
  const doc = await prisma.healthDocument.create({
    data: {
      id, storageKey: key, sha256: hash, patientId: patient.id, title: reading.title || name.replace(/\.[a-z0-9]+$/i, "") || "Health report", kind: reading.kind || "other",
      provider: reading.provider || null, docDate: reading.date ? new Date(reading.date + "T12:00:00Z") : null, source, mime, fileName: name, size: buf.length, pages,
      extracted: JSON.stringify({ values: reading.values, keyPoints: reading.keyPoints, aiFailed: reading.aiFailed || undefined }), summary: reading.summary || null, status: "review",
    },
    select: DOC_SELECT,
  });
  audit(patient.id, "patient", "create", `document:${doc.id}`, ip);
  return { document: docDTO(doc) };
});
