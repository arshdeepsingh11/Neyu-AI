"use client";
// NEYU phone app only (Phase 6): notifications on this phone and the Face ID / fingerprint lock.
// Both render nothing on the website.
import React, { useEffect, useState } from "react";
import { isNative } from "@/lib/native/bridge";
import { appCanPush, enablePush, disablePush, pushOn, pushPermission } from "@/lib/native/push";
import { biometryLabel, lockEnabled, setLockEnabled, unlock } from "@/lib/native/lock";
import { usePortal } from "./context";
import { api } from "./api";
import { C, Switch } from "./ui";

const box: React.CSSProperties = { marginTop: 20, padding: "6px 16px", borderRadius: 18, background: C.card };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "8px 0" };

export function PhoneNotifications() {
  const { toast } = usePortal();
  const [ready, setReady] = useState(false), [on, setOn] = useState(false), [denied, setDenied] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isNative() || !appCanPush()) return;
    (async () => { setOn(await pushOn()); setDenied((await pushPermission()) === "denied"); setReady(true); })();
  }, []);
  if (!ready) return null;
  const toggle = async () => {
    setBusy(true);
    try {
      if (on) { await disablePush(); setOn(false); toast("Notifications off on this phone"); }
      else {
        const ok = await enablePush(true);
        setOn(ok);
        if (!ok) { setDenied((await pushPermission()) === "denied"); toast("Notifications are off for NEYU in your phone's Settings"); }
        else toast("Notifications on");
      }
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const test = async () => {
    try { await api("/api/portal/push/test", { body: {} }); toast("Test sent — it arrives in a few seconds"); } catch (e: any) { toast(e.message); }
  };
  return (
    <section data-testid="phone-notifications" style={box}>
      <div style={row}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15 }}>Notifications on this phone</span>
          <span style={{ fontSize: 13, color: C.muted }}>{denied && !on ? "Turned off in your phone's Settings → NEYU → Notifications" : "Daily summary and reminders. No health details on the lock screen."}</span>
        </span>
        <Switch on={on} onToggle={toggle} disabled={busy} label="Notifications on this phone" />
      </div>
      {on && <button onClick={test} style={{ margin: "0 0 10px", height: 38, padding: "0 14px", border: `1px solid ${C.line12}`, borderRadius: 10, background: "none", fontSize: 14, cursor: "pointer" }}>Send a test notification</button>}
    </section>
  );
}

export function PhoneLock() {
  const { toast } = usePortal();
  const [label, setLabel] = useState<string | null>(null), [on, setOn] = useState(false);
  useEffect(() => {
    if (!isNative()) return;
    (async () => { setLabel(await biometryLabel()); setOn(await lockEnabled()); })();
  }, []);
  if (!label) return null;
  const toggle = async () => {
    if (!(await unlock(on ? `Turn off ${label} lock` : `Turn on ${label} lock`))) return; // confirm it's the owner
    await setLockEnabled(!on); setOn(!on);
    toast(on ? `${label} lock off` : `NEYU now asks for ${label} when opened`);
  };
  return (
    <section data-testid="phone-lock" style={{ ...box, marginTop: 0, marginBottom: 20, border: `1px solid ${C.line}` }}>
      <div style={row}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15 }}>Lock with {label}</span>
          <span style={{ fontSize: 13, color: C.muted }}>Asks when NEYU opens and after 2 minutes away.</span>
        </span>
        <Switch on={on} onToggle={toggle} label={`Lock with ${label}`} />
      </div>
    </section>
  );
}
