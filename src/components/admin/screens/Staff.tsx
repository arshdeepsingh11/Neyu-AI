"use client";

// Settings → Staff (super admins only): add people with a username and password, choose
// Super admin or Admin, tick each admin's features, decide whether a 2-step code is required.

import React, { useState } from "react";
import type { StaffDTO, StaffRowDTO, StaffFeatureDTO } from "@/lib/admin/types";
import { useAdmin, useView, postAction } from "../context";
import { T, S, chip, Chip, Failed, BlockSkeleton } from "../ui";

const btn = { height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.line3}`, background: T.card, color: T.ink, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties;
const btnP = { ...btn, background: T.teal, color: T.card, border: "none", height: 40 } as React.CSSProperties;
const input = { height: 42, borderRadius: 12, border: `1px solid ${T.line3}`, background: T.card, padding: "0 12px", fontSize: 14.5, color: T.ink, outline: "none", width: "100%" } as React.CSSProperties;
const label = { fontSize: 13, fontWeight: 500, color: T.ink2 } as React.CSSProperties;
const ago = (iso: string | null) => {
  if (!iso) return "never signed in";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "signed in just now" : m < 60 ? `signed in ${m} min ago` : m < 1440 ? `signed in ${Math.round(m / 60)} h ago` : "signed in " + new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};
function makePassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = new Uint32Array(12); crypto.getRandomValues(b);
  const s = Array.from(b, (x) => abc[x % abc.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

// ── Password shown once ──────────────────────────────────────────────────
function Shown({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" data-testid="one-time-password" style={{ ...S.card, padding: 18, display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${T.teal}`, background: T.wash }}>
      <div style={{ fontWeight: 500 }}>Sign-in details for <b>{username}</b></div>
      <code style={{ fontSize: 18, letterSpacing: ".04em", padding: "10px 12px", background: T.card, borderRadius: 10, userSelect: "all" }}>{password}</code>
      <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.5 }}>Shown once. Give it to them privately (not by email). They sign in at <b>/admin</b> and can change it from their profile menu.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { navigator.clipboard?.writeText(`Username: ${username}\nPassword: ${password}`).then(() => setCopied(true)).catch(() => {}); }} style={btn}><i className="ph ph-copy" />{copied ? "Copied" : "Copy both"}</button>
        <button onClick={onClose} style={btn}>Done</button>
      </div>
    </div>
  );
}

// ── Feature checkboxes ───────────────────────────────────────────────────
function FeaturePicker({ features, value, onChange }: { features: StaffFeatureDTO[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => {
    const on = !value.includes(k);
    let next = on ? [...value, k] : value.filter((x) => x !== k);
    if (on) { const add = (key: string) => features.find((f) => f.key === key)?.needs.forEach((n) => { if (!next.includes(n)) { next.push(n); add(n); } }); add(k); }
    else { // turning off a feature also turns off features that need it
      let changed = true;
      while (changed) { changed = false; for (const f of features) if (next.includes(f.key) && f.needs.some((n) => !next.includes(n))) { next = next.filter((x) => x !== f.key); changed = true; } }
    }
    onChange(features.map((f) => f.key).filter((x) => next.includes(x)));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 8 }} data-testid="feature-picker">
      {features.map((f) => {
        const on = value.includes(f.key);
        return (
          <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, border: `1px solid ${on ? T.teal : T.line3}`, background: on ? T.wash : T.card, cursor: "pointer" }}>
            <input type="checkbox" checked={on} onChange={() => toggle(f.key)} style={{ marginTop: 3 }} aria-label={f.label} />
            <span><span style={{ display: "block", fontSize: 14, fontWeight: 500 }}>{f.label}</span><span style={{ display: "block", fontSize: 12.5, color: T.faint, lineHeight: 1.4 }}>{f.description}{f.needs.length ? ` · includes ${f.needs.map((n) => features.find((x) => x.key === n)?.label).join(", ")}` : ""}</span></span>
          </label>
        );
      })}
    </div>
  );
}

