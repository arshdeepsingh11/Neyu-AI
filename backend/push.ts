// Push notifications to the NEYU phone app (Phase 6).
//   Android → Firebase Cloud Messaging (HTTP v1), needs FIREBASE_SERVICE_ACCOUNT
//   iPhone  → Apple Push Notification service directly, needs APNS_KEY + APNS_KEY_ID + APNS_TEAM_ID
// Both are optional: without them nothing is sent and the app simply doesn't offer push.
//
// Messages never contain health details (they can show on a locked screen): only a short,
// general line and the screen to open, e.g. "Your NEYU Today is ready".
//
//   FIREBASE_SERVICE_ACCOUNT  the service-account JSON from Firebase (raw JSON or base64)
//   APNS_KEY                  the .p8 key from developer.apple.com (raw text or base64)
//   APNS_KEY_ID, APNS_TEAM_ID 10-character ids shown next to the key / on your Apple account
//   APNS_BUNDLE_ID            default com.neyuhealth.app
//   APNS_ENV                  production (default in production) | development (Xcode test builds)
import { createSign, createPrivateKey, sign as cryptoSign } from "crypto";
import http2 from "http2";
import { prisma } from "@backend/db";

export type PushMessage = { title: string; body: string; url?: string };
export type PushKind = "reminder" | "account" | "care";

