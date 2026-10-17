"use client";

// Settings → Staff & Roles: who works in the console, their role, 2-step status;
// invite, change role, suspend, reset password / 2-step; the live permission matrix.

import React, { useState } from "react";
import type { StaffDTO, StaffRowDTO } from "@/lib/admin/types";
import { useAdmin, useView, postAction, hasPerm } from "../context";
import { T, S, chip, Chip, Failed, BlockSkeleton } from "../ui";

const btn = { height: 36, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.line3}`, background: T.card, color: T.ink, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties;
const input = { height: 42, borderRadius: 12, border: `1px solid ${T.line3}`, background: T.card, padding: "0 12px", fontSize: 14.5, color: T.ink, outline: "none", width: "100%" } as React.CSSProperties;
const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "Just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

function OneTime({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" data-testid="one-time-password" style={{ ...S.card, padding: 18, display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${T.teal}`, background: T.wash }}>
      <div style={{ fontWeight: 500 }}>Password for {email} — shown once</div>
      <code style={{ fontSize: 18, letterSpacing: ".04em", padding: "10px 12px", background: T.card, borderRadius: 10, userSelect: "all" }}>{password}</code>
      <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.5 }}>Give it to them privately (not by email). At first sign-in at <b>/admin</b> they scan a QR code to turn on their 2-step code, then they can change the password from the profile menu.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { navigator.clipboard?.writeText(password).then(() => setCopied(true)).catch(() => {}); }} style={btn}><i className="ph ph-copy" /> {copied ? "Copied" : "Copy"}</button>
        <button onClick={onClose} style={btn}>Done</button>
      </div>
    </div>
  );
}

