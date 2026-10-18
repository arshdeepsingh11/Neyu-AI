"use client";

// Sheets for the Health Universe: connect guide (every device), file import,
// manual readings, home BP entry, brief location, share link, family invite,
// challenges.

import React, { useRef, useState } from "react";
import type { DeviceDTO, HeartDTO, SettingsDTO, ShareLinkDTO, FamilyDTO, ChallengeDTO } from "@/lib/portal/types";
import { PLACES, nearestPlace } from "@/lib/portal/places";
import { CHALLENGE_METRICS } from "@/lib/portal/universe";
import { appleHealthParser, parseCsv, type ImportResult } from "@/lib/portal/importParsers";
import { METRIC_DEFS } from "@/lib/portal/metrics";
import { usePortal } from "./context";
import { EP, api, prime, invalidate, load, useResource } from "./api";
import { C, Switch, Loading, btnPrimary, btnOutline, btnLink } from "./ui";
import { NIcon } from "@/components/neyu/icons";
import { isNative, call } from "@/lib/native/bridge";
import { nativeHealthProvider, connectNativeHealth, healthName } from "@/lib/native/health";

const input: React.CSSProperties = { width: "100%", height: 46, padding: "0 12px", borderRadius: 12, border: `1px solid ${C.line12}`, background: C.card, fontSize: 16, color: C.ink, boxSizing: "border-box" };
const lab: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: C.ink2 };
const H = ({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) => (<><h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 500 }}>{children}</h2>{sub && <p style={{ margin: "0 0 18px", fontSize: 14.5, lineHeight: 1.55, color: C.muted }}>{sub}</p>}</>);
const refreshAll = () => { invalidate(EP.today, EP.trends, EP.brief, EP.heart, EP.lifestyle, EP.rewards); [EP.today, EP.brief].forEach((u) => load(u, true).catch(() => {})); };
function Err({ msg }: { msg: string | null }) { return msg ? <p role="alert" style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 10, background: C.peach, color: C.peachInk, fontSize: 14 }}>{msg}</p> : null; }

