"use client";

// Bottom sheet (mobile) / centred dialog (desktop): Neyu, protocol step,
// visit preparation, device management + Apple Watch setup, history detail.

import React, { useEffect, useRef, useState } from "react";
import type { AppointmentsDTO, DeviceDTO, HistoryDetailDTO, ProtocolDTO, TrendsDTO } from "@/lib/portal/types";
import { usePortal } from "./context";
import { EP, api, prime, invalidate, load, useResource, peek } from "./api";
import { C, Switch, Loading, longDateTz } from "./ui";
import { toggleProtocol } from "./screens/Protocol";
import { relTime } from "./screens/Devices";
import { ConnectSheet, ImportSheet, ReadingSheet, BpSheet, LocationSheet, ShareSheet, InviteSheet, ChallengeSheet } from "./UniverseSheets";
import { NIcon } from "@/components/neyu/icons";
import { isNative, call, platform } from "@/lib/native/bridge";
import { nativeHealthProvider, nativeConnected, connectNativeHealth, syncNativeHealth, disconnectNativeHealth, openHealthSettings, healthName } from "@/lib/native/health";

const TITLES: Record<string, [string, string]> = { alba: ["Neyu · AI companion", "Ask Neyu"], protocol: ["My Protocol", "Protocol detail"], prepare: ["Appointment", "Prepare for visit"], manage: ["Connected device", "Manage device"], conversation: ["History", "AI conversation"],
  connect: ["Connect", "How to connect"], import: ["Add data", "Import a file"], reading: ["Add data", "Enter a reading"], bp: ["Heart", "Add a blood pressure reading"], location: ["NEYU Today", "Your city"],
  share: ["Share with my doctor", "Create a share link"], invite: ["Family care", "Invite a family member"], challenge: ["Challenges", "Challenge"] };

export default function Sheets() {
  const { sheet, openSheet } = usePortal();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, [sheet?.t]);
  if (!sheet) return null;
  const [eyebrow, title] = TITLES[sheet.t];
  const close = () => openSheet(null);
  return (
    <div className="mhs-sheetwrap" style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "center" }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(29,35,39,.32)", animation: "mhs-fadeIn 240ms ease" }} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="mhs-sheet" style={{ position: "relative", display: "flex", flexDirection: "column", background: C.sheet, outline: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 20px 10px" }}>
          <span style={{ fontSize: 13, color: C.muted }}>{eyebrow}</span>
          <button onClick={close} aria-label="Close" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "#F0EEEA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name="ph-x" size={16} tone="currentColor" /></button>
        </div>
        <div className="mhs-scroll" style={{ padding: "0 22px 24px", flex: 1, minHeight: 0 }}>
          {sheet.t === "alba" && <AlbaSheet ask={sheet.ask} />}
          {sheet.t === "protocol" && <ProtocolSheet id={sheet.id} />}
          {sheet.t === "prepare" && <PrepareSheet />}
          {sheet.t === "manage" && <ManageSheet id={sheet.id} token={sheet.token} />}
          {sheet.t === "conversation" && <ConversationSheet type={sheet.type} id={sheet.id} />}
          {sheet.t === "connect" && <ConnectSheet id={sheet.id} />}
          {sheet.t === "import" && <ImportSheet />}
          {sheet.t === "reading" && <ReadingSheet />}
          {sheet.t === "bp" && <BpSheet />}
          {sheet.t === "location" && <LocationSheet />}
          {sheet.t === "share" && <ShareSheet />}
          {sheet.t === "invite" && <InviteSheet />}
          {sheet.t === "challenge" && <ChallengeSheet mode={sheet.mode} />}
        </div>
      </div>
    </div>
  );
}

// ── Neyu ────────────────────────────────────────────────────────────────
type Msg = { role: "user" | "alba"; text: string; src?: string; action?: string; evidence?: string[] };
// Kept across open/close within the session so the conversation continues.
const albaMem: { msgs: Msg[]; conversationId: string } = { msgs: [], conversationId: "" };

