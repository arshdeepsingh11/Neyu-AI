// Connecting Withings / Oura / WHOOP from the NEYU phone app (Phase 6).
// The makers' sign-in pages open in the phone's own browser, which doesn't have the app's
// sign-in. So the app first asks for a one-time link (valid 5 minutes, works once) that
// carries who the patient is. The state cookie is signed, so nobody can swap the patient.
// When the maker sends the patient back, the page opens the app again (com.neyuhealth.app://).
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { kv } from "@backend/kv";

const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.TOKEN_ENC_KEY || "neyu-dev-only-secret";
export const APP_SCHEME = "com.neyuhealth.app";

export async function createHandoff(patientId: string, provider: string) {
  const h = randomBytes(24).toString("base64url");
  await kv.set(`oauth-handoff:${h}`, JSON.stringify({ patientId, provider }), 300);
  return h;
}
/** Uses up a one-time link. Null when unknown, expired, already used or for another maker. */
export async function takeHandoff(h: string, provider: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(h)) return null;
  const raw = await kv.get(`oauth-handoff:${h}`);
  await kv.del(`oauth-handoff:${h}`);
  if (!raw) return null;
  try { const v = JSON.parse(raw); return v.provider === provider ? String(v.patientId) : null; } catch { return null; }
}

// State cookie: provider.state.patientId.mode.signature   (mode "web" or "app")
const mac = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
export const stateCookie = (provider: string, state: string, patientId: string, mode: "web" | "app") => {
  const v = `${provider}.${state}.${patientId}.${mode}`;
  return `${v}.${mac(v)}`;
};
export function readStateCookie(raw: string | undefined) {
  const parts = (raw || "").split(".");
  if (parts.length !== 5) return null;
  const [provider, state, patientId, mode, sig] = parts;
  const want = Buffer.from(mac(`${provider}.${state}.${patientId}.${mode}`)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { provider, state, patientId, mode: mode === "app" ? ("app" as const) : ("web" as const) };
}

/** Page shown in the phone's browser at the end: opens the app on the Devices screen. */
export function backToAppPage(query: string) {
  const link = `${APP_SCHEME}://my-health?s=devices&${query}`;
  const ok = /connected=/.test(query);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEYU</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;background:#F7F6F2;font-family:-apple-system,system-ui,sans-serif;color:#1D2327;text-align:center}h1{margin:0;font-size:22px;font-weight:500}p{margin:0;color:#5B6369;font-size:15px;max-width:320px;line-height:1.5}a{display:inline-flex;align-items:center;height:50px;padding:0 26px;border-radius:14px;background:#14181B;color:#fff;text-decoration:none;font-size:16px}</style></head>
<body><h1>${ok ? "Connected" : "Not connected"}</h1><p>${ok ? "Your device is connected to NEYU." : "The connection didn't finish. You can try again in the app."}</p><a href="${link}">Back to the NEYU app</a>
<script>location.replace(${JSON.stringify(link)})</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