// ── Add / edit form ──────────────────────────────────────────────────────
type Draft = { name: string; username: string; password: string; kind: "super" | "admin"; features: string[]; twoStep: boolean };
function PersonForm({ data, edit, onDone, onCancel }: { data: StaffDTO; edit?: StaffRowDTO; onDone: (shown?: { username: string; password: string }) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(edit
    ? { name: edit.name, username: edit.username, password: "", kind: edit.kind, features: edit.features, twoStep: edit.twoStepRequired }
    : { name: "", username: "", password: "", kind: "admin", features: ["overview", "insights"], twoStep: false });
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const set = (p: Partial<Draft>) => { setD({ ...d, ...p }); setErr(""); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (d.name.trim().length < 2) return setErr("Enter their full name.");
    if (!edit && d.username.trim().length < 3) return setErr("Enter a username (3+ characters) or an email.");
    if (!edit && d.password && d.password.length < 8) return setErr("Use at least 8 characters, or leave it empty to make a strong one.");
    if (d.kind === "admin" && !d.features.length) return setErr("Tick at least one feature.");
    setBusy(true);
    try {
      if (edit) { await postAction({ action: "staff.update", staffId: edit.id, name: d.name, kind: d.kind, features: d.features, twoStep: d.twoStep }); onDone(); }
      else {
        const r = await postAction<{ username: string; password?: string }>({ action: "staff.create", name: d.name, username: d.username, password: d.password, kind: d.kind, features: d.features, twoStep: d.twoStep });
        onDone({ username: r.username, password: r.password || d.password });
      }
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} data-testid="person-form" style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column", gap: 16, border: `1px solid ${T.teal}` }}>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{edit ? `Edit ${edit.name}` : "Add a person"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={label}>Full name</span><input value={d.name} onChange={(e) => set({ name: e.target.value })} style={input} autoComplete="off" /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={label}>Username (or email)</span><input value={d.username} disabled={!!edit} onChange={(e) => set({ username: e.target.value.toLowerCase().replace(/\s/g, "") })} placeholder="e.g. priya" style={{ ...input, opacity: edit ? 0.6 : 1 }} autoComplete="off" /></label>
        {!edit && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={label}>Password (8+ characters)</span>
            <span style={{ display: "flex", gap: 6 }}>
              <input type={show ? "text" : "password"} value={d.password} onChange={(e) => set({ password: e.target.value })} placeholder="Leave empty = make a strong one" style={input} autoComplete="new-password" />
              <button type="button" onClick={() => setShow(!show)} style={{ ...btn, height: 42 }} aria-label="Show password"><i className={"ph " + (show ? "ph-eye-slash" : "ph-eye")} /></button>
              <button type="button" onClick={() => { set({ password: makePassword() }); setShow(true); }} style={{ ...btn, height: 42 }} title="Make a strong password"><i className="ph ph-sparkle" /></button>
            </span>
          </label>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label}>Type</span>
        <div role="radiogroup" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([["admin", "Admin", "Only the features you tick below"], ["super", "Super admin", "Everything, including adding and managing staff"]] as const).map(([k, l, sub]) => (
            <label key={k} style={{ flex: "1 1 240px", display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, border: `1px solid ${d.kind === k ? T.teal : T.line3}`, background: d.kind === k ? T.wash : T.card, cursor: "pointer" }}>
              <input type="radio" name="kind" checked={d.kind === k} onChange={() => set({ kind: k })} style={{ marginTop: 3 }} />
              <span><span style={{ display: "block", fontWeight: 500 }}>{l}</span><span style={{ fontSize: 12.5, color: T.faint }}>{sub}</span></span>
            </label>
          ))}
        </div>
      </div>
      {d.kind === "admin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={label}>Features for this admin</span>
          <FeaturePicker features={data.features} value={d.features} onChange={(features) => set({ features })} />
        </div>
      )}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <input type="checkbox" checked={d.twoStep} onChange={(e) => set({ twoStep: e.target.checked })} style={{ marginTop: 3 }} data-testid="two-step" />
        <span><b style={{ fontWeight: 500 }}>Also require a 2-step code</b> (authenticator app on their phone)<span style={{ display: "block", fontSize: 12.5, color: T.faint }}>Recommended for anyone who can open patient records. Off = password only.</span></span>
      </label>
      {err && <div role="alert" style={{ color: T.peachInk, fontSize: 13.5 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btn}>Cancel</button>
        <button type="submit" disabled={busy} className="h-primary" style={btnP}>{busy ? "Saving…" : edit ? "Save changes" : "Add person"}</button>
      </div>
    </form>
  );
}

function PasswordForm({ who, onDone, onCancel }: { who: StaffRowDTO; onDone: (shown: { username: string; password: string }) => void; onCancel: () => void }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw && pw.length < 8) return setErr("Use at least 8 characters, or leave it empty to make a strong one.");
    setBusy(true);
    try { const r = await postAction<{ username: string; password?: string }>({ action: "staff.setPassword", staffId: who.id, password: pw }); onDone({ username: r.username, password: r.password || pw }); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} style={{ ...S.card, padding: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: `1px solid ${T.teal}` }}>
      <span style={{ fontWeight: 500 }}>New password for {who.name}</span>
      <input type="text" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Type one, or leave empty for a strong one" style={{ ...input, flex: "1 1 240px", width: "auto" }} autoComplete="off" />
      <button type="submit" disabled={busy} style={btnP}>{busy ? "Saving…" : "Set password"}</button>
      <button type="button" onClick={onCancel} style={btn}>Cancel</button>
      {err && <div role="alert" style={{ flexBasis: "100%", color: T.peachInk, fontSize: 13.5 }}>{err}</div>}
      <div style={{ flexBasis: "100%", fontSize: 12.5, color: T.faint }}>They are signed out everywhere and use the new password next time.</div>
    </form>
  );
}

