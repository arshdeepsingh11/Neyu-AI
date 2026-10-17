// POST /api/portal/password — change password (signs out every other device).
import { prisma } from "@backend/db";
import { verifyPassword, hashPassword, passwordProblem, revokeOtherSessions } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatientMutation, readJson, HttpError } from "@backend/apiHelpers";

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`pw:${patient.id}`, 5, 15 * 60 * 1000))) throw new HttpError(429, "Too many attempts. Please try again later.");
  const b = await readJson(req);
  const current = typeof b.current === "string" ? b.current : "", next = typeof b.next === "string" ? b.next : "";
  const row = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, row.passwordHash))) throw new HttpError(400, "Your current password is incorrect.");
  const problem = passwordProblem(next, patient.email);
  if (problem) throw new HttpError(400, problem);
  await prisma.patient.update({ where: { id: patient.id }, data: { passwordHash: await hashPassword(next) } });
  await revokeOtherSessions(patient.id);
  audit(patient.id, "patient", "update", "password", ip);
  return { ok: true };
});
