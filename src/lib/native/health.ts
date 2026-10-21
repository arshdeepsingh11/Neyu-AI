"use client";
// Apple Health (iPhone) and Health Connect (Android) in the NEYU app.
// Connect: ask the phone for read permission → NEYU gives this phone a private sync token
// (same as the Apple Health Shortcut) → the app reads the last 30 days and sends daily values.
// After that the app sends new days whenever it is opened (at most once an hour).
// Read only: NEYU never writes to Apple Health or Health Connect.
import { isNative, platform, plugin, prefs, currentPatient, portalFetch } from "./bridge";
import { fromAggregated, perDay, bloodPressure, workouts, sleep, convert, localTz, type Reading } from "./healthMap";

const READ = ["steps", "distance", "calories", "restingHeartRate", "heartRateVariability", "oxygenSaturation", "sleep", "weight", "bloodPressure", "bloodGlucose", "workouts"] as const;
const READ_IOS = [...READ, "exerciseTime"] as const;
const KEY = "neyu.health";
type Saved = { patientId: string; provider: "iphone" | "android"; token: string; lastSync?: string; lastTry?: string };

/** Which device card this phone connects natively: iPhone (and Apple Watch through it) or Android. */
export function nativeHealthProvider(cardId: string): "iphone" | "android" | null {
  if (!isNative()) return null;
  const p = platform();
  if (p === "ios" && (cardId === "iphone" || cardId === "apple")) return "iphone";
  if (p === "android" && cardId === "android") return "android";
  return null;
}
export const healthName = () => (platform() === "ios" ? "Apple Health" : "Health Connect");

export async function healthAvailable(): Promise<{ ok: boolean; reason?: string }> {
  const h = await plugin("Health");
  if (!h) return { ok: false, reason: "Update the NEYU app to connect your health data." };
  try {
    const r = await h.isAvailable();
    if (r?.available) return { ok: true };
    return { ok: false, reason: platform() === "android" ? "Install or update Health Connect from Google Play, then try again." : "Apple Health isn't available on this device." };
  } catch { return { ok: false, reason: "Couldn't reach the health data on this phone." }; }
}

async function saved(): Promise<Saved | null> {
  const s = await prefs.get<Saved>(KEY);
  if (!s) return null;
  const me = await currentPatient();
  return me && me.id === s.patientId ? s : null; // another person signed in on this phone
}
export async function nativeConnected(provider: string) { const s = await saved(); return !!s && s.provider === provider; }

/** Asks permission, gets a sync token from NEYU, sends the last 30 days. */
export async function connectNativeHealth(provider: "iphone" | "android"): Promise<{ stored: number }> {
  const me = await currentPatient();
  if (!me) throw new Error("Please sign in again.");
  const av = await healthAvailable();
  if (!av.ok) throw new Error(av.reason);
  const h = (await plugin("Health"))!;
  await h.requestAuthorization({ read: [...(platform() === "ios" ? READ_IOS : READ)], write: [] });
  const r = await portalFetch("/api/portal/devices", "POST", { provider, via: "app" });
  if (!r?.token) throw new Error("NEYU couldn't connect this phone. Try again.");
  await prefs.set(KEY, { patientId: me.id, provider, token: r.token } satisfies Saved);
  return syncNativeHealth({ days: 30, force: true });
}

export async function disconnectNativeHealth() { await prefs.remove(KEY); }

/** Reads recent days and sends them. Quietly does nothing when not connected on this phone. */
export async function syncNativeHealth(o: { days?: number; force?: boolean } = {}): Promise<{ stored: number }> {
  const s = await saved();
  if (!s) return { stored: 0 };
  const now = Date.now();
  if (!o.force && s.lastTry && now - new Date(s.lastTry).getTime() < 3600_000) return { stored: 0 };
  await prefs.set(KEY, { ...s, lastTry: new Date(now).toISOString() });
  // Since the last good sync, with 2 days of overlap (late data from the watch), at least 3 days.
  const days = o.days ?? Math.min(30, Math.max(3, s.lastSync ? Math.ceil((now - new Date(s.lastSync).getTime()) / 86400000) + 2 : 30));
  const readings = await readDays(days);
  if (!readings.length) return { stored: 0 };
  let stored = 0;
  for (let i = 0; i < readings.length; i += 1500) {
    const r = await fetch("/api/wearables/ingest", { method: "POST", headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ readings: readings.slice(i, i + 1500) }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { await prefs.remove(KEY); throw new Error("This phone was disconnected from NEYU. Connect it again in Devices."); }
    if (!r.ok) throw new Error(j?.error || "Sync failed. Try again later.");
    stored += j.stored || 0;
  }
  await prefs.set(KEY, { ...s, lastTry: new Date(now).toISOString(), lastSync: new Date(now).toISOString() });
  return { stored };
}

/** Reads the phone's health data for the last `days` days → daily readings. */
export async function readDays(days: number): Promise<Reading[]> {
  const h = await plugin("Health");
  if (!h) return [];
  const tz = localTz();
  const end = new Date(), start = new Date();
  start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  const range = { startDate: start.toISOString(), endDate: end.toISOString() };
  const agg = async (dataType: string, aggregation: "sum" | "average") => { try { return (await h.queryAggregated({ dataType, ...range, bucket: "day", aggregation })).samples || []; } catch { return []; } };
  const samples = async (dataType: string) => { try { return (await h.readSamples({ dataType, ...range, limit: 10000 })).samples || []; } catch { return []; } };
  const ios = platform() === "ios";
  const [steps, dist, kcal, rhr, hrv, spo2, slp, wt, bp, glu, ex, wo] = await Promise.all([
    agg("steps", "sum"), agg("distance", "sum"), agg("calories", "sum"), agg("restingHeartRate", "average"),
    samples("heartRateVariability"), samples("oxygenSaturation"), samples("sleep"), samples("weight"), samples("bloodPressure"), samples("bloodGlucose"),
    ios ? samples("exerciseTime") : Promise.resolve([]),
    (async () => { try { return (await h.queryWorkouts({ ...range, limit: 1000 })).workouts || []; } catch { return []; } })(),
  ]);
  return [
    ...fromAggregated("steps", steps, tz, "sum"),
    ...fromAggregated("distance", dist, tz, "sum", convert.km),
    ...fromAggregated("activeEnergy", kcal, tz, "sum"),
    ...fromAggregated("rhr", rhr, tz, "average"),
    ...perDay("hrv", hrv, tz, "average"),
    ...perDay("spo2", spo2, tz, "average", convert.percent),
    ...sleep(slp, tz),
    ...perDay("weight", wt, tz, "latest"),
    ...bloodPressure(bp, tz),
    ...perDay("glucose", glu, tz, "latest", convert.mmol),
    ...(ios ? perDay("active", ex, tz, "sum") : []),
    ...workouts(wo, tz, !ios),
  ].filter((r) => r.date >= start.toLocaleDateString("en-CA"));
}

/** Health Connect settings (Android) — where the patient changes what NEYU may read. */
export async function openHealthSettings() { const h = await plugin("Health"); try { await h?.openHealthConnectSettings(); } catch {} }
