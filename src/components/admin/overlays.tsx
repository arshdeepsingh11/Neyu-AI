"use client";

// Sign-in, session lock, ⌘K search, confirm/reveal/delete/export dialogs and toasts.

import React, { useEffect, useRef, useState } from "react";
import type { SearchDTO, Go } from "@/lib/admin/types";
import { getView, postAction, downloadFile, useAdmin, type ConfirmSpec } from "./context";
import { T } from "./ui";
import { NeyuMark } from "@/components/brand/NeyuLogo";

const btn2 = { height: 42, padding: "0 16px", borderRadius: 12, border: `1px solid ${T.line3}`, background: T.card, fontSize: 14.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", color: T.ink } as React.CSSProperties;
const btnP = { height: 42, padding: "0 18px", borderRadius: 12, border: "none", background: T.teal, color: T.card, fontSize: 14.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties;
const dialog = { width: "100%", background: T.card, borderRadius: 24, boxShadow: T.shadow, padding: 24, display: "flex", flexDirection: "column", animation: "anraPop 240ms cubic-bezier(.2,.8,.2,1)" } as React.CSSProperties;
const Scrim = ({ z = 60, dim = 0.22, children }: { z?: number; dim?: number; children: React.ReactNode }) => <div style={{ position: "fixed", inset: 0, zIndex: z, background: `rgba(29,35,39,${dim})`, display: "grid", placeItems: "center", padding: 16, animation: "anraFade 180ms" }}>{children}</div>;
const input = { height: 46, borderRadius: 12, border: `1px solid ${T.line3}`, background: T.card, padding: "0 14px", fontSize: 15, color: T.ink, outline: "none", width: "100%" } as React.CSSProperties;

// ── Sign-in ──────────────────────────────────────────────────────────────
// Step 1: work email + password. Step 2: 6-digit code from the authenticator app
// (first sign-in: scan the QR code first). Old shared password: step 1 only.
type Setup = { qr: string; secret: string; otpauth: string };
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Couldn't sign in.");
  return j;
};
export function SignIn({ onSignedIn }: { onSignedIn: (actor: string) => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code" | "setup">("password");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { setId(localStorage.getItem("anra_admin_id") || ""); } catch { /* private mode */ } }, []);
  useEffect(() => { if (step !== "password") setTimeout(() => codeRef.current?.focus(), 50); }, [step]);
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return setErr("Enter your work email.");
    if (!pw) return setErr("Enter your password.");
    setBusy(true); setErr("");
    try {
      const j = await post("/api/admin/login", { identifier: id, password: pw });
      try { localStorage.setItem("anra_admin_id", id.trim()); } catch { /* ignore */ }
      setPw("");
      if (j.step === "done") return onSignedIn(j.actor);
      if (j.step === "setup") setSetup({ qr: j.qr, secret: j.secret, otpauth: j.otpauth });
      setStep(j.step); setBusy(false);
    } catch (x: any) { setErr(x.message === "Failed to fetch" ? "Couldn't reach the server. Check your connection." : x.message); setBusy(false); }
  };
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(c)) return setErr("Enter the 6-digit code from your authenticator app.");
    setBusy(true); setErr("");
    try { const j = await post("/api/admin/mfa", { code: c }); setCode(""); onSignedIn(j.actor); }
    catch (x: any) {
      setErr(x.message); setBusy(false); setCode("");
      if (/again\.$/.test(x.message) && /email and password/.test(x.message)) { setStep("password"); setSetup(null); }
    }
  };
  const back = () => { setStep("password"); setSetup(null); setCode(""); setErr(""); };
  const label = { fontSize: 13, fontWeight: 500, color: T.ink2 } as React.CSSProperties;
  const errBox = err && <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", background: T.peach, color: T.peachInk, borderRadius: 12, padding: "10px 12px", fontSize: 14 }}><i className="ph ph-warning-circle" />{err}</div>;
  const primary = (text: string, busyText: string) => <button type="submit" disabled={busy} className="h-primary" style={{ height: 46, borderRadius: 12, border: "none", background: T.teal, color: T.card, fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "background 200ms", opacity: busy ? 0.8 : 1 }}>{busy ? busyText : text}</button>;
  const card = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 22, padding: 28, display: "flex", flexDirection: "column", gap: 18, boxShadow: T.shadow } as React.CSSProperties;
  const codeInput = (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={label}>6-digit code</span>
      <input ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => { setCode(e.target.value.replace(/[^\d ]/g, "")); setErr(""); }} placeholder="123 456" aria-label="6-digit code" className="f-teal" style={{ ...input, fontSize: 22, letterSpacing: "0.3em", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
    </label>
  );
  return (
    <main data-screen-label="01 Sign-in" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: "center", padding: "32px 20px", background: T.page }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 28, animation: "anraPop 320ms cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ width: 44, height: 44, display: "grid", placeItems: "center" }}><NeyuMark size={42} title="NEYU Health" /></div>
          <div><h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: "-0.025em" }}>NEYU Health</h1><div style={{ fontSize: 16, color: T.ink2, marginTop: 2 }}>Admin Console</div></div>
        </div>

        {step === "password" && (
          <form onSubmit={submitPassword} style={card}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={label}>Work email</span>
              <input type="text" autoComplete="username" value={id} onChange={(e) => { setId(e.target.value); setErr(""); }} className="f-teal" style={input} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={label}>Password</span><button type="button" onClick={() => setNote(true)} className="h-line" style={{ background: "none", border: "none", padding: 0, color: T.tealDk, fontSize: 13, cursor: "pointer" }}>Forgot password?</button></span>
              <input type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} className="f-teal" style={input} />
            </label>
            {note && <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.wash, color: T.tealDk, borderRadius: 12, padding: "10px 12px", fontSize: 13.5 }}><i className="ph ph-info" style={{ marginTop: 2 }} />Ask your NEYU super admin to reset your password or 2-step code.</div>}
            {errBox}
            {primary("Continue", "Checking…")}
            <p style={{ margin: 0, fontSize: 13, color: T.faint, lineHeight: 1.5 }}>Next you’ll enter a 6-digit code from your authenticator app. Every sign-in is recorded in the audit log.</p>
          </form>
        )}

        {step === "setup" && setup && (
          <form onSubmit={submitCode} style={card} data-screen-label="01b 2-step setup">
            <div><h2 style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>Turn on your 2-step code</h2><p style={{ margin: "6px 0 0", fontSize: 14, color: T.ink2, lineHeight: 1.5 }}>Open Google Authenticator (or Microsoft Authenticator, 1Password) → <b>+</b> → <b>Scan a QR code</b>.</p></div>
            <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ alignSelf: "center", borderRadius: 12, border: `1px solid ${T.line}`, background: "#fff", padding: 6 }} />
            <details style={{ fontSize: 13.5, color: T.ink2 }}>
              <summary style={{ cursor: "pointer", color: T.tealDk }}>Can’t scan? Type this key instead</summary>
              <code data-testid="mfa-secret" style={{ display: "block", marginTop: 8, padding: "10px 12px", background: T.wash, borderRadius: 10, fontSize: 14, letterSpacing: "0.08em", wordBreak: "break-all", userSelect: "all" }}>{setup.secret.match(/.{1,4}/g)?.join(" ")}</code>
            </details>
            {codeInput}
            {errBox}
            {primary("Turn on and sign in", "Checking…")}
            <button type="button" onClick={back} className="h-line" style={{ border: "none", background: "none", color: T.ink2, fontSize: 13.5, cursor: "pointer" }}>Back</button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={submitCode} style={card} data-screen-label="01b 2-step code">
            <div><h2 style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>Enter your 2-step code</h2><p style={{ margin: "6px 0 0", fontSize: 14, color: T.ink2, lineHeight: 1.5 }}>Open your authenticator app and type the 6-digit code for NEYU Health.</p></div>
            {codeInput}
            {errBox}
            {primary("Sign in", "Checking…")}
            <button type="button" onClick={back} className="h-line" style={{ border: "none", background: "none", color: T.ink2, fontSize: 13.5, cursor: "pointer" }}>Use a different account</button>
          </form>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: T.faint }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i className="ph ph-lock-simple" />Authorized NEYU staff only</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i className="ph ph-map-pin" />Health data stored in Canada</span>
        </div>
      </div>
    </main>
  );
}