function AlbaSheet({ ask }: { ask?: string }) {
  const { tab, go, openSheet, profile } = usePortal();
  const appts = peek<AppointmentsDTO>(EP.appointments);
  const [msgs, setMsgs] = useState<Msg[]>(albaMem.msgs);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const clinician = appts?.upcoming[0]?.clinician || profile.careTeam[0]?.name;
  // "Ask Neyu about me": questions that fit this patient's actual data.
  const sug = useResource<{ suggestions: string[] }>("/api/portal/neyu/suggest").data?.suggestions;
  const prompts = sug?.length ? sug : ["What has changed recently?", "What don't we know about my health?", clinician ? `What should I ask ${clinician}?` : "What should I discuss with my doctor?"];
  const [whyOpen, setWhyOpen] = useState<number | null>(null);

  const push = (m: Msg) => setMsgs((cur) => { const n = [...cur, m]; albaMem.msgs = n; return n; });
  const send = async (q: string) => {
    q = q.trim();
    if (!q || busyRef.current) return;
    busyRef.current = true; setBusy(true); setInput("");
    push({ role: "user", text: q });
    try {
      const r = await api<{ conversationId: string; text: string; src?: string; action?: string; evidence?: string[] }>("/api/portal/alba", { body: { message: q, conversationId: albaMem.conversationId || undefined } });
      albaMem.conversationId = r.conversationId;
      push({ role: "alba", text: r.text, src: r.src, action: r.action, evidence: r.evidence });
      invalidate(EP.history);
    } catch (e: any) {
      push({ role: "alba", text: e.status === 429 ? e.message : "I can help with your trends, sleep, results or preparing for your visit. For anything about symptoms or treatment, your care team is the right place to start." });
    } finally { busyRef.current = false; setBusy(false); }
  };
  useEffect(() => { if (ask && !albaMem.msgs.length) send(ask); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [msgs.length, busy]);

  const actions: Record<string, [string, string, () => void]> = {
    trends: ["Explore my trends", C.lavMid, () => { openSheet(null); tab("trends"); }],
    sleep: ["View sleep trend", C.lavMid, () => { openSheet(null); go("trend", { k: "sleep" }); }],
    prepare: ["Prepare for your visit", C.lavMid, () => openSheet({ t: "prepare" })],
    emergency: ["Call 911", C.peachInk, () => { window.location.href = "tel:911"; }],
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ width: 36, height: 36, borderRadius: 18, background: C.lav, color: C.lavMid, display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name="ph-sparkle" size={19} tone="currentColor" /></span><h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Ask Neyu</h2></div>
      <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: C.muted }}>Neyu explains your data using the sources you've allowed. It doesn't diagnose or replace your care team. <a href="/ai-notice" target="_blank" rel="noopener" style={{ color: C.teal }}>How Neyu works</a></p>
      {msgs.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Ask Neyu about you</span>
          {prompts.map((p) => <button key={p} onClick={() => send(p)} className="h-albacard" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", border: "1px solid rgba(42,132,228,.22)", borderRadius: 14, background: C.card, cursor: "pointer", textAlign: "left", fontSize: 15 }}>“{p}”</button>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-live="polite">
        {msgs.map((m, i) => {
          const u = m.role === "user", a = m.action ? actions[m.action] : undefined;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: u ? "flex-end" : "flex-start", gap: 8, animation: "mhs-fadeUp 300ms ease" }}>
              <div style={{ maxWidth: "92%", padding: u ? "10px 14px" : "2px 0 2px 14px", borderRadius: 16, background: u ? "#F0EEEA" : "transparent", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", borderLeft: u ? "none" : `2px solid ${m.action === "emergency" ? "#C8826A" : "#C9BBE0"}` }}>{m.text}</div>
              {(m.src || m.evidence?.length) && (
                <div style={{ paddingLeft: 14 }}>
                  {m.src && <span style={{ display: "block", fontSize: 12, color: C.lavInk }}>{m.src}</span>}
                  {!!m.evidence?.length && <button onClick={() => setWhyOpen(whyOpen === i ? null : i)} aria-expanded={whyOpen === i} style={{ padding: 0, marginTop: 2, border: "none", background: "none", fontSize: 12.5, fontWeight: 500, color: C.lavInk, cursor: "pointer" }}>{whyOpen === i ? "Hide evidence" : "Why this answer?"}</button>}
                  {whyOpen === i && <ul style={{ margin: "6px 0 0", padding: "10px 12px 10px 26px", borderRadius: 10, background: "#F6F4F1", fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>{m.evidence!.map((e) => <li key={e}>{e}</li>)}</ul>}
                </div>
              )}
              {a && <button onClick={a[2]} style={{ marginLeft: 14, height: 40, padding: "0 16px", border: "none", borderRadius: 10, background: a[1], color: C.card, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{a[0]}</button>}
            </div>
          );
        })}
        {busy && <div style={{ display: "flex", gap: 5, padding: "8px 14px" }}>{[0, 0.2, 0.4].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: 3, background: C.lavMid, animation: `mhs-pulse 1s ${d}s infinite` }} />)}</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder="Ask about your health data" aria-label="Ask Neyu" style={{ flex: 1, minWidth: 0, height: 46, padding: "0 14px", border: `1px solid ${C.line12}`, borderRadius: 12, background: C.card, fontSize: 15, outlineColor: C.lavMid }} />
        <button type="submit" aria-label="Send" disabled={busy} style={{ width: 46, height: 46, border: "none", borderRadius: 12, background: C.lavMid, color: C.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name="ph-arrow-up" size={18} tone="currentColor" /></button>
      </form>
      <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.5, color: C.peachInk, display: "flex", gap: 6 }}><NIcon name="ph-first-aid" size={14} tone="currentColor" style={{marginTop: 1}} />For chest pain, severe shortness of breath or any emergency, call 911. Neyu can't help in an emergency.</p>
    </>
  );
}

// ── Protocol step ───────────────────────────────────────────────────────
function ProtocolSheet({ id }: { id: string }) {
  const { toast } = usePortal();
  const { data } = useResource<ProtocolDTO>(EP.protocol);
  const q = data?.items.find((x) => x.id === id);
  if (!q) return <Loading />;
  const d = q.doneToday;
  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>{q.title}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: C.muted }}>{q.dose} · {q.slot}{q.timeOfDay ? ` · ${q.timeOfDay}` : ""}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {q.sections.map((x) => <div key={x.h}><h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500 }}>{x.h}</h3><p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: C.ink2 }}>{x.t}</p></div>)}
      </div>
      {q.guidance && <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: C.tealWash, fontSize: 14, lineHeight: 1.55 }}><span style={{ fontWeight: 500 }}>Provider guidance</span><br />{q.guidance}</div>}
      <p style={{ margin: "14px 0 18px", fontSize: 13, color: C.muted }}>Source: {q.source}</p>
      <button onClick={() => toggleProtocol(q.id, !d, toast)} style={{ width: "100%", height: 48, border: "none", borderRadius: 12, background: d ? C.tealChip : C.teal, color: d ? C.tealDark : C.card, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{d ? "Completed today · Undo" : "Mark as done"}</button>
    </>
  );
}

