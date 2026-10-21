// GET  /api/portal/challenges — my challenges with leaderboards
// POST /api/portal/challenges — { action: "create", name, metric, goal, days, org? }
//                               { action: "join", code } | { action: "leave", id }
import { createChallenge, joinChallenge, leaveChallenge, listChallenges } from "@backend/social";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

export const GET = () => withPatient(async ({ patient }) => listChallenges(patient));

export const POST = (req: Request) => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`chal:${patient.id}`, 20, 60_000))) throw new HttpError(429, "Slow down a little.");
  const b = await readJson(req);
  const action = str(b.action, 10);
  let code: string | undefined;
  if (action === "create") code = await createChallenge(patient, { name: str(b.name, 60), metric: str(b.metric, 12), goal: Number(b.goal), days: Number(b.days), org: str(b.org, 60), startDay: str(b.startDay, 10) });
  else if (action === "join") await joinChallenge(patient, str(b.code, 12));
  else if (action === "leave") await leaveChallenge(patient, str(b.id, 40));
  else throw new HttpError(400, "Unknown action.");
  return { code, challenges: await listChallenges(patient) };
});
