"use client";

// NEYU mobile app (Capacitor) helpers. The app is the same website inside a
// native shell; the shell adds "NeyuApp" to the user agent. The patient chooses
// where the app opens: My Health Space or the NEYU website.

export type AppHome = "myhealth" | "website";
const KEY = "neyu:appHome";

export const isNativeApp = () =>
  typeof window !== "undefined" && (!!(window as any).Capacitor?.isNativePlatform?.() || /NeyuApp/i.test(navigator.userAgent));

export function getAppHome(): AppHome | null {
  try { const v = localStorage.getItem(KEY); return v === "myhealth" || v === "website" ? v : null; } catch { return null; }
}
export function setAppHome(v: AppHome) {
  try { localStorage.setItem(KEY, v); } catch {}
  try { document.cookie = `neyu_app_home=${v}; path=/; max-age=31536000; samesite=lax`; } catch {}
  try { window.dispatchEvent(new Event("neyu:apphome")); } catch {}
}
export const homePath = (v: AppHome | null) => (v === "website" ? "/" : "/my-health");