export default function Staff() {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<StaffDTO>("staff");
  const [mode, setMode] = useState<{ t: "add" } | { t: "edit"; who: StaffRowDTO } | { t: "pw"; who: StaffRowDTO } | null>(null);
  const [shown, setShown] = useState<{ username: string; password: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  if (loading && !data) return <BlockSkeleton h={320} />;
  if (error && !data) return <Failed what="staff" onRetry={reload} />;
  if (!data) return null;
  const featureName = (k: string) => data.features.find((f) => f.key === k)?.label || k;
  const run = (body: Record<string, unknown>, ok: string) => a.act(body, { success: ok, after: () => reload() });

  const row = (s: StaffRowDTO) => {
    const me = s.id === data.me;
    const st = s.status !== "active" ? chip("Suspended", "urgent", "ph-prohibit") : s.locked ? chip("Locked 15 min", "urgent", "ph-lock") : !s.twoStepRequired ? chip("Password only", "neutral", "ph-key") : s.twoStepOn ? chip("2-step on", "teal", "ph-shield-check") : chip("2-step at next sign-in", "neutral", "ph-hourglass");
    const init = s.name.split(/\s+/).map((x) => x[0] || "").join("").slice(0, 2).toUpperCase();
    const item = (l: string, icon: string, fn: () => void, danger = false) => (
      <button key={l} onClick={() => { setMenu(null); fn(); }} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 38, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, color: danger ? T.peachInk : T.ink, cursor: "pointer", textAlign: "left" }}><i className={"ph " + icon} />{l}</button>
    );
    return (
      <div key={s.id} data-testid={"staff-row-" + s.username} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 20px", borderTop: `1px solid ${T.line}` }}>
        <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", background: s.kind === "super" ? T.teal : T.chip, color: s.kind === "super" ? T.card : T.tealDk, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 }}>{init}</span>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{s.name}{me && <span style={{ color: T.faint, fontWeight: 400 }}> · you</span>}</div>
          <div style={{ fontSize: 13, color: T.faint, overflow: "hidden", textOverflow: "ellipsis" }}>{s.username} · {ago(s.lastLoginAt)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {s.kind === "super" ? <Chip c={chip("Super admin · everything", "teal", "ph-crown-simple")} h={22} />
              : s.features.length ? s.features.map((f) => <span key={f} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: T.stone, color: T.ink2 }}>{featureName(f)}</span>)
              : <span style={{ fontSize: 12, color: T.peachInk }}>No features</span>}
            {s.env && <span title="Set in the server settings (.env)" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: T.lavWash, color: T.lavInk }}>server settings</span>}
          </div>
        </div>
        <Chip c={st} />
        <div style={{ position: "relative", width: 104, display: "flex", justifyContent: "flex-end" }}>
          {!me && !s.env && a.canEdit && <button aria-label={"Manage " + s.username} onClick={() => setMenu(menu === s.id ? null : s.id)} style={btn}>Manage <i className="ph ph-caret-down" /></button>}
          {menu === s.id && (
            <div style={{ position: "absolute", right: 0, top: 42, width: 230, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: 6, zIndex: 30 }}>
              {item("Edit access", "ph-sliders-horizontal", () => setMode({ t: "edit", who: s }))}
              {item("Set a new password", "ph-key", () => setMode({ t: "pw", who: s }))}
              {s.twoStepOn && item("Reset 2-step code (lost phone)", "ph-device-mobile", () => a.confirm({ title: `Reset ${s.name}'s 2-step code?`, body: "Their next sign-in shows a new QR code to scan.", label: "Reset 2-step", run: () => run({ action: "staff.reset2step", staffId: s.id }, "2-step reset") }))}
              {s.status === "active"
                ? item("Suspend", "ph-prohibit", () => a.confirm({ title: `Suspend ${s.name}?`, body: "They are signed out everywhere and can't sign in until re-activated.", label: "Suspend", danger: true, run: () => run({ action: "staff.suspend", staffId: s.id }, "Suspended") }), true)
                : item("Re-activate", "ph-arrow-counter-clockwise", () => run({ action: "staff.activate", staffId: s.id }, "Re-activated"))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const supers = data.staff.filter((s) => s.kind === "super"), admins = data.staff.filter((s) => s.kind === "admin");
  return (
    <div data-screen-label="19 Staff" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, padding: "22px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}><h2 style={S.h2}>Staff</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: T.ink2 }}>Super admins see everything. Admins see only the features you tick for them. Every sign-in and action is in the audit log.</p></div>
        {!mode && a.canEdit && <button onClick={() => { setMode({ t: "add" }); setShown(null); }} className="h-primary" style={btnP}><i className="ph ph-user-plus" /> Add person</button>}
      </div>

      {shown && <Shown {...shown} onClose={() => setShown(null)} />}
      {mode?.t === "add" && <PersonForm data={data} onCancel={() => setMode(null)} onDone={(sh) => { setMode(null); if (sh?.password) setShown(sh); a.toast("Person added"); reload(); }} />}
      {mode?.t === "edit" && <PersonForm key={mode.who.id} data={data} edit={mode.who} onCancel={() => setMode(null)} onDone={() => { setMode(null); a.toast("Access updated", "Applies on their next click"); reload(); }} />}
      {mode?.t === "pw" && <PasswordForm who={mode.who} onCancel={() => setMode(null)} onDone={(sh) => { setMode(null); setShown(sh); a.toast("Password changed"); reload(); }} />}

      <div style={{ ...S.card }} data-testid="staff-list">
        {menu && <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />}
        <div style={{ padding: "12px 20px", fontSize: 13, color: T.ink2 }}>Super admins ({supers.length})</div>
        {supers.map(row)}
        <div style={{ padding: "16px 20px 12px", fontSize: 13, color: T.ink2, borderTop: `1px solid ${T.line}` }}>Admins ({admins.length})</div>
        {admins.length ? admins.map(row) : <div style={{ padding: "4px 20px 18px", fontSize: 14, color: T.faint }}>No admins yet. Use “Add person”.</div>}
      </div>
    </div>
  );
}
