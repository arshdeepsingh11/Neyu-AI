// GET    /api/portal/devices                       — device list + status
// POST   /api/portal/devices  { provider }          — connect: Shortcut sources get a private sync token (shown once),
//                                                   one-time sign-in sources get { redirect }, waitlist sources are noted
//                      { provider, via: "app" }      — from the NEYU phone app (Apple Health / Health Connect): a sync token
// PATCH  /api/portal/devices  { provider, dataTypes } — choose which signals are shared
// DELETE /api/portal/devices?provider=apple         — disconnect (token revoked; existing data kept)
import { randomBytes } from "crypto";
import { prisma } from "@backend/db";
import { sha256 } from "@backend/patientAuth";
import { getDevices } from "@backend/patientData";
import { audit } from "@backend/audit";
import { DEVICE_CATALOG } from "@/lib/portal/devices";
import { oauthConfigured } from "@backend/oauth";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";

const find = (p: string) => DEVICE_CATALOG.find((d) => d.id === p);

export const GET = () => withPatient(async ({ patient }) => getDevices(patient.id));

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const b = await readJson(req);
  const provider = str(b.provider, 20), viaApp = b.via === "app";
  const dev = find(provider);
  if (!dev) throw new HttpError(400, "Unknown device.");
  // Health Connect needs the phone app; on the website it is "tell me when the app is ready".
  if (dev.mode === "waitlist" || (dev.mode === "app" && !viaApp)) {
    await prisma.deviceConnection.upsert({ where: { patientId_provider: { patientId: patient.id, provider } }, create: { patientId: patient.id, provider, status: "waitlist" }, update: { status: "waitlist" } });
    audit(patient.id, "patient", "create", `device-waitlist:${provider}`, ip);
    return { waitlist: true, devices: await getDevices(patient.id) };
  }
  if (dev.mode === "oauth") {
    if (!oauthConfigured(provider)) throw new HttpError(409, `${dev.name} connection opens soon.`);
    return { redirect: `/api/portal/oauth/${provider}/start`, devices: await getDevices(patient.id) };
  }
  const token = "anra_dev_" + randomBytes(24).toString("base64url");
  const dataTypes = JSON.stringify(dev.signals.map((s) => s.label));
  await prisma.deviceConnection.upsert({
    where: { patientId_provider: { patientId: patient.id, provider } },
    create: { patientId: patient.id, provider, status: "pending", tokenHash: sha256(token), tokenHint: token.slice(-4), dataTypes },
    // From the app, the phone's own permission screen is where the patient chooses what to share,
    // so every signal is allowed here (Apple Health / Health Connect only hand over what was allowed).
    update: { status: "pending", tokenHash: sha256(token), tokenHint: token.slice(-4), ...(viaApp ? { dataTypes } : {}) },
  });
  audit(patient.id, "patient", "create", `device:${provider}`, ip);
  return { token, devices: await getDevices(patient.id) };
});

export const PATCH = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const b = await readJson(req);
  const dev = find(str(b.provider, 20));
  if (!dev) throw new HttpError(400, "Unknown device.");
  const allowed = new Set(dev.signals.map((s) => s.label));
  const dataTypes = Array.isArray(b.dataTypes) ? b.dataTypes.filter((x: unknown) => typeof x === "string" && allowed.has(x)) : null;
  if (!dataTypes) throw new HttpError(400, "dataTypes must be a list.");
  const r = await prisma.deviceConnection.updateMany({ where: { patientId: patient.id, provider: dev.id }, data: { dataTypes: JSON.stringify(dataTypes) } });
  if (!r.count) throw new HttpError(404, "Device isn't connected.");
  audit(patient.id, "patient", "update", `device:${dev.id}:data`, ip);
  return getDevices(patient.id);
});

export const DELETE = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  const provider = (new URL(req.url).searchParams.get("provider") || "").slice(0, 20);
  await prisma.deviceConnection.updateMany({ where: { patientId: patient.id, provider }, data: { status: "disconnected", tokenHash: null, tokenHint: null, accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, lastError: null } });
  audit(patient.id, "patient", "delete", `device:${provider}`, ip);
  return getDevices(patient.id);
});
