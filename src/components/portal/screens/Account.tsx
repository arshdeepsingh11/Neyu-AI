"use client";

// More (mobile hub), Health Profile (photo, details, goals, password,
// sign out), Privacy & Data, and Notifications.

import { isNativeApp, getAppHome, setAppHome, type AppHome } from "@/lib/appMode";
import React, { useEffect, useRef, useState } from "react";
import type { AppointmentsDTO, DeviceDTO, ProfileDTO, SettingsDTO } from "@/lib/portal/types";
import { usePortal } from "../context";
import { EP, api, prime, invalidate, useResource, announceSession } from "../api";
import { C, screenAnim, ToggleList, Avatar, longDateTz } from "../ui";
import { setHistoryFilter } from "./History";
import PasswordStrength from "../PasswordStrength";
import { NIcon } from "@/components/neyu/icons";

const ALL_DATA = [EP.today, EP.trends, EP.results, EP.protocol, EP.history, EP.appointments, EP.referrals];

function useCounts() {
  const devices = useResource<DeviceDTO[]>(EP.devices).data;
  const appts = useResource<AppointmentsDTO>(EP.appointments).data;
  const { profile, tz } = usePortal();
  const connected = devices ? devices.filter((d) => d.status === "on").length : profile.connectedDevices;
  const next = appts?.upcoming[0];
  return { connected, nextLabel: next ? longDateTz(next.startsAt, tz, { month: "short", day: "numeric" }) : "" };
}

// ── More ────────────────────────────────────────────────────────────────
export function More() {
  const { go, openSheet, profile, initials } = usePortal();
  const { connected, nextLabel } = useCounts();
  type Item = { label: string; icon: string; go: () => void; meta?: string; color?: string };
  const groups: { title: string; items: Item[] }[] = [
    { title: "Your Health", items: [
      { label: "History", icon: "ph-clock-counter-clockwise", go: () => go("history") },
      { label: "Appointments", icon: "ph-calendar-blank", go: () => go("appointments"), meta: nextLabel },
      { label: "Referrals", icon: "ph-arrows-split", go: () => go("referrals") },
      { label: "Connected Devices", icon: "ph-watch", go: () => go("devices"), meta: `${connected} connected` },
      { label: "Health Profile", icon: "ph-user-circle", go: () => go("profile") },
    ] },
    { title: "Intelligence", items: [
      { label: "Ask Neyu", icon: "ph-sparkle", go: () => openSheet({ t: "alba" }), color: C.lavMid },
      { label: "Past AI Conversations", icon: "ph-chats-circle", go: () => { setHistoryFilter("ai"); go("history"); }, color: C.lavMid },
    ] },
    { title: "Account", items: [
      { label: "Privacy & Data", icon: "ph-lock-simple", go: () => go("privacy") },
      { label: "Notifications", icon: "ph-bell", go: () => go("settings") },
      { label: "Settings", icon: "ph-gear-six", go: () => go("profile") },
    ] },
  ];
  return (
    <div style={{ ...screenAnim, maxWidth: 640 }}>
      <button onClick={() => go("profile")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 16, marginBottom: 24, border: "none", borderRadius: 20, background: C.card, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 2px rgba(29,35,39,.04)" }}>
        <Avatar size={52} photoUrl={profile.photoUrl} initials={initials[0] || "?"} fontSize={20} />
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 18, fontWeight: 500 }}>{profile.firstName} {profile.lastName}</span><span style={{ fontSize: 14, color: C.muted }}>Health profile</span></span>
        <NIcon name="ph-caret-right" size="1em" tone={C.faint} />
      </button>
      {groups.map((g) => (
        <section key={g.title} style={{ marginBottom: 22 }}>
          <h2 style={{ margin: "0 0 6px 4px", fontSize: 13, fontWeight: 500, color: C.muted }}>{g.title}</h2>
          <div style={{ borderRadius: 18, background: C.card, overflow: "hidden" }}>
            {g.items.map((m, i) => (
              <button key={m.label} onClick={m.go} className="h-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 52, padding: "0 16px", border: "none", borderTop: i ? `1px solid ${C.line}` : "none", background: "none", cursor: "pointer", textAlign: "left", fontSize: 16 }}>
                <NIcon name={m.icon} size={20} tone={m.color || C.teal} /><span style={{ flex: 1 }}>{m.label}</span><span style={{ fontSize: 13, color: C.muted }}>{m.meta}</span><NIcon name="ph-caret-right" size="1em" tone={C.faint} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Photo helper: square-crop + resize to 512px JPEG in the browser ─────
async function toJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("That image couldn't be read.")); i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight), size = Math.min(512, s);
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    cv.getContext("2d")!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
    return await new Promise<Blob>((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error("That image couldn't be processed."))), "image/jpeg", 0.86));
  } finally { URL.revokeObjectURL(url); }
}

const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.muted };
const saveBtn: React.CSSProperties = { height: 44, padding: "0 18px", border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, fontWeight: 500, cursor: "pointer" };