export default function Staff() {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<StaffDTO>("staff");
  const [inv, setInv] = useState({ email: "", name: "", role: "care_staff" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState<{ email: string; password: string } | null>(null);
  const [view, setView] = useState<"staff" | "matrix">("staff");
  const [menu, setMenu] = useState<string | null>(null);
  const canManage = hasPerm(a.perms, "staff.invite");

  if (loading && !data) return <BlockSkeleton h={320} />;
  if (error && !data) return <Failed what="staff" onRetry={reload} />;
  if (!data) return null;
  const roleName = (k: string) => data.roles.find((r) => r.key === k)?.name || k;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await postAction<{ password: string; email: string; role: string }>({ action: "staff.invite", ...inv });
      setShown({ email: r.email, password: r.password }); setInv({ email: "", name: "", role: inv.role }); setOpen(false);
      a.toast("Staff member added", `${r.email} · ${r.role}`); reload();
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  const run = (body: Record<string, unknown>, ok: string, after?: (r: any) => void) => a.act(body, { success: ok, after: (r) => { after?.(r); reload(); } });

  const row = (s: StaffRowDTO) => {
    const me = s.id === data.me;
    const st = s.status !== "active" ? chip("Suspended", "urgent", "ph-prohibit") : s.locked ? chip("Locked 15 min", "urgent", "ph-lock") : s.twoStep ? chip("2-step on", "teal", "ph-shield-check") : chip("Not signed in yet", "neutral", "ph-hourglass");
    const init = s.name.split(/\s+/).map((x) => x[0] || "").join("").slice(0, 2).toUpperCase();
    const item = (label: string, icon: string, fn: () => void, danger = false) => (
      <button key={label} onClick={() => { setMenu(null); fn(); }} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 38, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, color: danger ? T.peachInk : T.ink, cursor: "pointer", textAlign: "left" }}><i className={"ph " + icon} />{label}</button>
    );
    return (
      <div key={s.id} data-testid={"staff-row-" + s.email} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 20px", borderTop: `1px solid ${T.line}` }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: s.status === "active" ? T.chip : T.stone, color: T.tealDk, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 }}>{init}</span>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{s.name}{me && <span style={{ color: T.faint, fontWeight: 400 }}> · you</span>}</div>
          <div style={{ fontSize: 13, color: T.faint, overflow: "hidden", textOverflow: "ellipsis" }}>{s.email} · last sign-in {ago(s.lastLoginAt).toLowerCase()}</div>
        </div>
        <Chip c={st} />
        {canManage && !me && data.assignable.length ? (
          <select aria-label={"Role for " + s.email} value={s.roles[0]?.key || ""} onChange={(e) => a.confirm({ title: `Change ${s.name}'s role?`, body: `${s.roles[0]?.name || "No role"} → ${roleName(e.target.value)}. Their menu and permissions change on their next click.`, label: "Change role", run: () => run({ action: "staff.role", staffId: s.id, role: e.target.value }, "Role changed") })}
            style={{ ...input, height: 36, width: 170 }}>
            {!s.roles.length && <option value="">No role</option>}
            {data.roles.filter((r) => data.assignable.includes(r.key) || s.roles.some((x) => x.key === r.key)).map((r) => <option key={r.key} value={r.key} disabled={!data.assignable.includes(r.key)}>{r.name}</option>)}
          </select>
        ) : <span style={{ width: 170, fontSize: 14, color: T.ink2 }}>{s.roles.map((r) => r.name).join(", ") || "—"}</span>}
        <div style={{ position: "relative", width: 96, display: "flex", justifyContent: "flex-end" }}>
          {canManage && !me && <button aria-label={"Manage " + s.email} onClick={() => setMenu(menu === s.id ? null : s.id)} style={btn}>Manage <i className="ph ph-caret-down" /></button>}
          {menu === s.id && (
            <div style={{ position: "absolute", right: 0, top: 42, width: 220, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: 6, zIndex: 30 }}>
              {s.status === "active"
                ? item("Suspend", "ph-prohibit", () => a.confirm({ title: `Suspend ${s.name}?`, body: "They are signed out everywhere and can't sign in until re-activated.", label: "Suspend", danger: true, run: () => run({ action: "staff.suspend", staffId: s.id }, "Suspended") }), true)
                : item("Re-activate", "ph-arrow-counter-clockwise", () => run({ action: "staff.activate", staffId: s.id }, "Re-activated"))}
              {item("Reset 2-step code", "ph-device-mobile", () => a.confirm({ title: `Reset ${s.name}'s 2-step code?`, body: "Use when they lost their phone. Their next sign-in shows a new QR code.", label: "Reset 2-step", run: () => run({ action: "staff.reset2step", staffId: s.id }, "2-step reset") }))}
              {item("Reset password", "ph-key", () => a.confirm({ title: `New password for ${s.name}?`, body: "A new password is shown once. They are signed out everywhere.", label: "Reset password", run: () => run({ action: "staff.resetPassword", staffId: s.id }, "Password reset", (r) => r?.password && setShown({ email: r.email, password: r.password })) }))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const areas = Array.from(new Set(data.permissions.map((p) => p.area)));
  return (
    <div data-screen-label="19 Staff and Roles" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, padding: "22px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}><h2 style={S.h2}>Staff &amp; Roles</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: T.ink2 }}>Everyone signs in with their own email, password and 2-step code. Each role opens only its own screens.</p></div>
        <div role="tablist" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: T.stone }}>
          {(["staff", "matrix"] as const).map((k) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} style={{ height: 32, padding: "0 12px", border: "none", borderRadius: 9, background: view === k ? T.card : "transparent", fontSize: 13.5, cursor: "pointer" }}>{k === "staff" ? `People (${data.staff.length})` : "What each role can do"}</button>)}
        </div>
        {canManage && view === "staff" && <button onClick={() => setOpen(!open)} className="h-primary" style={{ ...btn, background: T.teal, color: T.card, border: "none", height: 40 }}><i className="ph ph-user-plus" /> Add staff</button>}
      </div>

      {shown && <OneTime {...shown} onClose={() => setShown(null)} />}

      {open && view === "staff" && (
        <form onSubmit={invite} data-testid="invite-form" style={{ ...S.card, padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13, color: T.ink2 }}>Full name</span><input value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} style={input} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13, color: T.ink2 }}>Work email</span><input type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} style={input} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13, color: T.ink2 }}>Role</span>
            <select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })} style={input}>{data.roles.filter((r) => data.assignable.includes(r.key)).map((r) => <option key={r.key} value={r.key}>{r.name} — {r.description}</option>)}</select></label>
          <button type="submit" disabled={busy} className="h-primary" style={{ ...btn, height: 42, background: T.teal, color: T.card, border: "none" }}>{busy ? "Adding…" : "Add and show password"}</button>
          {err && <div role="alert" style={{ gridColumn: "1/-1", color: T.peachInk, fontSize: 13.5 }}>{err}</div>}
        </form>
      )}

      {view === "staff" ? (
        <div style={{ ...S.card }} data-testid="staff-list">
          {menu && <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />}
          <div style={{ padding: "12px 20px", fontSize: 13, color: T.ink2 }}>{data.staff.filter((x) => x.status === "active").length} active · {data.staff.filter((x) => x.twoStep).length} with 2-step on</div>
          {data.staff.map(row)}
        </div>
      ) : (
        <div style={{ ...S.card, overflowX: "auto" }} data-testid="role-matrix">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
            <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 12 }}><th style={{ ...S.th, padding: "12px 8px 12px 20px" }}>Permission</th>{data.roles.map((r) => <th key={r.key} style={{ ...S.th, textAlign: "center", whiteSpace: "normal", width: 72, lineHeight: 1.2 }}>{r.name.replace("Organization admin", "Org admin").replace("Clinic manager", "Clinic mgr")}</th>)}</tr></thead>
            <tbody>
              {areas.map((area) => (
                <React.Fragment key={area}>
                  <tr><td colSpan={data.roles.length + 1} style={{ padding: "14px 20px 4px", fontSize: 12, fontWeight: 600, letterSpacing: ".06em", color: T.faint, textTransform: "uppercase" }}>{area}</td></tr>
                  {data.permissions.filter((p) => p.area === area).map((p) => (
                    <tr key={p.key}>
                      <td style={{ padding: "9px 8px 9px 20px", borderTop: `1px solid ${T.line}` }}>{p.description}</td>
                      {data.roles.map((r) => {
                        const sc = r.perms[p.key];
                        return <td key={r.key} style={{ textAlign: "center", borderTop: `1px solid ${T.line}`, color: sc === "full" ? T.tealDk : sc ? T.peachInk : T.faint }} title={sc === "reason" ? "Allowed with a written reason (break-glass)" : sc || "Not allowed"}>
                          <i className={"ph " + (sc === "full" ? "ph-check-circle" : sc === "reason" ? "ph-shield-warning" : sc === "own" ? "ph-user-circle" : "ph-minus")} />
                        </td>;
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "14px 20px", fontSize: 13, color: T.ink2, borderTop: `1px solid ${T.line}` }}>
            <span><i className="ph ph-check-circle" style={{ color: T.tealDk }} /> Allowed</span>
            <span><i className="ph ph-shield-warning" style={{ color: T.peachInk }} /> Allowed with a reason (break-glass, saved in the audit log, 60 min)</span>
            <span><i className="ph ph-minus" style={{ color: T.faint }} /> Not allowed</span>
          </div>
        </div>
      )}
    </div>
  );
}
