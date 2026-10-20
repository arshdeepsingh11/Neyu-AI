// GET  /api/portal/privacy/review — were the Terms or Privacy Policy updated since this patient agreed?
// POST /api/portal/privacy/review — "I agree" to the current versions (recorded as a consent, method "review").
import { withPatient, withPatientMutation } from "@backend/apiHelpers";
import { policyReview, acceptPolicies } from "@backend/privacy";
import { audit } from "@backend/audit";

export const GET = () => withPatient(async ({ patient }) => policyReview(patient.id));

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const r = await acceptPolicies(patient.id, { ip, userAgent: req.headers.get("user-agent") || undefined });
  audit(patient.id, "patient", "update", "consent:policy-review", ip);
  return r;
});
