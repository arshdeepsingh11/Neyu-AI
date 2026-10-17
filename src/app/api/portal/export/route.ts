// GET /api/portal/export — instant download of all My Health Space data (JSON).
// For a full copy including the original report files, use Privacy & Data → "Prepare full export"
// (POST /api/portal/privacy { action: "export.request" }).
import { audit } from "@backend/audit";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, HttpError } from "@backend/apiHelpers";
import { patientData } from "@backend/privacy";

export const GET = () => withPatient(async ({ patient, ip }) => {
  if (!(await rateLimit(`export:${patient.id}`, 5, 60 * 60 * 1000))) throw new HttpError(429, "Please try again later.");
  const data = await patientData(patient.id);
  audit(patient.id, "patient", "export", "all", ip);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), note: "Original report files: Privacy & Data → Prepare full export (.zip), or download one by one from Records.", ...data }, null, 2);
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="neyu-my-health-space-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } });
});
