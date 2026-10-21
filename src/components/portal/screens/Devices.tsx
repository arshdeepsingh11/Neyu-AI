"use client";

import { nativeHealthProvider } from "@/lib/native/health";
import React, { useEffect } from "react";
import type { DeviceDTO, TodayDTO } from "@/lib/portal/types";
import { usePortal } from "../context";
import { EP, invalidate, useResource } from "../api";
import { C, screenAnim, Loading } from "../ui";
import { NIcon } from "@/components/neyu/icons";

export const relTime = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
};

export default function Devices() {
  const { go, openSheet, toast } = usePortal();
  const { data, error, reload } = useResource<DeviceDTO[]>(EP.devices);
  const today = useResource<TodayDTO>(EP.today).data;

  // Back from a one-time sign-in (?connected=oura / ?oauth=failed)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("connected"), o = q.get("oauth");
    if (!c && !o) return;
    if (c) { toast("Connected — your data is on its way"); reload(); invalidate(EP.today, EP.trends, EP.brief, EP.heart); }
    else toast(o === "cancelled" ? "Connection cancelled" : o === "unavailable" ? "That connection isn't open yet" : "We couldn't finish connecting. Please try again.");
    ["connected", "oauth", "p"].forEach((k) => q.delete(k));
    window.history.replaceState(window.history.state, "", window.location.pathname + (q.toString() ? "?" + q : ""));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Loading error={error} retry={reload} />;
  const connected = data.filter((d) => d.status === "on" || d.status === "pending").length;

  return (
    <div style={{ ...screenAnim, maxWidth: 980 }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>Connect your health data</h1>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: C.muted }}>Connect once — NEYU brings in your data every day. Tap any card to see how.</p>
      {!today?.hasWearable && connected === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", padding: 28, borderRadius: 24, background: "linear-gradient(165deg,#EAF3F4 0%,#FFFDFB 70%)", marginBottom: 24 }}>
          <div style={{ position: "relative", width: 96, height: 96, flex: "none" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(110,168,182,.35)" }} />
            <span style={{ position: "absolute", inset: 16, borderRadius: "50%", border: "1px solid rgba(110,168,182,.55)" }} />
            <span style={{ position: "absolute", inset: 34, borderRadius: "50%", background: C.tealLight, animation: "mhs-pulse 2.4s ease-in-out infinite" }} />
          </div>
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>No watch? Start with your phone.</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.muted }}>Your iPhone already counts steps and walking, and keeps sleep and readings from the Health app. Connect it once and your daily brief starts tomorrow.</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button onClick={() => openSheet({ t: "connect", id: "iphone" })} style={{ alignSelf: "flex-start", height: 40, padding: "0 16px", border: "none", borderRadius: 10, background: C.teal, color: C.card, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Connect iPhone</button>
              <button onClick={() => go("today")} style={{ alignSelf: "flex-start", height: 40, padding: 0, border: "none", background: "none", fontSize: 14, color: C.teal, cursor: "pointer" }}>I'll do this later</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 16 }}>
        {data.map((d) => {
          const on = d.status === "on", pending = d.status === "pending", wait = d.status === "waitlist";
          const soon = d.mode === "waitlist" || (d.mode === "oauth" && !d.available) || (d.mode === "app" && !nativeHealthProvider(d.id)); // Health Connect: NEYU app only
          const statusText = on ? (d.lastError ? d.lastError : d.stale ? `Last synced ${relTime(d.lastSyncAt)} — check your sync` : `Connected · Last synced ${relTime(d.lastSyncAt)}`)
            : pending ? "Waiting for your first sync…" : wait ? "You're on the list" : soon ? (d.mode === "app" ? "In the NEYU Android app" : "Coming soon") : d.mode === "oauth" ? "One-time sign-in" : "Not connected";
          const warn = on && (d.stale || !!d.lastError);
          const action = on || pending ? (pending ? "Finish setup" : "Manage") : wait ? "How it works" : soon ? "Notify me" : "Connect";
          return (
            <article key={d.id} style={{ padding: 20, borderRadius: 20, background: C.card, border: `1px solid ${on ? (warn ? "rgba(139,75,55,.3)" : "rgba(110,168,182,.45)") : C.line}`, display: "flex", flexDirection: "column", gap: 12, transition: "border-color 300ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EEEA", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink3, flex: "none" }}><NIcon name={d.icon} size={21} tone="currentColor" /></span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{d.name}{d.beta && <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 7px", borderRadius: 9, background: C.lav, color: C.lavInk, verticalAlign: "middle" }}>Beta</span>}</span>
                  <span style={{ fontSize: 13, color: warn ? C.peachInk : on ? C.tealDark : C.muted, display: "flex", alignItems: "center", gap: 5 }}><NIcon name={warn ? "ph-warning" : on ? "ph-check-circle" : pending ? "ph-hourglass-medium" : wait ? "ph-bell-ringing" : "ph-plugs"} size={14} tone="currentColor" style={{flex: "none"}} />{statusText}</span>
                </div>
              </div>
              {pending && <div style={{ height: 3, borderRadius: 2, background: "#EAE7E2", overflow: "hidden" }}><div style={{ height: "100%", width: "40%", background: C.tealLight, animation: "mhs-pulse 1.4s ease-in-out infinite" }} /></div>}
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.ink3 }}>{on ? d.signals.filter((s) => d.dataTypes.includes(s)).join(" · ") : d.blurb}</p>
              <button onClick={() => openSheet(on || pending ? { t: "manage", id: d.id } : { t: "connect", id: d.id })} className={action === "Connect" ? "h-primary" : "h-ghost"}
                style={{ marginTop: "auto", alignSelf: "flex-start", height: 40, padding: "0 16px", border: action === "Connect" ? "none" : `1px solid ${C.line12}`, borderRadius: 10, background: action === "Connect" ? C.teal : "none", color: action === "Connect" ? C.card : C.ink, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{action}</button>
            </article>
          );
        })}
      </div>

      <h2 style={{ margin: "32px 0 12px", fontSize: 20, fontWeight: 500 }}>Other ways to add data</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 16 }}>
        {[
          { icon: "ph ph-heartbeat", title: "Home blood pressure", text: "Any cuff works. Type in each reading — NEYU tracks your averages against the home target.", cta: "Add a reading", run: () => openSheet({ t: "bp" }) },
          { icon: "ph ph-file-arrow-up", title: "Import a file", text: "Apple Health export (a year of history at once) or a CSV from any app or spreadsheet.", cta: "Import", run: () => openSheet({ t: "import" }) },
          { icon: "ph ph-scales", title: "Enter a reading", text: "Weight, blood glucose, steps or sleep from anything that isn't connected.", cta: "Enter", run: () => openSheet({ t: "reading" }) },
        ].map((x) => (
          <article key={x.title} style={{ padding: 20, borderRadius: 20, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal }}><NIcon name={x.icon} size={21} tone="currentColor" /></span><span style={{ fontSize: 16, fontWeight: 500 }}>{x.title}</span></div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.ink3 }}>{x.text}</p>
            <button onClick={x.run} className="h-ghost" style={{ marginTop: "auto", alignSelf: "flex-start", height: 40, padding: "0 16px", border: `1px solid ${C.line12}`, borderRadius: 10, background: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{x.cta}</button>
          </article>
        ))}
      </div>
      <p style={{ margin: "24px 0 0", fontSize: 14, lineHeight: 1.5, color: C.muted, display: "flex", gap: 8 }}><NIcon name="ph-lock-simple" size={16} tone="currentColor" style={{marginTop: 2}} /><span>You choose what each source shares, and you can disconnect at any time. <a href="#" onClick={(e) => { e.preventDefault(); go("privacy"); }}>Manage data access</a></span></p>
    </div>
  );
}
