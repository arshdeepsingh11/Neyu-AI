// GET /api/portal/documents/{id}/file — the ORIGINAL file, exactly as added.
// ?download=1 saves it instead of opening it.
import { prisma } from "@backend/db";
import { getCurrentPatient } from "@backend/patientAuth";
import { audit } from "@backend/audit";
import { docBytes } from "@backend/storage";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const patient = await getCurrentPatient();
  if (!patient) return new Response(null, { status: 401 });
  const d = await prisma.healthDocument.findFirst({ where: { id: (await params).id.slice(0, 40), patientId: patient.id }, select: { id: true, data: true, storageKey: true, mime: true, fileName: true } });
  if (!d) return new Response(null, { status: 404 });
  audit(patient.id, "patient", "read", `document-file:${d.id}`, "");
  const dl = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(await docBytes(d)), {
    headers: { "Content-Type": d.mime, "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${d.fileName.replace(/[^\w.\- ]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