// ── Session lock ─────────────────────────────────────────────────────────
export function LockScreen({ actor, minutes, onUnlock, onSignOut }: { actor: string; minutes: number; onUnlock: () => void; onSignOut: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return setErr("Enter your password to continue.");
    setBusy(true);
    try { await postAction({ action: "session.unlock", password: pw }); setPw(""); onUnlock(); }
    catch (x: any) { setErr(x.message); }
    finally { setBusy(false); }
  };
  return (
    <div data-screen-label="28 Session Lock" style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(246,244,241,.94)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", display: "grid", placeItems: "center", padding: 20, animation: "anraFade 300ms" }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="lk-title" style={{ ...dialog, maxWidth: 380, padding: 28, gap: 16, textAlign: "center", animation: "anraPop 300ms cubic-bezier(.2,.8,.2,1)" }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: T.wash, color: T.teal, display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto" }}><i className="ph ph-lock-simple" /></span>
        <div><h2 id="lk-title" style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Your session was locked for security.</h2><p style={{ margin: "6px 0 0", fontSize: 14, color: T.ink2 }}>Locked after {minutes} minutes of inactivity. Patient information is hidden until you sign in again.</p></div>
        <div style={{ fontSize: 13.5, color: T.faint }}>{actor}</div>
        <input type="password" aria-label="Your password" value={pw} autoFocus onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Your password" autoComplete="current-password" className="f-teal" style={{ ...input, textAlign: "left" }} />
        {err && <div role="alert" style={{ fontSize: 13.5, color: T.peachInk }}>{err}</div>}
        <button type="submit" disabled={busy} className="h-primary" style={{ height: 46, borderRadius: 12, border: "none", background: T.teal, color: T.card, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{busy ? "Checking…" : "Continue session"}</button>
        <button type="button" onClick={onSignOut} className="h-line" style={{ border: "none", background: "none", color: T.ink2, fontSize: 13.5, cursor: "pointer" }}>Sign out instead</button>
      </form>
    </div>
  );
}

