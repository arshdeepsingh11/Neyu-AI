// POST /api/portal/devices/sync — { provider } pull now from a one-time-connected source.
import { prisma } from "@backend/db";
import { syncConnection, isOAuthProvider } from "@backend/oauth";
import { getDevices } from "@backend/patientData";
import { rateLimit } from "@backend/rateLimit";
import { withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

export const POST = (req: Request) => withPatientMutation(async ({ patient }) => {
  const provider = str((await readJson(req)).provider, 20);
  if (!isOAuthProvider(provider)) return { stored: 0, devices: await getDevices(patient.id) };
  if (!(await rateLimit(`sync:${patient.id}:${provider}`, 4, 60_000))) throw new HttpError(429, "Synced just now — try again in a minute.");
  const c = await prisma.deviceConnection.findFirst({ where: { patientId: patient.id, provider, status: "connected" }, select: { id: true } });
  if (!c) throw new HttpError(404, "Not connected.");
  const r = await syncConnection(c.id, 7);
  return { stored: r.stored, devices: await getDevices(patient.id) };
});
