// GET  /api/portal/privacy — consents, email preferences, deletion request, exports
// POST /api/portal/privacy — { action, … }
//   email           { reminders?, news? }
//   delete.request  { password, reason? }   → deleted after a 30-day hold
//   delete.cancel   {}
//   export.request  {}                      → .zip prepared in the background, kept 7 days
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";
import { privacyState, setEmailPrefs, requestDeletion, cancelDeletion, requestExport } from "@backend/privacy";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";

export const GET = () => withPatient(async ({ patient, ip }) => {
  audit(patient.id, "patient", "read", "privacy", ip);
  return privacyState(patient.id);
});

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`privacy:${patient.id}`, 30, 10 * 60_000))) throw new HttpError(429, "Please wait a few minutes.");
  const b = await readJson(req);
  const meta = { ip, userAgent: req.headers.get("user-agent") || undefined };
  switch (b.action) {
    case "email": await setEmailPrefs(patient.id, b, meta); break;
    case "delete.request": {
      if (!(await rateLimit(`privacy-del:${patient.id}`, 5, 60 * 60_000))) throw new HttpError(429, "Too many tries. Please wait an hour.");
      await requestDeletion(patient, typeof b.password === "string" ? b.password : "", str(b.reason, 500), "patient", meta);
      break;
    }
    case "delete.cancel": await cancelDeletion(patient.id, "patient", meta); break;
    case "export.request": await requestExport(patient.id, meta); break;
    default: throw new HttpError(400, "Unknown action.");
  }
  return privacyState(patient.id);
});
