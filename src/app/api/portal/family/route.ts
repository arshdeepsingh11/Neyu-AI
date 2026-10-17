// GET    /api/portal/family — my caregivers, people I care for, invites to me
// POST   /api/portal/family — { email, relation } invite a family member
// PATCH  /api/portal/family — { id } or { token } accept an invite
// DELETE /api/portal/family?id= — remove access (either side) or decline
import { getFamily, inviteCaregiver, acceptCare, removeCare } from "@backend/social";
import { baseUrl } from "@backend/oauth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

export const GET = () => withPatient(async ({ patient }) => getFamily(patient));

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`care:${patient.id}`, 10, 3600_000))) throw new HttpError(429, "Too many invites. Try again later.");
  const b = await readJson(req);
  const r = await inviteCaregiver(patient, str(b.email, 120), str(b.relation, 30), baseUrl(req));
  audit(patient.id, "patient", "create", "care-invite", ip);
  return { ...(await getFamily(patient)), inviteUrl: r.url };
});

export const PATCH = (req: Request) => withPatientMutation(async ({ patient }) => {
  const b = await readJson(req);
  await acceptCare(patient, { id: str(b.id, 40) || undefined, token: str(b.token, 80) || undefined });
  return getFamily(patient);
});

export const DELETE = (req: Request) => withPatientMutation(async ({ patient }) => {
  await removeCare(patient, (new URL(req.url).searchParams.get("id") || "").slice(0, 40));
  return getFamily(patient);
});