// ── Connect guide (every device card opens this first) ─────────────────
export function ConnectSheet({ id }: { id: string }) {
  const { openSheet, toast } = usePortal();
  const { data } = useResource<DeviceDTO[]>(EP.devices);
  const [busy, setBusy] = useState(false);
  const d = data?.find((x) => x.id === id);
  if (!d) return <Loading />;
  const waiting = d.status === "waitlist";
  // In the NEYU app: Apple Health / Health Connect read directly on the phone.
  const native = nativeHealthProvider(d.id);
  const appOnly = d.mode === "app" && !native; // Health Connect on the website → "Notify me"
  const primary = async () => {
    setBusy(true);
    try {
      if (native) {
        const r = await connectNativeHealth(native);
        prime(EP.devices, await api<DeviceDTO[]>(EP.devices)); refreshAll();
        toast(r.stored ? `${healthName()} connected · ${r.stored} readings` : `${healthName()} connected. Data appears once your phone has some.`);
        openSheet({ t: "manage", id: native });
        return;
      }
      // Withings / Oura / WHOOP from the app: sign in in the phone's browser, then back to the app.
      if (d.mode === "oauth" && d.available && isNative()) {
        const r = await api<{ url: string }>(`/api/portal/oauth/${d.id}/handoff`, { body: {} });
        await call("Browser", "open", { url: r.url, presentationStyle: "popover" });
        openSheet(null);
        return;
      }
      const r = await api<{ token?: string; redirect?: string; waitlist?: boolean; devices: DeviceDTO[] }>(EP.devices, { body: { provider: d.id } });
      prime(EP.devices, r.devices);
      if (r.redirect) { window.location.href = r.redirect; return; }
      if (r.waitlist) { toast(`We'll let you know when ${d.name} opens`); openSheet(null); return; }
      openSheet({ t: "manage", id: d.id, token: r.token });
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const label = native ? `Connect ${healthName()}` : d.mode === "shortcut" ? "Connect" : d.mode === "oauth" && d.available ? `Connect with ${d.name}` : waiting ? "You're on the list" : "Notify me";
  const steps = native === "iphone" ? ["Tap Connect Apple Health.", "Apple Health asks which data NEYU may read. Turn on what you want to share and tap Allow.", "NEYU reads the last 30 days now, then new days each time you open the app."]
    : native ? d.guide.steps : appOnly ? [d.guide.appSoon || d.guide.steps[0]] : d.mode === "oauth" && !d.available ? ["This connection is being approved with the maker. Tap Notify me and we'll tell you the day it opens."] : d.guide.steps;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal }}><NIcon name={d.icon.replace(/^ph(-fill|-bold)? /, "")} size={24} tone="currentColor" /></span>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{d.name}{d.beta && <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px", borderRadius: 10, background: C.lav, color: C.lavInk, verticalAlign: "middle" }}>Beta</span>}</h2>
          <span style={{ fontSize: 13, color: C.muted }}>{native ? `Reads ${healthName()} on this phone` : d.mode === "oauth" ? (d.available ? "One-time sign-in · syncs every day" : "Opening soon") : d.mode === "shortcut" ? "Daily sync through Apple Health" : d.mode === "app" ? "In the NEYU Android app" : "Coming soon"}</span></div>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.55, color: C.ink2 }}>{d.blurb}</p>
      <section style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>You need</div>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.5 }}>{native === "iphone" ? "This iPhone with the Health app (built in). An Apple Watch adds heart rate variability and blood oxygen." : d.guide.needs}</p>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>How it works</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14.5, lineHeight: 1.5, color: C.ink2 }}>
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        {d.guide.note && !native && <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted }}>{d.guide.note}</p>}
      </section>
      {d.guide.meanwhile && !native && (
        <section style={{ padding: 14, borderRadius: 14, background: C.lav, marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
          <b style={{ fontWeight: 500, color: C.lavInk }}>{d.available && d.mode !== "waitlist" && !appOnly ? "Another way" : "Meanwhile"}</b><br />{d.guide.meanwhile}
        </section>
      )}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Shares</div>
      <p style={{ margin: "0 0 18px", fontSize: 14.5, color: C.ink3 }}>{d.signals.join(" · ")}</p>
      <button onClick={primary} disabled={busy || waiting} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48, opacity: waiting ? 0.55 : 1 }}>{busy ? "One moment…" : label}</button>
      <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted, display: "flex", gap: 6 }}><NIcon name="ph-lock-simple" size="1em" tone="currentColor" style={{marginTop: 2}} />You choose what's shared and can disconnect any time. Wellness data, not a diagnosis.</p>
    </>
  );
}

