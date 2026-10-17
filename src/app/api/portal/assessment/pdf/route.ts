// POST /api/portal/assessment/pdf — { days, sections[], docIds[], observations[], questions[] }
// Returns the Doctor Assessment PDF (summary + chosen original reports).
import { docBytes } from "@backend/storage";
import { getAssessment } from "@backend/space";
import { buildAssessmentPdf } from "@backend/assessmentPdf";
import { prisma } from "@backend/db";
import { countPages } from "@backend/documents";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

export const maxDuration = 60;
const DAYS = [30, 90, 180, 365, 3650];

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`assesspdf:${patient.id}`, 40, 10 * 60_000))) throw new HttpError(429, "Please wait a few minutes before creating another PDF.");
  const b = await readJson(req, 64_000);
  const days = DAYS.includes(Number(b.days)) ? Number(b.days) : 90;
  const arr = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v.slice(0, n).map((s) => str(s, len)).filter(Boolean) : []);
  const a = await getAssessment(patient, days);
  const opts = { sections: arr(b.sections, 30, 20), docIds: arr(b.docIds, 20, 40), observations: arr(b.observations, 8, 300), questions: arr(b.questions, 12, 300), summary: str(b.summary, 900) || undefined };
  // Dry run: how many pages? (summary + each original report)
  if (b.dryRun === true) {
    const summaryPages = (await buildAssessmentPdf(patient.id, a, { ...opts, countOnly: true }))[0];
    const docs = await prisma.healthDocument.findMany({ where: { patientId: patient.id, status: "saved" }, select: { id: true, pages: true, mime: true } });
    const reports: { id: string; pages: number }[] = [];
    for (const d of docs) {
      let n = d.pages;
      if (!n) { const full = await prisma.healthDocument.findUnique({ where: { id: d.id }, select: { data: true, storageKey: true } }); n = await countPages(await docBytes(full!), d.mime); await prisma.healthDocument.update({ where: { id: d.id }, data: { pages: n } }); }
      reports.push({ id: d.id, pages: n + 1 }); // +1 cover page before each original
    }
    return { summaryPages, reports };
  }
  const bytes = await buildAssessmentPdf(patient.id, a, opts);
  audit(patient.id, "patient", "create", `assessment-pdf:${days}`, ip);
  const name = `Doctor-Assessment-${patient.firstName}-${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[^\w.-]/g, "");
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
});