// ── ⌘K search ───────────────────────────────────────────────────────────
type Item = { key: string; title: string; sub: string; meta: string; av?: string; icon?: string; go: Go };
export function CommandPalette({ onClose, recent }: { onClose: () => void; recent: { title: string; sub: string; icon: string; go: Go | null }[] }) {
  const a = useAdmin();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [res, setRes] = useState<SearchDTO | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => getView<SearchDTO>("search", { q }).then((d) => { if (live) { setRes(d); setIdx(0); } }).catch(() => {}), q ? 160 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  const groups: { label: string; items: Item[] }[] = [];
  if (res) {
    if (res.patients.length) groups.push({ label: "Patients", items: res.patients.map((p) => ({ key: "p" + p.id, title: p.name, sub: p.sub, meta: p.meta, av: p.initials, go: { s: "patient", id: p.id } })) });
    if (res.visitors.length) groups.push({ label: "Visitors", items: res.visitors.map((v) => ({ key: "v" + v.id, title: v.id, sub: v.sub, meta: v.meta, icon: "ph ph-user-circle-dashed", go: { s: "visitor", id: v.id } })) });
    if (res.referrals.length) groups.push({ label: "Referrals", items: res.referrals.map((r) => ({ key: "r" + r.id, title: r.title, sub: r.sub, meta: r.meta, icon: "ph ph-arrow-square-in", go: { ref: r.id } })) });
  }
  if (!q && recent.length) groups.push({ label: "Recent activity", items: recent.slice(0, 3).filter((x) => x.go).map((x, i) => ({ key: "a" + i, title: x.title, sub: x.sub, meta: "", icon: "ph " + x.icon, go: x.go! })) });
  const flat = groups.flatMap((g) => g.items);
  const run = (it: Item) => { onClose(); a.go(it.go); };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && flat.length) { e.preventDefault(); setIdx((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length); }
    if (e.key === "Enter" && flat[idx]) { e.preventDefault(); run(flat[idx]); }
  };
  let n = -1;
  return (
    <div data-screen-label="29 Command Palette" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(29,35,39,.18)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "12vh 16px 16px", animation: "anraFade 180ms" }}>
      <div role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()} onKeyDown={onKey} style={{ width: "100%", maxWidth: 640, background: T.card, borderRadius: 22, boxShadow: `${T.shadow},0 0 0 1px ${T.line}`, overflow: "hidden", animation: "anraPop 240ms cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 18px", height: 58, borderBottom: `1px solid ${T.line}` }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 20, color: T.faint }} />
          <input ref={ref} aria-label="Search patients, visitors, referrals" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients, visitors, referrals..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 17, color: T.ink }} />
          <span style={{ fontSize: 12, color: T.faint, border: "1px solid rgba(29,35,39,.12)", borderRadius: 6, padding: "1px 6px" }}>esc</span>
        </div>
        <div role="listbox" style={{ maxHeight: "52vh", overflowY: "auto", padding: 8 }}>
          {groups.map((g) => (
            <div key={g.label}>
              <div style={{ padding: "10px 10px 4px", fontSize: 12, fontWeight: 500, color: T.faint }}>{g.label}</div>
              {g.items.map((it) => { n++; const i = n; return (
                <button key={it.key} role="option" aria-selected={i === idx} onClick={() => run(it)} onMouseEnter={() => setIdx(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 10px", border: "none", borderRadius: 12, background: i === idx ? T.wash : "transparent", textAlign: "left", cursor: "pointer" }}>
                  {it.av ? <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: T.chip, color: T.tealDk, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>{it.av}</span>
                    : <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, background: T.side, color: T.ink2, display: "grid", placeItems: "center", fontSize: 16 }}><i className={it.icon} /></span>}
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: T.ink }}>{it.title}</span><span style={{ display: "block", fontSize: 12.5, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</span></span>
                  <span style={{ fontSize: 12.5, color: T.ink2 }}>{it.meta}</span>
                </button>
              ); })}
            </div>
          ))}
          {res && flat.length === 0 && <div style={{ padding: 32, textAlign: "center", color: T.ink2 }}>{q ? <>No patients, visitors or referrals match “{q}”.</> : "Nothing here yet."}</div>}
        </div>
        <div style={{ display: "flex", gap: 16, padding: "10px 18px", borderTop: `1px solid ${T.line}`, fontSize: 12, color: T.faint, flexWrap: "wrap" }}><span>↑↓ to move</span><span>↵ to open</span><span>Search by name, email, phone, patient ID, visitor ID or referral ID</span></div>
      </div>
    </div>
  );
}

