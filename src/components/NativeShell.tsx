"use client";
// NEYU phone app (Phase 6): everything the app adds on top of the website.
// Renders nothing on the normal website.
//   • status bar + splash screen, Android back button
//   • links back into the app (com.neyuhealth.app://…) after Withings / Oura / WHOOP sign-in
//   • push notifications: keeps this phone's token current, opens the right screen on tap
//   • Face ID / fingerprint lock: on open and after 2 minutes in the background
//   • Apple Health / Health Connect: sends new days when the app is opened (max once an hour)
//   • downloads (PDF exports, documents) → the phone's share sheet; other sites → in-app browser
//   • "You're offline" banner
import React, { useCallback, useEffect, useRef, useState } from "react";
import { isNative, platform, plugin, call, currentPatient } from "@/lib/native/bridge";
import { enablePush, pushOn } from "@/lib/native/push";
import { lockEnabled, unlock, biometryLabel, LOCK_AFTER_MS } from "@/lib/native/lock";
import { syncNativeHealth } from "@/lib/native/health";
import { nativeShare, fileNameFrom } from "@/lib/native/files";
import { nativeBeforeSignOut } from "@/lib/native/session";
import NeyuLogo from "@/components/brand/NeyuLogo";

const APP_SCHEME = "com.neyuhealth.app:";
// Links that download a file: handed to the share sheet (a WebView ignores downloads).
const DOWNLOAD = [/^\/api\/portal\/export(\?|$)/, /^\/api\/portal\/privacy\/export\/[^/]+/, /^\/api\/portal\/documents\/[^/]+\/file/];

/** Turns an app link or a neyuhealth.com link into a path on this site (null = not ours). */
export function appPath(url: string): string | null {
  try {
    if (url.startsWith(APP_SCHEME)) {
      const u = new URL(url.replace(APP_SCHEME + "//", "https://app.invalid/"));
      return u.pathname + u.search;
    }
    const u = new URL(url, location.href);
    return u.origin === location.origin ? u.pathname + u.search + u.hash : null;
  } catch { return null; }
}
const safePath = (p: unknown) => (typeof p === "string" && /^\/(?!\/)/.test(p) ? p : null);