// ── Prepare for visit ───────────────────────────────────────────────────
function PrepareSheet() {
  const { tz, toast, openSheet } = usePortal();
  const { data } = useResource<AppointmentsDTO>(EP.appointments);
  const trends = peek<TrendsDTO>(EP.trends);
  const next = data?.upcoming[0];
  const [share, setShare] = useState(() => ({ trends: next?.prep.shareTrends ?? true, results: next?.prep.shareResults ?? true, symptom: next?.prep.shareSymptoms ?? true }));
  const [qIn, setQIn] = useState("");
  const [saving, setSaving] = useState(false);
  if (!data) return <Loading />;

  const who = next?.clinician || "your care team";
  const src = trends ? [...new Set(Object.values(trends.sources))].join(", ") : "";
  const toggles = [
    ...(data.prepSources.trends ? [{ k: "trends" as const, label: "30-day heart and sleep trends", sub: src ? `From ${src}` : "From your connected devices" }] : []),
    ...(data.prepSources.results ? [{ k: "results" as const, label: "Recent results", sub: data.prepSources.results }] : []),
    ...(data.prepSources.symptom ? [{ k: "symptom" as const, label: data.prepSources.symptom.label, sub: data.prepSources.symptom.sub }] : []),
  ];
  const refresh = (a: AppointmentsDTO) => prime(EP.appointments, a);
  const addQ = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = qIn.trim(); if (!t) return;
    setQIn("");
    try { await api("/api/portal/questions", { body: { text: t } }); refresh(await load<AppointmentsDTO>(EP.appointments, true)); } catch (err: any) { toast(err.message); }
  };
  const removeQ = async (id: string) => {
    refresh({ ...data, questions: data.questions.filter((q) => q.id !== id) });
    try { await api(`/api/portal/questions?id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch (err: any) { toast(err.message); load(EP.appointments, true).catch(() => {}); }
  };
  const save = async () => {
    if (!next) { openSheet(null); toast("Saved. Your questions will be ready for your next visit."); return; }
    setSaving(true);
    try {
      refresh(await api<AppointmentsDTO>(`/api/portal/appointments/${next.id}`, { body: { action: "prep", shareTrends: share.trends, shareResults: share.results, shareSymptoms: share.symptom } }));
      openSheet(null); toast(`Saved. ${who} will see this before your visit.`);
    } catch (err: any) { toast(err.message); } finally { setSaving(false); }
  };

  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>Prepare for your visit</h2>
      <p style={{ margin: "0 0 22px", fontSize: 15, color: C.muted }}>
        {next ? `${next.title} · ${next.clinician} · ${longDateTz(next.startsAt, tz, { month: "short", day: "numeric" })}, ${longDateTz(next.startsAt, tz, { hour: "numeric", minute: "2-digit" })}` : "No visit is booked yet. Your questions will be kept for your next appointment."}
      </p>
      {next && toggles.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>Share with {who}</h3>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
            {toggles.map((t) => (
              <div key={t.k} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 56, borderBottom: `1px solid ${C.line}` }}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: 15 }}>{t.label}</span><span style={{ fontSize: 13, color: C.muted }}>{t.sub}</span></span>
                <Switch on={share[t.k]} onToggle={() => setShare({ ...share, [t.k]: !share[t.k] })} label={t.label} />
              </div>
            ))}
          </div>
        </>
      )}
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>Questions to ask</h3>
      <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {data.questions.map((q) => (
          <li key={q.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, background: "#F3F1EE", fontSize: 15, lineHeight: 1.45, animation: "mhs-fadeUp 260ms ease" }}>
            <NIcon name="ph-chat-circle" size={16} tone={C.teal} style={{marginTop: 2}} /><span style={{ flex: 1, overflowWrap: "anywhere" }}>{q.text}</span>
            <button onClick={() => removeQ(q.id)} aria-label="Remove question" style={{ border: "none", background: "none", cursor: "pointer", color: C.faint, padding: "0 2px" }}><NIcon name="ph-x" size="1em" tone="currentColor" /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={addQ} style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <input value={qIn} onChange={(e) => setQIn(e.target.value)} maxLength={300} placeholder="Add a question" aria-label="Add a question" style={{ flex: 1, minWidth: 0, height: 44, padding: "0 14px", border: `1px solid ${C.line12}`, borderRadius: 12, background: C.card, fontSize: 15 }} />
        <button type="submit" style={{ height: 44, padding: "0 16px", border: "none", borderRadius: 12, background: C.tealChip, color: C.tealDark, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Add</button>
      </form>
      <button onClick={save} disabled={saving} style={{ width: "100%", height: 48, border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{saving ? "Saving…" : "Save preparation"}</button>
    </>
  );
}

// ── Manage device (+ Apple Watch setup via iPhone Shortcuts) ─────────────
function Copy({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, background: "#F0EEEA", fontSize: 13, overflowWrap: "anywhere", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{value}</code>
        <button onClick={() => { navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }} style={{ height: 38, padding: "0 12px", border: `1px solid ${C.line12}`, borderRadius: 10, background: C.card, fontSize: 13, cursor: "pointer", flex: "none" }}>{ok ? "Copied" : "Copy"}</button>
      </div>
    </div>
  );
}

// Scan-to-connect: the computer shows a one-time QR; the phone page does the rest.
function QrPair({ id, onPaired }: { id: string; onPaired: () => void }) {
  const { toast } = usePortal();
  const [pair, setPair] = useState<{ url: string; qrSvg: string; expiresAt: string; local: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const paired = useRef(onPaired); paired.current = onPaired;
  const make = async () => {
    setBusy(true);
    try { setPair(await api(`${EP.devices}/pair`, { body: { provider: id } })); }
    catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!pair) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(pair.expiresAt).getTime() - Date.now()) / 1000)));
    tick(); const t = setInterval(tick, 1000);
    const poll = setInterval(() => paired.current(), 4000); // refresh device status while the phone sets up
    return () => { clearInterval(t); clearInterval(poll); };
  }, [pair]);
  if (!pair) return (
    <button onClick={make} disabled={busy} style={{ width: "100%", minHeight: 52, border: "none", borderRadius: 14, background: C.teal, color: C.card, fontSize: 15.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: busy ? 0.6 : 1 }}>
      <NIcon name="ph-qr-code" size={22} tone="currentColor" />{busy ? "Making your code…" : "Connect with a QR code"}
    </button>
  );
  const expired = left === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,170px) 1fr", gap: 16, alignItems: "center", padding: 14, borderRadius: 16, background: "#F6F4F0" }}>
      <div aria-label="QR code to connect your iPhone" role="img" style={{ background: "#fff", borderRadius: 12, padding: 8, opacity: expired ? 0.2 : 1, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: pair.qrSvg }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, lineHeight: 1.5, color: C.ink2 }}>
        <b style={{ fontWeight: 500, fontSize: 15, color: C.ink }}>Scan with your iPhone camera</b>
        <span>Open the link, then follow the 4 short steps on your phone. This page updates when data arrives.</span>
        {expired ? <button onClick={make} style={{ alignSelf: "flex-start", height: 36, padding: "0 12px", border: `1px solid ${C.line12}`, borderRadius: 10, background: C.card, fontSize: 13.5, cursor: "pointer" }}>Make a new code</button>
          : <span style={{ fontSize: 12.5, color: C.muted }}>Code works once · expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>}
        {pair.local && <span style={{ fontSize: 12.5, color: C.peachInk }}>Test mode: your iPhone must be on the same Wi-Fi as this computer ({new URL(pair.url).host}).</span>}
      </div>
    </div>
  );
}

// What the phone last sent — so "no data" always has a reason.
function SyncLog({ d }: { d: DeviceDTO }) {
  const r = d.lastResult;
  if (!d.lastAttemptAt) return d.status === "on" ? null : (
    <p style={{ margin: 0, fontSize: 13.5, color: C.muted, display: "flex", gap: 8 }}><NIcon name="ph-info" size="1em" tone="currentColor" style={{marginTop: 2}} />Your iPhone hasn’t reached NEYU yet. If the shortcut ran, check it used your sync link and that this computer was on.</p>
  );
  const ok = !!r?.stored;
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: ok ? "#EAF4EE" : C.peach, fontSize: 13.5, lineHeight: 1.5, color: ok ? "#2E5D47" : C.peachInk, display: "flex", flexDirection: "column", gap: 2 }}>
      <b style={{ fontWeight: 500 }}>Last sync attempt · {relTime(d.lastAttemptAt)}</b>
      {ok ? <span>Stored {r!.stored} reading{r!.stored === 1 ? "" : "s"}{r!.metrics.length ? ` (${r!.metrics.join(", ")})` : ""}.</span>
        : <span>Nothing stored. {r?.rejected?.length ? r.rejected.slice(0, 3).map((x) => `${x.field}: ${x.reason}`).join(" · ") : "Apple Health had no samples for today yet."}</span>}
    </div>
  );
}

const SHORTCUT_KEYS: Record<string, string> = {
  apple: "restingHeartRate, heartRateVariability, sleepHours, steps, activeMinutes, oxygenSaturation",
  iphone: "steps, walkingDistance (km), activeMinutes, sleepHours, weight (kg), bloodPressure (\"120/80\"), bloodGlucose (mmol/L)",
};
function ManageSheet({ id, token: initialToken }: { id: string; token?: string }) {
  const { toast, openSheet } = usePortal();
  const { data, reload } = useResource<DeviceDTO[]>(EP.devices);
  const [token, setToken] = useState(initialToken);
  const [showSetup, setShowSetup] = useState(!!initialToken);
  const [syncing, setSyncing] = useState(false);
  // NEYU app: this card reads Apple Health / Health Connect on this phone.
  const native = nativeHealthProvider(id) === id ? (id as "iphone" | "android") : null;
  const [here, setHere] = useState(false); // connected on THIS phone
  useEffect(() => { if (native) nativeConnected(native).then(setHere); }, [native]);
  // New data arrived from the phone while this sheet is open → refresh the rest.
  const lastSync = data?.find((x) => x.id === id)?.lastSyncAt ?? null;
  const seenSync = useRef(lastSync);
  useEffect(() => {
    if (lastSync && lastSync !== seenSync.current) { seenSync.current = lastSync; invalidate(EP.today, EP.trends, EP.brief); toast("NEYU received new data from your iPhone"); }
  }, [lastSync, toast]);
  const d = data?.find((x) => x.id === id);
  if (!d) return <Loading />;
  const on = d.status === "on", shortcut = d.mode === "shortcut" && !native;
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/wearables/ingest` : "/api/wearables/ingest";

  const setTypes = async (label: string) => {
    const next = d.dataTypes.includes(label) ? d.dataTypes.filter((x) => x !== label) : [...d.dataTypes, label];
    prime(EP.devices, data!.map((x) => (x.id === id ? { ...x, dataTypes: next } : x)));
    try { prime(EP.devices, await api<DeviceDTO[]>(EP.devices, { method: "PATCH", body: { provider: id, dataTypes: next } })); } catch (e: any) { toast(e.message); reload(); }
  };
  const newToken = async () => {
    try { const r = await api<{ token: string; devices: DeviceDTO[] }>(EP.devices, { body: { provider: id } }); prime(EP.devices, r.devices); setToken(r.token); setShowSetup(true); }
    catch (e: any) { toast(e.message); }
  };
  const reconnect = async () => {
    if (isNative()) {
      try { const r = await api<{ url: string }>(`/api/portal/oauth/${id}/handoff`, { body: {} }); await call("Browser", "open", { url: r.url, presentationStyle: "popover" }); openSheet(null); }
      catch (e: any) { toast(e.message); }
      return;
    }
    window.location.href = `/api/portal/oauth/${id}/start`;
  };
  const connectHere = async () => {
    setSyncing(true);
    try { const r = await connectNativeHealth(native!); setHere(true); prime(EP.devices, await api<DeviceDTO[]>(EP.devices)); invalidate(EP.today, EP.trends, EP.brief, EP.heart); toast(r.stored ? `Connected · ${r.stored} readings` : "Connected"); }
    catch (e: any) { toast(e.message); } finally { setSyncing(false); }
  };
  const sync = async () => {
    if (native && here) {
      setSyncing(true);
      try { const r = await syncNativeHealth({ days: 7, force: true }); prime(EP.devices, await api<DeviceDTO[]>(EP.devices)); await Promise.all([load(EP.today, true), load(EP.brief, true)].map((p) => p.catch(() => {}))); invalidate(EP.trends, EP.heart); toast(r.stored ? `Updated · ${r.stored} readings` : "Up to date"); }
      catch (e: any) { toast(e.message); } finally { setSyncing(false); }
      return;
    }
    if (d.mode === "oauth") {
      setSyncing(true);
      try { const r = await api<{ stored: number; devices: DeviceDTO[] }>("/api/portal/devices/sync", { body: { provider: id } }); prime(EP.devices, r.devices); await Promise.all([load(EP.today, true), load(EP.brief, true)].map((p) => p.catch(() => {}))); invalidate(EP.trends, EP.heart); toast(r.stored ? `Updated · ${r.stored} readings` : "Up to date"); }
      catch (e: any) { toast(e.message); } finally { setSyncing(false); }
      return;
    }
    openSheet(null);
    await Promise.all([reload(), load(EP.today, true), load(EP.trends, true)].map((p) => p?.catch(() => {})));
    toast(d.mode === "app" ? "Open the NEYU app on your Android phone to send new data" : on ? "Updated just now" : "Run your NEYU Sync shortcut on your iPhone to send data");
  };
  const disconnect = async () => {
    if (native) await disconnectNativeHealth();
    try { prime(EP.devices, await api<DeviceDTO[]>(`${EP.devices}?provider=${id}`, { method: "DELETE" })); invalidate(EP.today, EP.trends, EP.brief); openSheet(null); toast(`${d.name} disconnected`); }
    catch (e: any) { toast(e.message); }
  };

  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>{d.name}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: on ? C.tealDark : C.muted, display: "flex", alignItems: "center", gap: 6 }}>
        <NIcon name={on ? "ph-check-circle" : "ph-hourglass-medium"} size="1em" tone="currentColor" />{on ? `Connected · Last data ${relTime(d.lastSyncAt)}` : d.lastAttemptAt ? "Phone reached NEYU · no data stored yet" : "Waiting for your first sync"}
      </p>
      {d.lastError && <p role="alert" style={{ margin: "-8px 0 18px", padding: "10px 12px", borderRadius: 10, background: C.peach, color: C.peachInk, fontSize: 14 }}>{d.lastError}</p>}

      {shortcut && (showSetup || !on) && (
        <section style={{ marginBottom: 24, padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Set up {d.name} sync</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.ink2 }}>{id === "apple" ? "Your watch saves to Apple Health on your iPhone." : "Your iPhone keeps your steps, walking and sleep in Apple Health."} A private Shortcut sends a daily summary from Apple Health to My Health Space.</p>
          <QrPair id={id} onPaired={reload} />
          <SyncLog d={d} />
          <details style={{ fontSize: 14, color: C.ink2 }}>
          <summary style={{ cursor: "pointer", color: C.teal, minHeight: 32, display: "flex", alignItems: "center" }}>Set up by hand instead</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
          {token ? (
            <>
              <Copy label="Your private sync token — shown once. Keep it secret." value={token} />
              <Copy label="Send data to" value={endpoint} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: C.ink2 }}>
              <span>{d.tokenHint ? `Your sync token ends in …${d.tokenHint}. For security it can't be shown again.` : "No sync token yet."}</span>
              <button onClick={newToken} style={{ alignSelf: "flex-start", height: 38, padding: "0 14px", border: `1px solid ${C.line12}`, borderRadius: 10, background: "none", fontSize: 14, cursor: "pointer" }}>Create a new sync token</button>
            </div>
          )}
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14, lineHeight: 1.55, color: C.ink2 }}>
            <li>On your iPhone, open <b>Shortcuts</b> → <b>Automation</b> → <b>New Automation</b> → <b>Time of Day</b> (for example 8:00 AM, daily, Run Immediately).</li>
            <li>Add <b>Find Health Samples</b> actions for the data you want (latest value, or total for today).</li>
            <li>Add <b>Get Contents of URL</b>: the address above, Method <b>POST</b>, Header <code>Authorization</code> = <code>Bearer</code> + your token, Request Body <b>JSON</b> with keys: <code>{SHORTCUT_KEYS[id] || SHORTCUT_KEYS.apple}</code>.</li>
            <li>Tap run once. This page shows <b>Connected</b> after the first successful sync.</li>
          </ol>
          </div>
          </details>
        </section>
      )}

      {native && !here && (
        <section style={{ marginBottom: 22, padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.ink2 }}>Read {healthName()} straight from this phone. NEYU sends new days each time you open the app.</p>
          <button onClick={connectHere} disabled={syncing} style={{ height: 46, border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, cursor: "pointer" }}>{syncing ? "Connecting…" : `Connect ${healthName()} on this phone`}</button>
        </section>
      )}
      {native && here && (
        <p style={{ margin: "-6px 0 18px", fontSize: 13.5, lineHeight: 1.5, color: C.muted }}>
          Reading {healthName()} on this phone. {platform() === "android" ? <button onClick={openHealthSettings} style={{ padding: 0, border: "none", background: "none", color: C.teal, fontSize: 13.5, cursor: "pointer" }}>Change what NEYU may read</button> : "To change what NEYU may read: Settings → Health → Data Access & Devices → NEYU."}
        </p>
      )}
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>Data shared with My Health Space</h3>
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
        {d.signals.map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 52, borderBottom: `1px solid ${C.line}` }}>
            <span style={{ flex: 1, fontSize: 15 }}>{s}</span>
            <Switch on={d.dataTypes.includes(s)} onToggle={() => setTypes(s)} label={s} />
          </div>
        ))}
      </div>
      {shortcut && on && !showSetup && <div style={{ marginBottom: 12 }}><SyncLog d={d} /></div>}
      {shortcut && on && !showSetup && <button onClick={() => setShowSetup(true)} style={{ width: "100%", height: 46, border: "none", borderRadius: 12, background: "none", fontSize: 15, color: C.teal, cursor: "pointer", marginBottom: 6 }}>Sync setup</button>}
      {d.lastError && d.mode === "oauth" && <button onClick={reconnect} style={{ width: "100%", height: 46, border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>Reconnect {d.name}</button>}
      {(!native || here) && <button onClick={sync} disabled={syncing} style={{ width: "100%", height: 46, border: `1px solid ${C.line12}`, borderRadius: 12, background: "none", fontSize: 15, cursor: "pointer", marginBottom: 10 }}>{syncing ? "Syncing…" : "Sync now"}</button>}
      <button onClick={disconnect} style={{ width: "100%", height: 46, border: "1px solid rgba(139,75,55,.25)", borderRadius: 12, background: "none", color: C.peachInk, fontSize: 15, cursor: "pointer" }}>Disconnect {d.name}</button>
      <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted }}>Disconnecting stops new data. Data already in My Health Space stays until you delete it in Privacy &amp; Data.</p>
    </>
  );
}

// ── History detail (symptom check, Neyu conversation, assessment…) ──────
function ConversationSheet({ type, id }: { type: string; id: string }) {
  const { data, error, reload } = useResource<HistoryDetailDTO>(`/api/portal/history/detail?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  if (!data) return <Loading error={error} retry={reload} />;
  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>{data.title}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted }}>{data.dateLabel}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {data.sections.map((x) => <div key={x.h}><h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500 }}>{x.h}</h3><p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: C.ink2, whiteSpace: "pre-wrap" }}>{x.t}</p></div>)}
        {data.messages?.map((m, i) => {
          const u = m.role === "user";
          return <div key={i} style={{ alignSelf: u ? "flex-end" : "flex-start", maxWidth: "92%", padding: u ? "10px 14px" : "2px 0 2px 14px", borderRadius: 16, background: u ? "#F0EEEA" : "transparent", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", borderLeft: u ? "none" : "2px solid #C9BBE0" }}>{m.text}</div>;
        })}
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{data.note}</p>
      </div>
    </>
  );
}