// ── Profile ─────────────────────────────────────────────────────────────
export function Profile() {
  const { go, profile, setProfile, initials, toast, openSheet, settings } = usePortal();
  const { connected } = useCounts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [goals, setGoals] = useState(profile.goals);
  const [goalIn, setGoalIn] = useState("");
  const [det, setDet] = useState({ firstName: profile.firstName, lastName: profile.lastName, dateOfBirth: profile.dateOfBirth || "", phone: profile.phone || "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setPhotoBusy(true);
    try {
      const blob = await toJpeg(f);
      const r = await api<{ photoUrl: string }>("/api/portal/avatar", { method: "PUT", raw: blob, headers: { "Content-Type": "image/jpeg" } });
      setProfile({ ...profile, photoUrl: r.photoUrl }); announceSession(); toast("Photo updated");
    } catch (e: any) { toast(e.message); } finally { setPhotoBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const removePhoto = async () => {
    try { await api("/api/portal/avatar", { method: "DELETE" }); setProfile({ ...profile, photoUrl: null }); announceSession(); toast("Photo removed"); } catch (e: any) { toast(e.message); }
  };
  const saveGoals = async () => {
    setBusy("goals");
    try { const r = await api<{ goals: string[] }>("/api/portal/goals", { method: "PUT", body: { goals } }); setProfile({ ...profile, goals: r.goals }); setGoals(r.goals); setEditGoals(false); toast("Goals saved"); }
    catch (e: any) { toast(e.message); } finally { setBusy(null); }
  };
  const addGoal = (e: React.FormEvent) => { e.preventDefault(); const g = goalIn.trim(); if (g && goals.length < 8 && !goals.includes(g)) setGoals([...goals, g]); setGoalIn(""); };
  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("det");
    try { const p = await api<ProfileDTO>(EP.me, { method: "PATCH", body: det }); setProfile(p); prime(EP.me, p); announceSession(); invalidate(EP.today); toast("Details saved"); }
    catch (e: any) { toast(e.message); } finally { setBusy(null); }
  };
  const savePw = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy("pw");
    try { await api("/api/portal/password", { body: pw }); setPw({ current: "", next: "" }); toast("Password changed. Other devices were signed out."); }
    catch (e: any) { toast(e.message); } finally { setBusy(null); }
  };
  const signOut = async () => {
    setBusy("out");
    try { await api("/api/portal/auth/sign-out", { body: {} }); } catch {}
    announceSession(); window.location.href = "/";
  };

  const rows = [
    { label: "Connected devices", meta: `${connected} connected`, go: () => go("devices") },
    { label: "Data permissions", meta: "You control every source", go: () => go("privacy") },
    { label: "Daily brief", meta: settings.city ? `${settings.city}${settings.briefEmail ? " · emailed each morning" : ""}` : "Add your city", go: () => openSheet({ t: "location" }) },
    { label: "Family & sharing", meta: "Family care and doctor links", go: () => go("family") },
    { label: "Preferences", meta: "Notifications", go: () => go("settings") },
  ];

  return (
    <div style={{ ...screenAnim, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
        <button onClick={() => fileRef.current?.click()} aria-label="Change profile photo" disabled={photoBusy} style={{ position: "relative", padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: 36, opacity: photoBusy ? 0.6 : 1 }}>
          <Avatar size={72} photoUrl={profile.photoUrl} initials={initials[0] || "?"} fontSize={28} />
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, background: C.card, boxShadow: "0 1px 4px rgba(29,35,39,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: C.teal }}><NIcon name="ph-camera" size={14} tone="currentColor" /></span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: "-.02em" }}>{profile.firstName} {profile.lastName}</h1>
          <span style={{ fontSize: 15, color: C.muted }}>{profile.age != null ? `${profile.age} · ` : ""}Member since {profile.memberSince}</span>
          {profile.photoUrl && <button onClick={removePhoto} style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "none", fontSize: 13, color: C.teal, cursor: "pointer" }}>Remove photo</button>}
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>What you're working toward</h2>
          {!editGoals && <button onClick={() => { setGoals(profile.goals); setEditGoals(true); }} style={{ padding: 0, border: "none", background: "none", fontSize: 14, fontWeight: 500, color: C.teal, cursor: "pointer" }}>{profile.goals.length ? "Edit" : "Add goals"}</button>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(editGoals ? goals : profile.goals).map((g) => (
            <span key={g} style={{ height: 36, display: "flex", alignItems: "center", gap: 6, padding: editGoals ? "0 8px 0 14px" : "0 14px", borderRadius: 18, background: C.tealWash, color: C.tealDark, fontSize: 14 }}>
              {g}{editGoals && <button onClick={() => setGoals(goals.filter((x) => x !== g))} aria-label={`Remove ${g}`} style={{ width: 24, height: 24, border: "none", background: "none", cursor: "pointer", color: C.tealDark, display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name="ph-x" size="1em" tone="currentColor" /></button>}
            </span>
          ))}
          {!editGoals && !profile.goals.length && <span style={{ fontSize: 14, color: C.muted }}>Add what matters to you — your care team sees these too.</span>}
        </div>
        {editGoals && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <form onSubmit={addGoal} style={{ display: "flex", gap: 8 }}>
              <input className="mhs-in" value={goalIn} onChange={(e) => setGoalIn(e.target.value)} maxLength={60} placeholder="e.g. Steadier sleep" aria-label="Add a goal" style={{ flex: 1, height: 44 }} />
              <button type="submit" style={{ height: 44, padding: "0 16px", border: "none", borderRadius: 12, background: C.tealChip, color: C.tealDark, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Add</button>
            </form>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveGoals} disabled={busy === "goals"} style={saveBtn}>Save goals</button>
              <button onClick={() => setEditGoals(false)} style={{ height: 44, padding: "0 16px", border: "none", background: "none", fontSize: 15, color: C.teal, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 500 }}>Your care team</h2>
        {profile.careTeam.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 }}>
            {profile.careTeam.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}` }}>
                <span style={{ width: 40, height: 40, borderRadius: 20, background: C.lav, color: C.lavInk, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, flex: "none" }}>{c.init}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: 15 }}>{c.name}</span><span style={{ fontSize: 13, color: C.muted }}>{c.role}</span></span>
              </div>
            ))}
          </div>
        ) : <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Your NEYU care team will appear here after your first visit.</p>}
      </section>

      <section style={{ borderRadius: 18, background: C.card, overflow: "hidden", marginBottom: 28 }}>
        {rows.map((m, i) => (
          <button key={m.label} onClick={m.go} className="h-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 56, padding: "0 16px", border: "none", borderTop: i ? `1px solid ${C.line}` : "none", background: "none", cursor: "pointer", textAlign: "left", fontSize: 15 }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}><span>{m.label}</span><span style={{ fontSize: 13, color: C.muted }}>{m.meta}</span></span><NIcon name="ph-caret-right" size="1em" tone={C.faint} />
          </button>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 500 }}>Personal details</h2>
        <form onSubmit={saveDetails} style={{ padding: 20, borderRadius: 18, background: C.card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14 }}>
          <label style={label}>First name<input className="mhs-in" value={det.firstName} onChange={(e) => setDet({ ...det, firstName: e.target.value })} maxLength={60} required autoComplete="given-name" /></label>
          <label style={label}>Last name<input className="mhs-in" value={det.lastName} onChange={(e) => setDet({ ...det, lastName: e.target.value })} maxLength={60} required autoComplete="family-name" /></label>
          <label style={label}>Date of birth<input className="mhs-in" type="date" value={det.dateOfBirth} onChange={(e) => setDet({ ...det, dateOfBirth: e.target.value })} max={new Date().toISOString().slice(0, 10)} autoComplete="bday" /></label>
          <label style={label}>Phone<input className="mhs-in" type="tel" value={det.phone} onChange={(e) => setDet({ ...det, phone: e.target.value })} maxLength={30} autoComplete="tel" /></label>
          <label style={label}>Email<input className="mhs-in" value={profile.email} disabled /></label>
          <div style={{ display: "flex", alignItems: "flex-end" }}><button type="submit" disabled={busy === "det"} style={saveBtn}>{busy === "det" ? "Saving…" : "Save details"}</button></div>
        </form>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 500 }}>Password</h2>
        <form onSubmit={savePw} style={{ padding: 20, borderRadius: 18, background: C.card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14 }}>
          <label style={label}>Current password<input className="mhs-in" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></label>
          <label style={label}>New password<input className="mhs-in" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={10} autoComplete="new-password" /></label>
          <div style={{ gridColumn: "1 / -1" }}><PasswordStrength password={pw.next} email={profile.email} /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}><button type="submit" disabled={busy === "pw"} style={saveBtn}>{busy === "pw" ? "Saving…" : "Change password"}</button></div>
        </form>
      </section>

      <AppHomeSetting />
      <button onClick={signOut} disabled={busy === "out"} className="h-danger" style={{ width: "100%", height: 48, border: "1px solid rgba(139,75,55,.25)", borderRadius: 12, background: "none", color: C.peachInk, fontSize: 15, cursor: "pointer", marginBottom: 16 }}>Sign out</button>
      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>My Health Space shows information from your connected sources and NEYU. It doesn't replace advice from your care team.</p>
    </div>
  );
}

// ── Settings toggles (shared by Privacy + Notifications) ────────────────
function useSettingToggle() {
  const { settings, setSettings, toast } = usePortal();
  return (key: keyof SettingsDTO, invalidates = false) => async () => {
    const prev = settings, next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      const s = await api<SettingsDTO>(EP.settings, { method: "PATCH", body: { [key]: next[key] } });
      setSettings(s); prime(EP.settings, s);
      if (invalidates) invalidate(...ALL_DATA);
    } catch (e: any) { setSettings(prev); toast(e.message); }
  };
}

const FAQ: [string, string][] = [
  ["Connected devices", "Devices share only the data types you allow. You can change or disconnect them at any time from Connected Devices."],
  ["Data sharing", "Your care team sees data you choose to share, for example when preparing for a visit. NEYU does not sell your health data."],
  ["AI usage", "Neyu reads your data only when you ask it something and only from sources you allow. Conversations are saved to your history so you and your care team can review them."],
  ["Clinical record data", "Results and visit notes come from NEYU and BioAro Labs. They are part of your medical record and are kept according to health privacy law."],
  ["Disconnecting services", "Disconnecting stops new data. You can also delete previously imported wearable data from here."],
];

export function Privacy() {
  const { settings, toast } = usePortal();
  const toggle = useSettingToggle();
  const [open, setOpen] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const del = async () => {
    setDeleting(true);
    try { const r = await api<{ deleted: number }>("/api/portal/wearable-data", { method: "DELETE" }); invalidate(...ALL_DATA); toast(`Deleted ${r.deleted.toLocaleString("en-US")} imported readings`); setConfirmDel(false); }
    catch (e: any) { toast(e.message); } finally { setDeleting(false); }
  };
  return (
    <div style={{ ...screenAnim, maxWidth: 680 }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>Privacy &amp; Data</h1>
      <p style={{ margin: "0 0 24px", fontSize: 16, lineHeight: 1.55, color: C.ink2 }}>Your health data belongs to you. You control which connected sources contribute data to My Health Space.</p>
      <div style={{ marginBottom: 28 }}>
        <ToggleList items={[
          { label: "Apple Watch", sub: "Heart, sleep and activity signals", on: settings.shareWearables, toggle: toggle("shareWearables", true) },
          { label: "BioAro Labs", sub: "Laboratory results", on: settings.shareLabs, toggle: toggle("shareLabs", true) },
          { label: "NEYU clinical records", sub: "Visits, referrals and care plans", on: settings.shareRecords, toggle: toggle("shareRecords", true) },
          { label: "Neyu access", sub: "Let Neyu reference your data when you ask", on: settings.albaAccess, toggle: toggle("albaAccess") },
          { label: "Neyu insights", sub: "Neyu notices meaningful changes in your data and shows them to you, always with the evidence", on: settings.aiInsights !== false, toggle: toggle("aiInsights") },
          { label: "Neyu learns from my use", sub: "Screens you open and how long you stay (never what you type) help Neyu understand what matters to you", on: settings.learnUsage !== false, toggle: toggle("learnUsage") },
        ]} />
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 500 }}>How your data is used</h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {FAQ.map(([q, a], i) => (
          <div key={q} style={{ borderBottom: "1px solid rgba(29,35,39,.07)" }}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 54, border: "none", background: "none", cursor: "pointer", textAlign: "left", fontSize: 15, padding: 0 }}>{q}<NIcon name={open === i ? "ph-minus" : "ph-plus"} size="1em" tone={C.muted} /></button>
            {open === i && <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.6, color: C.ink2, animation: "mhs-fadeUp 240ms ease" }}>{a}</p>}
          </div>
        ))}
      </div>
      <h2 style={{ margin: "32px 0 10px", fontSize: 17, fontWeight: 500 }}>Your data</h2>
      <section style={{ borderRadius: 18, background: C.card, overflow: "hidden" }}>
        <a href="/api/portal/export" className="h-row" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 60, padding: "10px 16px", color: C.ink, textDecoration: "none" }}>
          <NIcon name="ph-download-simple" size={20} tone={C.teal} />
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15 }}>Download a copy of your data</span><span style={{ fontSize: 13, color: C.muted }}>Everything in My Health Space, as a file</span></span>
        </a>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, minHeight: 60, padding: "10px 16px", borderTop: `1px solid ${C.line}` }}>
          <NIcon name="ph-trash" size={20} tone={C.peachInk} />
          <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15 }}>Delete imported wearable data</span><span style={{ fontSize: 13, color: C.muted }}>{confirmDel ? "This can't be undone. Clinic records stay." : "Removes readings from your devices"}</span></span>
          {confirmDel ? (
            <span style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDel(false)} style={{ height: 38, padding: "0 12px", border: "none", background: "none", fontSize: 14, color: C.teal, cursor: "pointer" }}>Cancel</button>
              <button onClick={del} disabled={deleting} style={{ height: 38, padding: "0 14px", border: "none", borderRadius: 10, background: C.peachInk, color: C.card, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{deleting ? "Deleting…" : "Delete"}</button>
            </span>
          ) : <button onClick={() => setConfirmDel(true)} style={{ height: 38, padding: "0 14px", border: "1px solid rgba(139,75,55,.25)", borderRadius: 10, background: "none", color: C.peachInk, fontSize: 14, cursor: "pointer" }}>Delete…</button>}
        </div>
      </section>
    </div>
  );
}

export function Notifications() {
  const { settings } = usePortal();
  const toggle = useSettingToggle();
  return (
    <div style={{ ...screenAnim, maxWidth: 640 }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>Notifications</h1>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: C.muted }}>We'll only reach out when it's useful.</p>
      <ToggleList items={[
        { label: "Daily summary", sub: "Each morning at 8:00 AM", on: settings.notifDaily, toggle: toggle("notifDaily") },
        { label: "Worth knowing", sub: "When a signal moves outside your usual range", on: settings.notifWorth, toggle: toggle("notifWorth") },
        { label: "Protocol reminders", sub: "At the times in your routine", on: settings.notifProtocol, toggle: toggle("notifProtocol") },
        { label: "Appointment reminders", sub: "The day before and morning of", on: settings.notifAppt, toggle: toggle("notifAppt") },
      ]} />
    </div>
  );
}

/** Mobile app only: choose where the app opens. */
function AppHomeSetting() {
  const [native, setNative] = useState(false), [home, setHome] = useState<AppHome>("myhealth");
  useEffect(() => { setNative(isNativeApp()); setHome(getAppHome() || "myhealth"); }, []);
  if (!native) return null;
  const pick = (v: AppHome) => { setHome(v); setAppHome(v); };
  return (
    <section style={{ marginBottom: 20, padding: 18, borderRadius: 18, background: C.card, border: `1px solid ${C.line}` }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500 }}>App opens to</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: C.muted }}>Choose the first screen when you open the NEYU app.</p>
      <div role="radiogroup" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([["myhealth", "My Health Space"], ["website", "NEYU website"]] as [AppHome, string][]).map(([k, l]) => (
          <button key={k} role="radio" aria-checked={home === k} onClick={() => pick(k)} style={{ height: 40, padding: "0 16px", borderRadius: 20, border: `1px solid ${home === k ? "transparent" : C.line12}`, background: home === k ? C.tealChip : "transparent", color: home === k ? C.tealDark : C.ink2, fontSize: 14, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
    </section>
  );
}
