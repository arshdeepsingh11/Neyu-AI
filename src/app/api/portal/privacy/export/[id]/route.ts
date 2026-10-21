// GET /api/portal/privacy/export/{id} — download a prepared data export (.zip), for 7 days.
import { getCurrentPatient } from "@backend/patientAuth";
import { exportFile } from "@backend/privacy";
import { audit } from "@backend/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const patient = await getCurrentPatient();
  if (!patient) return new Response(null, { status: 401 });
  try {
    const id = (await params).id;
    const buf = await exportFile(patient.id, id);
    audit(patient.id, "patient", "export", `export-file:${id}`, "");
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="neyu-my-data-${new Date().toISOString().slice(0, 10)}.zip"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Not available." }, { status: e?.status || 404 });
  }
}