export default function NativeShell() {
  const [on, setOn] = useState(false);
  const [locked, setLocked] = useState<"no" | "cover" | "ask">("no");
  const [label, setLabel] = useState("Face ID");
  const [offline, setOffline] = useState(false);
  const bgAt = useRef<number | null>(null);
  const asking = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    const ok = await unlock();
    asking.current = false;
    if (ok) setLocked("no"); else setLocked("ask");
  }, []);

  // Lock when opened (signed in + lock on).
  const lockIfNeeded = useCallback(async () => {
    if (!(await lockEnabled()) || !(await currentPatient())) return false;
    setLabel((await biometryLabel()) || "Face ID");
    setLocked("ask");
    tryUnlock();
    return true;
  }, [tryUnlock]);

  useEffect(() => {
    if (!isNative()) return;
    setOn(true);
    document.documentElement.dataset.neyuApp = platform();
    const subs: { remove: () => any }[] = [];
    const listen = async (name: string, event: string, fn: (e: any) => void) => {
      const p = await plugin(name);
      if (p?.addListener) subs.push(await p.addListener(event, fn));
    };
    const go = (path: string | null) => { if (path) location.assign(path); };

    (async () => {
      call("StatusBar", "setStyle", { style: "LIGHT" });
      call("SplashScreen", "hide", { fadeOutDuration: 200 });
      await lockIfNeeded();
      if (await pushOn()) enablePush(false); // refresh the token (it can change after updates)
      syncNativeHealth().catch(() => {});
      const net = await call<{ connected: boolean }>("Network", "getStatus");
      if (net) setOffline(!net.connected);
    })();

    // Back from Withings / Oura / WHOOP sign-in, or a NEYU link opened on the phone.
    listen("App", "appUrlOpen", (e: { url: string }) => { call("Browser", "close"); go(appPath(e.url)); });
    listen("App", "backButton", (e: { canGoBack: boolean }) => { if (e.canGoBack) history.back(); else call("App", "minimizeApp"); });
    listen("App", "appStateChange", async (e: { isActive: boolean }) => {
      if (!e.isActive) {
        bgAt.current = Date.now();
        if (await lockEnabled()) setLocked((l) => (l === "no" ? "cover" : l)); // hide health data in the app switcher
        return;
      }
      const away = bgAt.current ? Date.now() - bgAt.current : 0;
      bgAt.current = null;
      if (away > LOCK_AFTER_MS && (await lockIfNeeded())) { /* asking */ }
      else setLocked((l) => (l === "cover" ? "no" : l));
      syncNativeHealth().catch(() => {});
    });
    // Tapping a notification opens its screen.
    listen("PushNotifications", "pushNotificationActionPerformed", (e: any) => go(safePath(e?.notification?.data?.url)));
    listen("Network", "networkStatusChange", (s: { connected: boolean }) => setOffline(!s.connected));

    // Downloads → share sheet; links to other sites → in-app browser.
    const onClick = async (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || ev.defaultPrevented) return;
      const href = a.getAttribute("href") || "";
      if (/^(tel|mailto|sms):/i.test(href) || href.startsWith("#")) return;
      let u: URL; try { u = new URL(href, location.href); } catch { return; }
      if (u.origin === location.origin) {
        if (!DOWNLOAD.some((r) => r.test(u.pathname + u.search)) && !a.hasAttribute("download")) return;
        ev.preventDefault();
        try {
          const r = await fetch(u.href, { credentials: "same-origin" });
          if (!r.ok) throw new Error();
          const shown = await nativeShare(await r.blob(), fileNameFrom(r, a.getAttribute("download") || "NEYU file"));
          if (!shown) location.assign(u.href);
        } catch { location.assign(u.href); }
        return;
      }
      if (/^https?:$/.test(u.protocol)) { ev.preventDefault(); call("Browser", "open", { url: u.href, presentationStyle: "popover" }); }
    };
    document.addEventListener("click", onClick, true);
    return () => { subs.forEach((s) => s.remove()); document.removeEventListener("click", onClick, true); };
  }, [lockIfNeeded]);

  if (!on) return null;
  const signOut = async () => {
    await nativeBeforeSignOut();
    try { await fetch("/api/portal/auth/sign-out", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch {}
    setLocked("no");
    location.assign("/my-health/sign-in");
  };
  return (
    <>
      {offline && (
        <div role="status" data-testid="native-offline" style={{ position: "fixed", left: 12, right: 12, top: "calc(8px + env(safe-area-inset-top))", zIndex: 400, padding: "10px 14px", borderRadius: 12, background: "#14181B", color: "#fff", fontSize: 14, textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
          You're offline. NEYU will update when you're back online.
        </div>
      )}
      {locked !== "no" && (
        <div data-testid="native-lock" role="dialog" aria-modal="true" aria-label="NEYU is locked" style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F7F6F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "24px 24px calc(24px + env(safe-area-inset-bottom))", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
          <NeyuLogo height={40} />
          {locked === "ask" && <>
            <p style={{ margin: 0, fontSize: 16, color: "#5B6369", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>NEYU is locked to keep your health information private.</p>
            <button onClick={tryUnlock} style={{ height: 52, padding: "0 28px", borderRadius: 16, border: "none", background: "#14181B", color: "#fff", fontSize: 16, cursor: "pointer" }}>Unlock with {label}</button>
            <button onClick={signOut} style={{ height: 44, padding: "0 16px", border: "none", background: "none", color: "#1B6F8A", fontSize: 15, cursor: "pointer" }}>Sign out</button>
          </>}
        </div>
      )}
    </>
  );
}
