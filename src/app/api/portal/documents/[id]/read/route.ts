// POST /api/portal/documents/{id}/read — ask Neyu to read the original again
// (e.g. after "Neyu couldn't read this file"). Only while the report is in review.
import { prisma } from "@backend/db";
import { rateLimit } from "@backend/rateLimit";
import { withPatientMutation, HttpError } from "@backend/apiHelpers";
import { readDocument, docDTO, DOC_SELECT } from "@backend/documents";
import { docBytes } from "@backend/storage";

export const maxDuration = 120;

export const POST = (_r: Request, { params }: { params: Promise<{ id: string }> }) => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`docread:${patient.id}`, 6, 10 * 60_000))) throw new HttpError(429, "Please wait a few minutes before trying again.");
  const d = await prisma.healthDocument.findFirst({ where: { id: (await params).id.slice(0, 40), patientId: patient.id }, select: { id: true, data: true, storageKey: true, mime: true, title: true, fileName: true } });
  if (!d) throw new HttpError(404, "We couldn't find that report.");
  const r = await readDocument(await docBytes(d), d.mime);
  if (r.aiFailed) throw new HttpError(502, "Neyu still couldn't read this file. You can add the details yourself — the original is saved.");
  const up = await prisma.healthDocument.update({ where: { id: d.id }, select: DOC_SELECT, data: {
    title: r.title || d.title, kind: r.kind || "other", provider: r.provider || null, docDate: r.date ? new Date(r.date + "T12:00:00Z") : null,
    extracted: JSON.stringify({ values: r.values, keyPoints: r.keyPoints }), summary: r.summary || null,
  } });
  return { document: docDTO(up) };
});
