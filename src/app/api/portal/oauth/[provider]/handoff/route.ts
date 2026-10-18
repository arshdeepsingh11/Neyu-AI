// POST /api/portal/oauth/{withings|oura|whoop}/handoff — from the NEYU app: a one-time link
// (5 minutes) that opens the maker's sign-in in the phone's browser. See backend/oauthHandoff.ts.
import { isOAuthProvider, oauthConfigured, baseUrl } from "@backend/oauth";
import { createHandoff } from "@backend/oauthHandoff";
import { rateLimit } from "@backend/rateLimit";
import { withPatientMutation, HttpError } from "@backend/apiHelpers";

export const POST = (req: Request, { params }: { params: Promise<{ provider: string }> }) => withPatientMutation(async ({ patient }) => {
  const { provider } = await params;
  if (!isOAuthProvider(provider) || !oauthConfigured(provider)) throw new HttpError(409, "This connection opens soon.");
  if (!(await rateLimit(`oauth-handoff:${patient.id}`, 10, 10 * 60_000))) throw new HttpError(429, "Too many tries — wait a few minutes.");
  const h = await createHandoff(patient.id, provider);
  return { url: `${baseUrl(req)}/api/portal/oauth/${provider}/start?h=${h}` };
});
