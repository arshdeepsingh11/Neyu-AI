"use client";
// Access to the phone's features inside the NEYU app (Capacitor 8). On the normal website
// every helper here does nothing. The plugins themselves are part of the app (mobile/);
// the website only talks to them by name, loaded on first use.
//
// Tests: Playwright sets window.NeyuNativeMock = { platform, plugins: { Name: {...} } }
// before the page loads, so the app features can be tested in a normal browser.

type Listener = { remove: () => Promise<void> | void };
export type Plugin = Record<string, any> & { addListener?: (event: string, fn: (e: any) => void) => Promise<Listener> | Listener };
type Mock = { platform: "ios" | "android"; plugins: Record<string, Plugin> };

const mock = (): Mock | null => (typeof window !== "undefined" && (window as any).NeyuNativeMock) || null;
const cap = () => (typeof window !== "undefined" ? (window as any).Capacitor : undefined);

/** True inside the NEYU iPhone / Android app. */
export const isNative = () => !!mock() || !!cap()?.isNativePlatform?.();
export const platform = (): "ios" | "android" | "web" => mock()?.platform || (isNative() ? cap().getPlatform() : "web");
/** Is this phone feature part of the installed app? (older app versions may not have all) */
export const hasPlugin = (name: string) => !!mock()?.plugins[name] || !!cap()?.isPluginAvailable?.(name);
/** The app was built with push (Android needs the Firebase file; free Apple ID builds can't push). */
export const appCanPush = () => (mock() ? !!mock()!.plugins.PushNotifications : /NeyuPush\//.test(navigator.userAgent)) && hasPlugin("PushNotifications");

const cache = new Map<string, Plugin>();
export async function plugin(name: string): Promise<Plugin | null> {
  const m = mock();
  if (m) return m.plugins[name] || null;
  if (!isNative() || !hasPlugin(name)) return null;
  if (!cache.has(name)) {
    const { registerPlugin } = await import("@capacitor/core");
    cache.set(name, registerPlugin<Plugin>(name));
  }
  return cache.get(name)!;
}

/** Calls a plugin method; null when the plugin is missing or the call fails. */
export async function call<T = any>(name: string, method: string, opts?: unknown): Promise<T | null> {
  try { const p = await plugin(name); return p ? ((await p[method](opts)) as T) : null; } catch { return null; }
}

// Small key-value store in the app (survives restarts; separate from the website's storage).
export const prefs = {
  async get<T>(key: string): Promise<T | null> {
    const r = await call<{ value: string | null }>("Preferences", "get", { key });
    try { return r?.value ? (JSON.parse(r.value) as T) : null; } catch { return null; }
  },
  set: (key: string, value: unknown) => call("Preferences", "set", { key, value: JSON.stringify(value) }),
  remove: (key: string) => call("Preferences", "remove", { key }),
};

/** The signed-in patient (id is needed to keep each person's phone settings apart). */
export async function currentPatient(): Promise<{ id: string; firstName: string } | null> {
  try {
    const r = await fetch("/api/portal/session", { cache: "no-store", credentials: "same-origin" });
    const j = await r.json();
    return j?.signedIn && j.id ? { id: j.id, firstName: j.firstName } : null;
  } catch { return null; }
}

/** Same-origin JSON request with the header the portal APIs expect. */
export async function portalFetch(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
  return j;
}