// ── Import a file ───────────────────────────────────────────────────────
const NAMES: Record<string, string> = { ...Object.fromEntries(Object.entries(METRIC_DEFS).map(([k, v]) => [k, v.name])), bp: "Blood pressure" };
export function ImportSheet() {
  const { toast, openSheet } = usePortal();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ phase: "idle" | "reading" | "ready" | "uploading" | "done"; pct: number; res?: ImportResult; name?: string; stored?: number }>({ phase: "idle", pct: 0 });
  const [err, setErr] = useState<string | null>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setErr(null); setState({ phase: "reading", pct: 0, name: f.name });
    try {
      let res: ImportResult;
      if (/\.csv$|\.txt$/i.test(f.name)) res = parseCsv(await f.text());
      else if (/\.xml$/i.test(f.name)) {
        const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
        const p = appleHealthParser(since);
        const reader = f.stream().pipeThrough(new TextDecoderStream()).getReader();
        let done = 0;
        for (;;) { const { value, done: end } = await reader.read(); if (end) break; p.push(value); done += value.length; setState((s) => ({ ...s, pct: Math.min(99, Math.round((done / f.size) * 100)) })); }
        res = p.finish();
        if (!res.readings.length && !res.bp.length) throw new Error("No health data from the last year was found in this file.");
      } else if (/\.zip$/i.test(f.name)) throw new Error("Please unzip the export first (tap it in the Files app), then choose export.xml inside the apple_health_export folder.");
      else throw new Error("Choose an Apple Health export.xml or a .csv file.");
      setState({ phase: "ready", pct: 100, res, name: f.name });
    } catch (e: any) { setErr(e.message); setState({ phase: "idle", pct: 0 }); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const upload = async () => {
    const res = state.res!;
    setState((s) => ({ ...s, phase: "uploading", pct: 0 }));
    try {
      let stored = 0;
      const R = res.readings, B = res.bp, n = Math.max(1, Math.ceil(R.length / 2000), Math.ceil(B.length / 1500));
      for (let i = 0; i < n; i++) {
        const r = await api<{ stored: number }>("/api/portal/import", { body: { readings: R.slice(i * 2000, (i + 1) * 2000), bp: B.slice(i * 1500, (i + 1) * 1500) } }).catch((e) => { if (/couldn't find/.test(e.message)) return { stored: 0 }; throw e; });
        stored += r.stored; setState((s) => ({ ...s, pct: Math.round(((i + 1) / n) * 100) }));
      }
      setState((s) => ({ ...s, phase: "done", stored })); refreshAll(); toast(`${stored.toLocaleString("en-US")} readings imported`);
    } catch (e: any) { setErr(e.message); setState((s) => ({ ...s, phase: "ready" })); }
  };
  const r = state.res;
  return (
    <>
      <H sub="Bring in past data from a file. It's read on your device — only daily summaries are uploaded.">Import a file</H>
      <Err msg={err} />
      {state.phase === "idle" && (
        <>
          <section style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, marginBottom: 12, fontSize: 14.5, lineHeight: 1.55, color: C.ink2 }}>
            <b style={{ fontWeight: 500, color: C.ink }}>Apple Health (iPhone)</b>
            <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}><li>Health app → your picture (top right) → <b>Export All Health Data</b>.</li><li>Save to Files, tap the zip to unzip it.</li><li>Choose <b>export.xml</b> below. We read the last 12 months.</li></ol>
          </section>
          <section style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, marginBottom: 18, fontSize: 14.5, lineHeight: 1.55, color: C.ink2 }}>
            <b style={{ fontWeight: 500, color: C.ink }}>CSV (any app or a spreadsheet)</b>
            <p style={{ margin: "6px 0 0" }}>A <code>date</code> column plus any of: <code>steps</code>, <code>weight</code> (or <code>weight_lb</code>), <code>sleepHours</code>, <code>restingHeartRate</code>, <code>hrv</code>, <code>glucose</code>, <code>systolic</code> + <code>diastolic</code>, <code>pulse</code>, <code>time</code>.</p>
          </section>
          <input ref={fileRef} type="file" accept=".xml,.csv,.txt,text/xml,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48 }}>Choose a file</button>
        </>
      )}
      {(state.phase === "reading" || state.phase === "uploading") && (
        <div aria-live="polite" style={{ padding: "20px 0" }}>
          <p style={{ margin: "0 0 10px", fontSize: 15 }}>{state.phase === "reading" ? `Reading ${state.name}…` : "Uploading…"} {state.pct}%</p>
          <div style={{ height: 8, borderRadius: 4, background: "#EAE7E2", overflow: "hidden" }}><div style={{ height: "100%", width: `${state.pct}%`, background: C.teal, transition: "width 200ms" }} /></div>
        </div>
      )}
      {(state.phase === "ready" || state.phase === "done") && r && (
        <>
          <section style={{ padding: 16, borderRadius: 16, background: C.tealWash, marginBottom: 16 }}>
            <p style={{ margin: "0 0 6px", fontSize: 16 }}><b style={{ fontWeight: 500 }}>{r.days.toLocaleString("en-US")} days</b> of data{r.from ? ` · ${r.from} to ${r.to}` : ""}</p>
            <p style={{ margin: 0, fontSize: 14, color: C.ink2 }}>{r.kinds.map((k) => NAMES[k] || k).join(" · ")}{r.bp.length ? ` · ${r.bp.length} blood pressure readings` : ""}</p>
          </section>
          {state.phase === "ready" ? <button onClick={upload} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48 }}>Import to My Health Space</button>
            : <><p style={{ fontSize: 15 }}>Done — {state.stored?.toLocaleString("en-US")} readings added.</p><button onClick={() => openSheet(null)} style={{ ...btnOutline, width: "100%" }}>Close</button></>}
        </>
      )}
    </>
  );
}