const b64json = (v: string) => { const t = v.trim(); return JSON.parse(t.startsWith("{") ? t : Buffer.from(t, "base64").toString("utf8")); };
const pemText = (v: string) => { const t = v.trim().replace(/\\n/g, "\n"); return t.includes("BEGIN") ? t : Buffer.from(t, "base64").toString("utf8"); };
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function fcmAccount(): { project_id: string; client_email: string; private_key: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { const a = b64json(raw); return a.project_id && a.client_email && a.private_key ? a : null; } catch { return null; }
}
function apnsConfig() {
  const key = process.env.APNS_KEY, kid = process.env.APNS_KEY_ID, team = process.env.APNS_TEAM_ID;
  if (!key || !kid || !team) return null;
  try {
    return {
      key: createPrivateKey(pemText(key)), kid, team, topic: process.env.APNS_BUNDLE_ID || "com.neyuhealth.app",
      host: process.env.APNS_HOST || ((process.env.APNS_ENV || (process.env.NODE_ENV === "production" ? "production" : "development")) === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com"),
    };
  } catch { return null; }
}

/** Which phones this server can reach. */
export const pushConfigured = () => ({ android: !!fcmAccount(), ios: !!apnsConfig() });

// ── Firebase (Android) ──────────────────────────────────────────────────────
let fcmToken: { value: string; exp: number } | null = null;
async function fcmAccessToken(a: NonNullable<ReturnType<typeof fcmAccount>>) {
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const tokenUrl = process.env.FCM_TOKEN_URL || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iss: a.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: tokenUrl, iat: now, exp: now + 3600 }))}`;
  const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(a.private_key, "base64url")}`;
  const r = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }), signal: AbortSignal.timeout(10_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Firebase sign-in failed (${r.status})`);
  fcmToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return fcmToken.value;
}
async function sendFcm(token: string, m: PushMessage): Promise<"ok" | "gone"> {
  const a = fcmAccount();
  if (!a) throw new Error("Firebase is not set up");
  const base = process.env.FCM_ENDPOINT_BASE || "https://fcm.googleapis.com";
  const r = await fetch(`${base}/v1/projects/${a.project_id}/messages:send`, {
    method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${await fcmAccessToken(a)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title: m.title, body: m.body }, data: { url: m.url || "/my-health" }, android: { priority: "HIGH", notification: { sound: "default" } } } }),
  });
  if (r.ok) return "ok";
  const j = await r.json().catch(() => ({}));
  const code = JSON.stringify(j?.error?.details || j?.error?.status || "");
  if (r.status === 404 || /UNREGISTERED/.test(code) || (r.status === 400 && /registration token/i.test(j?.error?.message || ""))) return "gone";
  if (r.status === 401) fcmToken = null;
  throw new Error(`Firebase ${r.status}: ${j?.error?.message || "error"}`);
}

// ── Apple (iPhone) ──────────────────────────────────────────────────────────
let apnsJwt: { value: string; at: number } | null = null;
function apnsBearer(c: NonNullable<ReturnType<typeof apnsConfig>>) {
  if (apnsJwt && Date.now() - apnsJwt.at < 45 * 60_000) return apnsJwt.value; // Apple: refresh at most every 20–60 min
  const unsigned = `${b64url(JSON.stringify({ alg: "ES256", kid: c.kid }))}.${b64url(JSON.stringify({ iss: c.team, iat: Math.floor(Date.now() / 1000) }))}`;
  const sig = cryptoSign("sha256", Buffer.from(unsigned), { key: c.key, dsaEncoding: "ieee-p1363" });
  apnsJwt = { value: `${unsigned}.${b64url(sig)}`, at: Date.now() };
  return apnsJwt.value;
}
function sendApns(token: string, m: PushMessage): Promise<"ok" | "gone"> {
  const c = apnsConfig();
  if (!c) return Promise.reject(new Error("Apple push is not set up"));
  return new Promise((resolve, reject) => {
    const session = http2.connect(c.host);
    const done = (fn: () => void) => { try { session.close(); } catch {} fn(); };
    session.on("error", (e) => done(() => reject(e)));
    const req = session.request({
      ":method": "POST", ":path": `/3/device/${token}`, authorization: `bearer ${apnsBearer(c)}`,
      "apns-topic": c.topic, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json",
    });
    req.setTimeout(10_000, () => { req.close(); done(() => reject(new Error("Apple push timed out"))); });
    let status = 0, body = "";
    req.on("response", (h) => { status = Number(h[":status"]); });
    req.on("data", (d) => { body += d; });
    req.on("end", () => done(() => {
      if (status === 200) return resolve("ok");
      const reason = (() => { try { return JSON.parse(body).reason as string; } catch { return ""; } })();
      if (status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") return resolve("gone");
      if (reason === "ExpiredProviderToken" || reason === "InvalidProviderToken") apnsJwt = null;
      reject(new Error(`Apple push ${status}: ${reason || "error"}`));
    }));
    req.on("error", (e) => done(() => reject(e)));
    req.end(JSON.stringify({ aps: { alert: { title: m.title, body: m.body }, sound: "default" }, url: m.url || "/my-health" }));
  });
}

/** Sends to every phone of one patient. Returns how many phones got it. Runs in the worker. */
export async function deliverPush(patientId: string, m: PushMessage) {
  const devices = await prisma.pushDevice.findMany({ where: { patientId } });
  let sent = 0;
  const errors: string[] = [];
  for (const d of devices) {
    try {
      const r = d.platform === "ios" ? await sendApns(d.token, m) : await sendFcm(d.token, m);
      if (r === "gone") { await prisma.pushDevice.delete({ where: { id: d.id } }).catch(() => {}); continue; }
      sent++;
      await prisma.pushDevice.update({ where: { id: d.id }, data: { lastSentAt: new Date(), lastError: null } });
    } catch (e: any) {
      errors.push(e?.message || "error");
      await prisma.pushDevice.update({ where: { id: d.id }, data: { lastError: String(e?.message || "error").slice(0, 200) } }).catch(() => {});
    }
  }
  if (!sent && errors.length) throw new Error(errors[0]); // the queue retries
  return { sent, phones: devices.length };
}

/** Queues a push for a patient if they have the app and allow this kind. True = queued. */
export async function patientPush(patientId: string, kind: PushKind, m: PushMessage): Promise<boolean> {
  const cfg = pushConfigured();
  if (!cfg.android && !cfg.ios) return false;
  const platforms = [...(cfg.android ? ["android"] : []), ...(cfg.ios ? ["ios"] : [])];
  const has = await prisma.pushDevice.count({ where: { patientId, platform: { in: platforms } } });
  if (!has) return false;
  if (kind === "reminder") {
    const pref = await prisma.emailPreference.findUnique({ where: { patientId }, select: { reminders: true } });
    if (pref && !pref.reminders) return false;
  }
  const { enqueue } = await import("@backend/queue");
  await enqueue("push.send", { patientId, title: m.title.slice(0, 80), body: m.body.slice(0, 180), url: m.url || "/my-health" });
  return true;
}
