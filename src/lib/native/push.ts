"use client";
// Push notifications in the NEYU app. The phone gives a token; NEYU stores it for the
// signed-in patient (POST /api/portal/push). Messages never contain health details.
import { appCanPush, plugin, prefs, currentPatient, portalFetch, platform } from "./bridge";

const KEY = "neyu.push";
type Saved = { patientId: string; token: string };

export { appCanPush };

/** Current permission: "granted" | "denied" | "prompt" | "unavailable". */
export async function pushPermission(): Promise<string> {
  if (!appCanPush()) return "unavailable";
  const p = await plugin("PushNotifications");
  try { const r = await p!.checkPermissions(); return r?.receive === "granted" ? "granted" : r?.receive === "denied" ? "denied" : "prompt"; } catch { return "unavailable"; }
}

let registering: Promise<boolean> | null = null;
/** Asks permission (only when `ask`), registers with Apple / Google and saves the token. */
export function enablePush(ask: boolean): Promise<boolean> {
  if (registering) return registering;
  registering = (async () => {
    if (!appCanPush()) return false;
    const me = await currentPatient();
    if (!me) return false;
    const p = (await plugin("PushNotifications"))!;
    let perm = await pushPermission();
    if (perm === "prompt" && ask) { const r = await p.requestPermissions().catch(() => null); perm = r?.receive === "granted" ? "granted" : "denied"; }
    if (perm !== "granted") return false;
    const token = await new Promise<string | null>(async (resolve) => {
      const t = setTimeout(() => resolve(null), 15_000);
      const a = await p.addListener!("registration", (e: { value: string }) => { clearTimeout(t); resolve(e.value); });
      const b = await p.addListener!("registrationError", () => { clearTimeout(t); resolve(null); });
      try { await p.register(); } catch { clearTimeout(t); resolve(null); }
      setTimeout(() => { a.remove(); b.remove(); }, 16_000);
    });
    if (!token) return false;
    const prev = await prefs.get<Saved>(KEY);
    if (prev && prev.token === token && prev.patientId === me.id) return true;
    await portalFetch("/api/portal/push", "POST", { token, platform: platform(), appVersion: navigator.userAgent.match(/NeyuApp\/(\S+)/)?.[1] || "1" });
    await prefs.set(KEY, { patientId: me.id, token } satisfies Saved);
    return true;
  })().finally(() => { registering = null; });
  return registering;
}

/** Stops notifications to this phone (sign-out, or turned off in Account). */
export async function disablePush() {
  const s = await prefs.get<Saved>(KEY);
  if (s) await portalFetch(`/api/portal/push`, "DELETE", { token: s.token }).catch(() => {});
  await prefs.remove(KEY);
}

/** Is this phone set to get notifications for the signed-in patient? */
export async function pushOn() {
  const s = await prefs.get<Saved>(KEY), me = await currentPatient();
  return !!s && !!me && s.patientId === me.id && (await pushPermission()) === "granted";
}