// ── Confirm ──────────────────────────────────────────────────────────────
export function ConfirmDialog({ c, onClose }: { c: ConfirmSpec; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Scrim z={65}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cf-title" style={{ ...dialog, maxWidth: 440, gap: 14 }}>
        <h2 id="cf-title" style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>{c.title}</h2>
        <p style={{ margin: 0, fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}>{c.body}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} className="h-sand" style={btn2}>Cancel</button>
          <button autoFocus disabled={busy} onClick={async () => { setBusy(true); try { await c.run(); } catch { /* toast shown */ } onClose(); }} className="h-dim" style={{ ...btnP, background: c.danger ? T.peachInk : T.teal, opacity: busy ? 0.75 : 1 }}>{c.label}</button>
        </div>
      </div>
    </Scrim>
  );
}

// ── Reveal sensitive data ────────────────────────────────────────────────
export function RevealDialog({ pname, label, onCancel, onReveal }: { pname: string; label: string; onCancel: () => void; onReveal: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!reason) return setErr("Choose a reason to continue.");
    if (reason === "Other" && !other.trim()) return setErr("Describe the reason for access.");
    setBusy(true);
    try { await onReveal(reason === "Other" ? "Other · " + other.trim() : reason); } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <Scrim>
      <div data-screen-label="26 Reveal Sensitive Data" role="dialog" aria-modal="true" aria-labelledby="rv-title" style={{ ...dialog, maxWidth: 460, gap: 16, animation: "anraPop 260ms cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: T.wash, color: T.teal, display: "grid", placeItems: "center", fontSize: 20, flex: "none" }}><i className="ph ph-eye" /></span>
          <div><h2 id="rv-title" style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>Reveal {label.toLowerCase()}?</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: T.ink2 }}>For {pname}. This access is recorded in the audit log with your reason.</p></div>
        </div>
        <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Why are you viewing this information?</legend>
          {["Patient care", "Administrative need", "Other"].map((o) => { const on = reason === o; return (
            <button key={o} role="radio" aria-checked={on} onClick={() => { setReason(o); setErr(""); }} style={{ display: "flex", gap: 12, alignItems: "center", height: 46, padding: "0 14px", borderRadius: 12, border: `1px solid ${on ? T.tealLt : "rgba(29,35,39,.1)"}`, background: T.card, fontSize: 14.5, cursor: "pointer", textAlign: "left", color: T.ink }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? T.teal : "rgba(29,35,39,.25)"}`, display: "grid", placeItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? T.teal : "transparent" }} /></span>{o}
            </button>
          ); })}
        </fieldset>
        {reason === "Other" && <textarea aria-label="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} rows={2} placeholder="Describe the reason for access" className="f-teal" style={{ borderRadius: 12, border: `1px solid ${T.line3}`, padding: "10px 14px", fontSize: 14.5, outline: "none", resize: "vertical", fontFamily: "inherit" }} />}
        {err && <div role="alert" style={{ fontSize: 13.5, color: T.peachInk, display: "flex", gap: 6, alignItems: "center" }}><i className="ph ph-warning-circle" />{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button onClick={onCancel} className="h-sand" style={btn2}>Cancel</button><button onClick={go} disabled={busy} className="h-primary" style={{ ...btnP, opacity: busy ? 0.75 : 1 }}>{busy ? "Revealing…" : "Reveal and log access"}</button></div>
      </div>
    </Scrim>
  );
}

// ── Delete account (two steps) ───────────────────────────────────────────
export function DeleteDialog({ pid, pname, onClose }: { pid: string; pname: string; onClose: () => void }) {
  const a = useAdmin();
  const [step, setStep] = useState(1);
  const [text, setText] = useState("");
  const ok = text.trim() === "DELETE";
  return (
    <Scrim z={65} dim={0.26}>
      <div data-screen-label="27 Delete Account" role="alertdialog" aria-modal="true" aria-labelledby="del-title" style={{ ...dialog, maxWidth: 480, gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: T.peach, color: T.peachInk, display: "grid", placeItems: "center", fontSize: 20 }}><i className="ph ph-trash" /></span>
          <div><div style={{ fontSize: 12.5, color: T.faint }}>Step {step} of 2</div><h2 id="del-title" style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>Delete {pname}'s account</h2></div>
        </div>
        {step === 1 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14.5, color: T.ink, lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>Before you continue, here is what deletion does:</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, color: T.ink2 }}><li>The patient loses access to My Health Space immediately.</li><li>Wearable connections and sessions are removed.</li><li>Clinical records, labs and referrals are kept for the retention period set by the clinic (Alberta HIA).</li><li>The audit log is never deleted.</li></ul>
              <p style={{ margin: 0, color: T.ink2 }}>If the patient only wants to pause access, deactivate the account instead.</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button onClick={onClose} className="h-sand" style={btn2}>Cancel</button><button onClick={() => setStep(2)} className="h-danger" style={{ ...btn2, border: `1px solid ${T.peachInk}`, color: T.peachInk }}>Continue</button></div>
          </>
        ) : (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}><span>Type <strong style={{ fontWeight: 600 }}>DELETE</strong> to confirm</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="f-peach" style={{ ...input, height: 44, letterSpacing: ".08em" }} /></label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} className="h-sand" style={btn2}>Cancel</button>
              <button aria-disabled={!ok} onClick={async () => { if (!ok) return; try { await a.act({ action: "account.delete", patientId: pid, confirm: "DELETE" }, { success: "Account deletion requested", sub: pname + " can no longer sign in. Retained records are kept." }); onClose(); } catch { /* toast shown */ } }} style={{ ...btnP, background: T.peachInk, opacity: ok ? 1 : 0.45, cursor: ok ? "pointer" : "not-allowed" }}>Delete account</button>
            </div>
          </>
        )}
      </div>
    </Scrim>
  );
}

// ── Export patient data ──────────────────────────────────────────────────
export function ExportDialog({ pid, pname, onClose }: { pid: string; pname: string; onClose: () => void }) {
  const [step, setStep] = useState<"c" | "w" | "d" | "e">("c");
  const [file, setFile] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    setStep("w");
    try { const r = await postAction({ action: "export.patient", patientId: pid }); downloadFile(r.file); setFile(r.file.name); setStep("d"); }
    catch (e: any) { setErr(e.message); setStep("e"); }
  };
  return (
    <Scrim z={65}>
      <div role="dialog" aria-modal="true" aria-labelledby="ex-title" style={{ ...dialog, maxWidth: 460, gap: 14 }}>
        <h2 id="ex-title" style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>Export {pname}'s data</h2>
        {step === "c" && <>
          <p style={{ margin: 0, fontSize: 14.5, color: T.ink2 }}>The export is a JSON file containing:</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, display: "flex", flexDirection: "column", gap: 4 }}><li>Profile, consent settings, goals and care team</li><li>Labs, protocol, appointments and clinic readings</li><li>Wearable data the patient has shared</li><li>Neyu conversations and assessments</li><li>Referrals linked to this record, and the access log</li></ul>
          <p style={{ margin: 0, fontSize: 13.5, color: T.faint }}>Handle the file as protected health information. The export is logged.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button onClick={onClose} className="h-sand" style={btn2}>Cancel</button><button onClick={go} className="h-primary" style={btnP}>Export data</button></div>
        </>}
        {step === "w" && <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ fontSize: 14.5, color: T.ink2 }}>Preparing export…</div><div style={{ height: 6, borderRadius: 999, background: "linear-gradient(90deg,#E1EDF0 0,#6EA8B6 50%,#E1EDF0 100%)", backgroundSize: "800px 100%", animation: "anraShimmer 1s linear infinite" }} /></div>}
        {step === "d" && <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: T.wash, color: T.tealDk, borderRadius: 14, padding: 14 }}><i className="ph-fill ph-check-circle" style={{ fontSize: 22 }} /><div><div style={{ fontWeight: 500 }}>Export ready</div><div style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>{file} · added to the audit log</div></div></div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button onClick={onClose} className="h-primary" style={btnP}>Done</button></div>
        </>}
        {step === "e" && <>
          <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", background: T.peach, color: T.peachInk, borderRadius: 12, padding: "10px 12px", fontSize: 14 }}><i className="ph ph-warning-circle" />{err}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button onClick={onClose} className="h-sand" style={btn2}>Close</button><button onClick={go} className="h-primary" style={btnP}>Try again</button></div>
        </>}
      </div>
    </Scrim>
  );
}

// ── Toasts ───────────────────────────────────────────────────────────────
export interface ToastT { id: string; title: string; sub?: string; undo?: (() => void) | null; tone: "ok" | "err" }
export function Toasts({ toasts, onClose }: { toasts: ToastT[]; onClose: (id: string) => void }) {
  return (
    <div aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 80, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", width: "max-content", maxWidth: "calc(100vw - 32px)" }}>
      {toasts.map((t) => (
        <div key={t.id} role="status" style={{ display: "flex", gap: 12, alignItems: "center", background: T.ink, color: T.card, borderRadius: 16, padding: "12px 14px 12px 16px", boxShadow: T.shadow, animation: "anraPop 260ms cubic-bezier(.2,.8,.2,1)", maxWidth: 560 }}>
          <i className={t.tone === "err" ? "ph-fill ph-warning-circle" : "ph-fill ph-check-circle"} style={{ fontSize: 20, color: t.tone === "err" ? "#E8A48C" : T.tealLt }} />
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 500 }}>{t.title}</div>{t.sub && <div style={{ fontSize: 13, color: "#C9CFD2" }}>{t.sub}</div>}</div>
          {t.undo && <button onClick={() => { t.undo!(); onClose(t.id); }} className="h-toast" style={{ height: 32, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,253,251,.12)", color: T.card, fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>Undo</button>}
          <button onClick={() => onClose(t.id)} aria-label="Dismiss" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "#C9CFD2", cursor: "pointer" }}><i className="ph ph-x" /></button>
        </div>
      ))}
    </div>
  );
}