// ── Enter a reading (weight, glucose, steps, sleep) ────────────────────
export function ReadingSheet() {
  const { toast, openSheet, tz } = usePortal();
  const [m, setM] = useState<"weight" | "glucose" | "steps" | "sleep">("weight");
  const [unit, setUnit] = useState("kg");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const UNITS: Record<string, string[]> = { weight: ["kg", "lb"], glucose: ["mmol/L", "mg/dL"], steps: ["steps"], sleep: ["hours"] };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await api("/api/portal/readings", { body: { metric: m, value: Number(value), unit: unit === "lb" ? "lb" : unit === "mg/dL" ? "mg" : "", date } }); refreshAll(); toast("Reading saved"); openSheet(null); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save}>
      <H sub="For readings from a scale, glucose meter or anything not connected. Blood pressure has its own screen.">Enter a reading</H>
      <Err msg={err} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(["weight", "glucose", "steps", "sleep"] as const).map((k) => <button type="button" key={k} onClick={() => { setM(k); setUnit(UNITS[k][0]); }} aria-pressed={m === k} style={{ height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${m === k ? "transparent" : C.line12}`, background: m === k ? C.tealChip : "transparent", color: m === k ? C.tealDark : C.ink2, fontSize: 14, cursor: "pointer" }}>{METRIC_DEFS[k].name}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}>
        <label style={lab}>Value<input required inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} style={input} /></label>
        <label style={lab}>Unit<select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...input, width: 120 }}>{UNITS[m].map((u) => <option key={u}>{u}</option>)}</select></label>
      </div>
      <label style={{ ...lab, marginBottom: 18 }}>Date<input type="date" required value={date} max={new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())} onChange={(e) => setDate(e.target.value)} style={input} /></label>
      <button type="submit" disabled={busy || !value} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48, opacity: value ? 1 : 0.5 }}>{busy ? "Saving…" : "Save reading"}</button>
    </form>
  );
}

// ── Home blood pressure entry ───────────────────────────────────────────
export function BpSheet() {
  const { toast, openSheet, tz } = usePortal();
  const [f, setF] = useState({ sys: "", dia: "", pulse: "", note: "", when: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const nowLocal = () => { const d = new Date(); const p = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d); return p.replace(" ", "T"); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      let takenAt: string | undefined;
      if (f.when) { // datetime-local in the patient's timezone → ISO
        const guess = new Date(f.when + ":00Z");
        const offset = new Date(guess.toLocaleString("en-US", { timeZone: tz })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
        takenAt = new Date(guess.getTime() - offset).toISOString();
      }
      const h = await api<HeartDTO>(EP.heart, { body: { sys: Number(f.sys), dia: Number(f.dia), pulse: f.pulse ? Number(f.pulse) : null, note: f.note, takenAt } });
      prime(EP.heart, h); invalidate(EP.brief, EP.today, EP.rewards);
      if (Number(f.sys) >= 180 || Number(f.dia) >= 110) { setUrgent(true); return; }
      toast("Reading saved"); openSheet(null);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (urgent) return (
    <div role="alert">
      <H>This reading is very high</H>
      <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink2 }}>Sit quietly for 5 minutes and measure again. If it's still 180/110 or higher, contact your care team today.</p>
      <p style={{ padding: 14, borderRadius: 14, background: C.peach, color: C.peachInk, fontSize: 15, lineHeight: 1.55 }}><b>Call 911</b> if you also have chest pain, shortness of breath, weakness or numbness, trouble speaking, confusion, vision changes or a severe headache.</p>
      <button onClick={() => openSheet(null)} style={{ ...btnOutline, width: "100%" }}>OK</button>
    </div>
  );
  const num = (k: "sys" | "dia" | "pulse") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) });
  return (
    <form onSubmit={save}>
      <H sub="Seated, rested 5 minutes, arm at heart level. Two readings a minute apart is best — add both.">Add a blood pressure reading</H>
      <Err msg={err} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <label style={lab}>Top (SYS)<input required inputMode="numeric" autoFocus placeholder="120" value={f.sys} onChange={num("sys")} style={{ ...input, fontSize: 22, height: 56 }} /></label>
        <label style={lab}>Bottom (DIA)<input required inputMode="numeric" placeholder="80" value={f.dia} onChange={num("dia")} style={{ ...input, fontSize: 22, height: 56 }} /></label>
        <label style={lab}>Pulse<input inputMode="numeric" placeholder="optional" value={f.pulse} onChange={num("pulse")} style={{ ...input, fontSize: 22, height: 56 }} /></label>
      </div>
      <label style={{ ...lab, marginBottom: 14 }}>When<input type="datetime-local" value={f.when} max={nowLocal()} onChange={(e) => setF({ ...f, when: e.target.value })} style={input} /><span style={{ fontSize: 12.5, color: C.muted }}>Leave empty for right now.</span></label>
      <label style={{ ...lab, marginBottom: 18 }}>Note<input maxLength={140} placeholder="e.g. left arm, after coffee" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={input} /></label>
      <button type="submit" disabled={busy || !f.sys || !f.dia} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48, opacity: f.sys && f.dia ? 1 : 0.5 }}>{busy ? "Saving…" : "Save reading"}</button>
    </form>
  );
}

// ── Location + brief preferences ────────────────────────────────────────
export function LocationSheet() {
  const { toast, openSheet, settings, setSettings } = usePortal();
  const [city, setCity] = useState(settings.city ? `${settings.city}|${settings.province}` : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const save = async (body: Record<string, unknown>, msg: string, close = true) => {
    setErr(null);
    try { const s = await api<SettingsDTO>("/api/portal/preferences", { method: "PATCH", body }); setSettings(s); prime(EP.settings, s); invalidate(EP.brief); load(EP.brief, true).catch(() => {}); toast(msg); if (close) openSheet(null); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const locate = () => {
    if (!navigator.geolocation) { setErr("Location isn't available in this browser — choose your city instead."); return; }
    setBusy("geo");
    navigator.geolocation.getCurrentPosition(
      (p) => { const n = nearestPlace(p.coords.latitude, p.coords.longitude); setCity(`${n.city}|${n.prov}`); save({ lat: p.coords.latitude, lon: p.coords.longitude }, `Location set to ${n.city}`); },
      () => { setBusy(null); setErr("We couldn't get your location. Choose your city instead."); },
      { timeout: 10000, maximumAge: 3600_000 });
  };
  const provs = [...new Set(PLACES.map((p) => p.prov))];
  return (
    <>
      <H sub="Your daily brief uses local weather and air quality from Environment Canada. We only store your city, never your exact position.">Your city</H>
      <Err msg={err} />
      <button onClick={locate} disabled={!!busy} style={{ ...btnOutline, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}><NIcon name="ph-navigation-arrow" size="1em" tone="currentColor" />{busy === "geo" ? "Finding you…" : "Use my location"}</button>
      <label style={{ ...lab, marginBottom: 14 }}>Or choose a city
        <select value={city} onChange={(e) => setCity(e.target.value)} style={input}>
          <option value="">Choose…</option>
          {provs.map((pv) => <optgroup key={pv} label={pv}>{PLACES.filter((p) => p.prov === pv).map((p) => <option key={p.city} value={`${p.city}|${p.prov}`}>{p.city}</option>)}</optgroup>)}
        </select>
      </label>
      <button onClick={() => { const [c, p] = city.split("|"); setBusy("save"); save({ city: c, province: p }, `Location set to ${c}`); }} disabled={!city || !!busy} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48, opacity: city ? 1 : 0.5, marginBottom: 20 }}>Save city</button>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 60, borderTop: `1px solid ${C.line}` }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15 }}>Email me my brief each morning</span><span style={{ fontSize: 13, color: C.muted }}>Sent after 6 AM your time.</span></span>
        <Switch on={settings.briefEmail} onToggle={() => save({ briefEmail: !settings.briefEmail }, settings.briefEmail ? "Brief emails off" : "Brief emails on", false)} label="Email me my brief each morning" />
      </div>
      {settings.city && <button onClick={() => save({ clearLocation: true }, "Location removed")} style={{ ...btnLink, color: C.muted, fontWeight: 400 }}>Remove my city</button>}
      <p style={{ margin: "10px 0 0", fontSize: 12, color: C.faint }}>Data Source: Environment and Climate Change Canada.</p>
    </>
  );
}

// ── Share with my doctor ────────────────────────────────────────────────
export function ShareSheet() {
  const { toast } = usePortal();
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<string[]>(["trends", "bp", "labs"]);
  const [days, setDays] = useState(7);
  const [link, setLink] = useState<ShareLinkDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (s: string) => setScope((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { const r = await api<{ link: ShareLinkDTO; links: ShareLinkDTO[] }>(EP.share, { body: { label: label || "My doctor", scope, days } }); prime(EP.share, r.links); setLink(r.link); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (link?.url) return (
    <>
      <H sub={`Anyone with this link can view it until ${new Date(link.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Send it only to your clinician.`}>Your link is ready</H>
      <div style={{ padding: 14, borderRadius: 14, background: C.card, border: `1px solid ${C.line}`, fontSize: 13.5, wordBreak: "break-all", marginBottom: 12, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{link.url}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigator.clipboard?.writeText(link.url!).then(() => toast("Link copied"), () => {})} className="h-primary" style={{ ...btnPrimary, flex: 1 }}>Copy link</button>
        {typeof navigator !== "undefined" && "share" in navigator && <button onClick={() => (navigator as any).share({ title: "My health summary", url: link.url }).catch(() => {})} style={{ ...btnOutline, flex: 1 }}>Share…</button>}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 13, color: C.muted }}>You can turn it off any time in Family &amp; sharing.</p>
    </>
  );
  const S: [string, string][] = [["trends", "Trends (heart rate, HRV, sleep, activity, weight)"], ["bp", "Home blood pressure log"], ["labs", "Latest lab results"], ["lifestyle", "Check-ins (water, caffeine, alcohol, mood, stress)"]];
  return (
    <form onSubmit={create}>
      <H sub="A read-only summary your clinician can open in any browser — no account needed.">Share with my doctor</H>
      <Err msg={err} />
      <label style={{ ...lab, marginBottom: 14 }}>Who is it for?<input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Dr. Lee, family doctor" style={input} /></label>
      <div style={{ fontSize: 14, color: C.ink2, marginBottom: 4 }}>What they can see</div>
      {S.map(([k, l]) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 52, borderBottom: `1px solid ${C.line}` }}><span style={{ flex: 1, fontSize: 14.5 }}>{l}</span><Switch on={scope.includes(k)} onToggle={() => toggle(k)} label={l} /></div>)}
      <div style={{ fontSize: 14, color: C.ink2, margin: "16px 0 8px" }}>Link works for</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{[1, 7, 30].map((d) => <button type="button" key={d} onClick={() => setDays(d)} aria-pressed={days === d} style={{ flex: 1, height: 40, borderRadius: 12, border: `1px solid ${days === d ? "transparent" : C.line12}`, background: days === d ? C.tealChip : "transparent", color: days === d ? C.tealDark : C.ink2, fontSize: 14, cursor: "pointer" }}>{d === 1 ? "1 day" : `${d} days`}</button>)}</div>
      <button type="submit" disabled={busy || !scope.length} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48, opacity: scope.length ? 1 : 0.5 }}>{busy ? "Creating…" : "Create link"}</button>
    </form>
  );
}

// ── Invite a family member ──────────────────────────────────────────────
export function InviteSheet() {
  const { toast, openSheet } = usePortal();
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("Son / daughter");
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { const r = await api<FamilyDTO & { inviteUrl: string }>(EP.family, { body: { email, relation } }); const { inviteUrl, ...fam } = r; prime(EP.family, fam); setUrl(inviteUrl); toast("Invite sent"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (url) return (
    <>
      <H sub={`We emailed ${email}. They sign in (or create a free account) with that email to accept. You can also send them this link:`}>Invite sent</H>
      <div style={{ padding: 14, borderRadius: 14, background: C.card, border: `1px solid ${C.line}`, fontSize: 13, wordBreak: "break-all", marginBottom: 12 }}>{url}</div>
      <div style={{ display: "flex", gap: 10 }}><button onClick={() => navigator.clipboard?.writeText(url).then(() => toast("Link copied"), () => {})} className="h-primary" style={{ ...btnPrimary, flex: 1 }}>Copy link</button><button onClick={() => openSheet(null)} style={{ ...btnOutline, flex: 1 }}>Done</button></div>
    </>
  );
  return (
    <form onSubmit={send}>
      <H sub="They'll see a read-only summary: daily signals, home blood pressure, protocol and next visit. Not your lab details, history or Neyu chats. You can remove them any time.">Invite a family member</H>
      <Err msg={err} />
      <label style={{ ...lab, marginBottom: 14 }}>Their email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" style={input} /></label>
      <label style={{ ...lab, marginBottom: 20 }}>They are my…<select value={relation} onChange={(e) => setRelation(e.target.value)} style={input}>{["Son / daughter", "Spouse / partner", "Parent", "Sibling", "Caregiver", "Friend"].map((r) => <option key={r}>{r}</option>)}</select></label>
      <button type="submit" disabled={busy || !email} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48 }}>{busy ? "Sending…" : "Send invite"}</button>
    </form>
  );
}

// ── Challenges ──────────────────────────────────────────────────────────
export function ChallengeSheet({ mode }: { mode: "create" | "join" }) {
  const { toast, openSheet } = usePortal();
  const [f, setF] = useState({ name: "", metric: "steps", goal: "8000", days: 14, org: "", code: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const body = mode === "join" ? { action: "join", code: f.code } : { action: "create", name: f.name, metric: f.metric, goal: Number(f.goal), days: f.days, org: f.org };
      const r = await api<{ code?: string; challenges: ChallengeDTO[] }>(EP.challenges, { body });
      prime(EP.challenges, r.challenges);
      if (mode === "join") { toast("You joined the challenge"); openSheet(null); } else setMade(r.code || null);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (made) return (
    <>
      <H sub="Share this code with friends, family or your team. They join from Rewards → Join.">Challenge created</H>
      <div style={{ fontSize: 34, letterSpacing: ".18em", textAlign: "center", padding: 18, borderRadius: 16, background: C.tealWash, color: C.tealDark, marginBottom: 14 }}>{made}</div>
      <button onClick={() => navigator.clipboard?.writeText(`Join my NEYU Health challenge "${f.name}" with code ${made} in My Health Space → Rewards.`).then(() => toast("Invite copied"), () => {})} className="h-primary" style={{ ...btnPrimary, width: "100%" }}>Copy invite message</button>
    </>
  );
  if (mode === "join") return (
    <form onSubmit={submit}>
      <H sub="Enter the 6-letter code you were given. Other members will see your name and totals.">Join a challenge</H>
      <Err msg={err} />
      <input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().slice(0, 8) })} placeholder="K7Q2MX" aria-label="Challenge code" style={{ ...input, fontSize: 24, letterSpacing: ".2em", textAlign: "center", height: 60, marginBottom: 18 }} />
      <button type="submit" disabled={busy || f.code.length < 6} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48 }}>{busy ? "Joining…" : "Join"}</button>
    </form>
  );
  const def = CHALLENGE_METRICS[f.metric];
  return (
    <form onSubmit={submit}>
      <H sub="Anyone with the code can join. Members see names and totals only.">Create a challenge</H>
      <Err msg={err} />
      <label style={{ ...lab, marginBottom: 12 }}>Name<input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. October step-up" style={input} /></label>
      <label style={{ ...lab, marginBottom: 12 }}>Track<select value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value, goal: String(CHALLENGE_METRICS[e.target.value].defaultGoal) })} style={input}>{Object.entries(CHALLENGE_METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      {f.metric !== "protocol" && <label style={{ ...lab, marginBottom: 12 }}>Daily goal ({def.unit})<input required inputMode="numeric" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value.replace(/\D/g, "") })} style={input} /></label>}
      <div style={{ fontSize: 14, color: C.ink2, marginBottom: 8 }}>Length</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{[7, 14, 21, 30].map((d) => <button type="button" key={d} onClick={() => setF({ ...f, days: d })} aria-pressed={f.days === d} style={{ flex: 1, height: 40, borderRadius: 12, border: `1px solid ${f.days === d ? "transparent" : C.line12}`, background: f.days === d ? C.tealChip : "transparent", color: f.days === d ? C.tealDark : C.ink2, fontSize: 14, cursor: "pointer" }}>{d} days</button>)}</div>
      <label style={{ ...lab, marginBottom: 18 }}>Team or company (optional)<input maxLength={60} value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} style={input} /></label>
      <button type="submit" disabled={busy} className="h-primary" style={{ ...btnPrimary, width: "100%", height: 48 }}>{busy ? "Creating…" : "Create challenge"}</button>
    </form>
  );
}
