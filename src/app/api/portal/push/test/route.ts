// POST /api/portal/push/test — "Send me a test notification" (Account → Notifications).
import { patientPush } from "@backend/push";
import { rateLimit } from "@backend/rateLimit";
import { withPatientMutation, HttpError } from "@backend/apiHelpers";

export const POST = () => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`push-test:${patient.id}`, 3, 10 * 60_000))) throw new HttpError(429, "Test sent a moment ago — try again in a few minutes.");
  const queued = await patientPush(patient.id, "account", { title: "NEYU", body: "Notifications are working. We'll only send what you asked for.", url: "/my-health" });
  if (!queued) throw new HttpError(409, "This phone isn't set up for notifications yet.");
  return { ok: true };
});
