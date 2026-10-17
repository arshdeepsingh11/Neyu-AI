"use client";

import React, { useEffect, useState } from "react";
import type { AuditDTO, AuditStatsDTO, PlatformAuditDTO } from "@/lib/admin/types";
import { useAdmin, useView, downloadFile, getView } from "../context";
import { T, S, chip, Chip, Empty, Failed, BlockSkeleton, SearchBox } from "../ui";
import { auditChip } from "./Patient360";

// ── 14-day activity chart (allowed vs refused) ───────────────────────────
function DayChart({ days }: { days: AuditStatsDTO["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.ok + d.denied));
  const W = 560, H = 120, bw = W / days.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Audit events per day, last 14 days" style={{ width: "100%", height: "auto", display: "block" }}>
      {days.map((d, i) => {
        const hOk = (d.ok / max) * H, hDn = (d.denied / max) * H, x = i * bw + bw * 0.18, w = bw * 0.64;
        return (
          <g key={d.day}>
            <title>{`${d.day}: ${d.ok} allowed, ${d.denied} refused`}</title>
            <rect x={x} y={H - hOk} width={w} height={Math.max(hOk, d.ok ? 2 : 0)} rx={3} fill={T.teal} style={{ transformOrigin: `${x}px ${H}px`, animation: `auditGrow 700ms ${i * 35}ms cubic-bezier(.2,.8,.2,1) both` }} />
            {d.denied > 0 && <rect x={x} y={H - hOk - hDn - 2} width={w} height={Math.max(hDn, 2)} rx={3} fill={T.peachInk} />}
            {(i % 2 === 0 || i === days.length - 1) && <text x={x + w / 2} y={H + 14} textAnchor="middle" fontSize="10" fill={T.faint}>{d.day.slice(5)}</text>}
          </g>
        );
      })}
      <style>{`@keyframes auditGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
    </svg>
  );
}

function Stats() {
  const { data } = useView<AuditStatsDTO>("audit-stats");
  if (!data) return <BlockSkeleton h={170} />;
  const tiles: [string, number, string][] = [["Events · 24 h", data.last24, T.ink], ["Refused · 24 h", data.denied24, data.denied24 ? T.peachInk : T.ink], ["Break-glass reasons · 7 d", data.breakGlass7, T.ink], ["Active staff · 7 d", data.activeStaff7, T.ink]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }} data-testid="audit-stats">
      <div style={{ ...S.card, padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {tiles.map(([l, n, c]) => <div key={l}><div style={{ fontSize: 28, fontWeight: 500, color: c, fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" }}>{n.toLocaleString("en-CA")}</div><div style={{ fontSize: 13, color: T.faint }}>{l}</div></div>)}
      </div>
      <div style={{ ...S.card, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.ink2, marginBottom: 6 }}><span>Last 14 days</span><span><span style={{ color: T.teal }}>■</span> allowed · <span style={{ color: T.peachInk }}>■</span> refused</span></div>
        <DayChart days={data.days} />
      </div>
      <div style={{ ...S.card, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 13, color: T.ink2 }}>Most active staff · 7 days</div>
        {data.topStaff.length === 0 && <div style={{ fontSize: 13.5, color: T.faint }}>No staff activity yet.</div>}
        {data.topStaff.map((t) => { const m = Math.max(...data.topStaff.map((x) => x.n)); return (
          <div key={t.who} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
            <span style={{ flex: "0 0 45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.who}</span>
            <span style={{ flex: 1, height: 8, borderRadius: 4, background: T.stone, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(t.n / m) * 100}%`, background: T.tealLt, borderRadius: 4, transition: "width 600ms" }} /></span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: T.ink2 }}>{t.n}</span>
          </div>); })}
      </div>
    </div>
  );
}

// ── Platform log: every event, including command-line and background jobs ──
function PlatformLog() {
  const [q, setQ] = useState(""), [result, setResult] = useState(""), [reasonOnly, setReasonOnly] = useState(false);
  const [rows, setRows] = useState<PlatformAuditDTO[]>([]), [next, setNext] = useState<string | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const load = async (cursor?: string) => {
    setBusy(true); setErr("");
    try {
      const r = await getView<{ rows: PlatformAuditDTO[]; next: string | null }>("audit-platform", { q: q.trim() || undefined, result: result || undefined, reason: reasonOnly ? "1" : undefined, cursor });
      setRows((old) => (cursor ? [...old, ...r.rows] : r.rows)); setNext(r.next);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, result, reasonOnly]);
  const td = { padding: "10px 8px", borderTop: `1px solid ${T.line}` };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="platform-log">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Staff, resource, reason, IP or patient ID" label="Search platform log" style={{ flex: "1 1 280px", maxWidth: 420 }} />
        {[["", "All"], ["success", "Allowed"], ["denied", "Refused"]].map(([k, l]) => <button key={k} onClick={() => setResult(k)} style={{ height: 34, padding: "0 12px", borderRadius: 999, border: "none", background: result === k ? T.ink : "transparent", color: result === k ? T.card : T.ink2, fontSize: 13.5, cursor: "pointer" }}>{l}</button>)}
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13.5, color: T.ink2 }}><input type="checkbox" checked={reasonOnly} onChange={(e) => setReasonOnly(e.target.checked)} />With a reason (break-glass)</label>
      </div>
      {err && <Failed what="the platform log" onRetry={() => load()} />}
      <div style={{ ...S.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 980 }}>
          <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 12.5 }}><th style={{ ...S.th, padding: "12px 8px 12px 20px" }}>Time</th><th style={S.th}>Who</th><th style={S.th}>Action</th><th style={S.th}>Resource</th><th style={S.th}>Subject</th><th style={S.th}>Reason</th><th style={S.th}>IP</th><th style={{ ...S.th, padding: "12px 20px 12px 8px" }}>Result</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td style={{ ...td, padding: "10px 8px 10px 20px", whiteSpace: "nowrap", color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{new Date(e.at).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td style={td}><div style={{ fontWeight: 500 }}>{e.actor}</div><div style={{ fontSize: 12, color: T.faint }}>{e.role || e.actorType}</div></td>
                <td style={td}>{e.detail}</td>
                <td style={{ ...td, color: T.ink2 }}>{e.resource}</td>
                <td style={td}>{e.subject || (e.subjectPatientId ? "Patient " + e.subjectPatientId.slice(0, 8) : "—")}</td>
                <td style={{ ...td, color: e.reason ? T.peachInk : T.faint, maxWidth: 220 }}>{e.reason || "—"}</td>
                <td style={{ ...td, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{e.ip || "—"}</td>
                <td style={{ ...td, padding: "10px 20px 10px 8px" }}><Chip c={e.result === "success" ? chip("Allowed", "teal", "ph-check") : chip("Refused", "urgent", "ph-x")} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !busy && <div style={{ padding: 24, textAlign: "center", color: T.faint }}>No matching events.</div>}
      </div>
      {next && <button onClick={() => load(next)} disabled={busy} style={{ ...S.btn2, alignSelf: "center" }}>{busy ? "Loading…" : "Load older events"}</button>}
    </div>
  );
}

export default function AuditLog() {
  const a = useAdmin();
  const [tab, setTab] = useState<"console" | "platform">("console");
  return (
    <section data-screen-label="17 Audit Log" style={{ display: "flex", flexDirection: "column", gap: 18, animation: "anraFade 260ms ease-out" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}><h1 style={S.h1}>Audit Log</h1><p style={{ margin: "4px 0 0", color: T.ink2 }}>Every access to or change of protected information, as required under Alberta's Health Information Act. Entries can't be edited or deleted.</p></div>
        <button onClick={() => a.act({ action: "export.audit" }, { success: "Audit log exported", sub: "CSV · logged to audit", after: (r) => r.file && downloadFile(r.file) })} className="h-sand" style={S.btn2}><i className="ph ph-download-simple" />Export CSV</button>
      </div>
      <Stats />
      <div role="tablist" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: T.stone, alignSelf: "flex-start" }}>
        {([["console", "Console activity"], ["platform", "Everything (incl. tools & jobs)"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 32, padding: "0 12px", border: "none", borderRadius: 9, background: tab === k ? T.card : "transparent", fontSize: 13.5, cursor: "pointer" }}>{l}</button>)}
      </div>
      {tab === "console" ? <ConsoleLog /> : <PlatformLog />}
    </section>
  );
}

function ConsoleLog() {
  const a = useAdmin();

  const { data, error, loading, reload } = useView<{ rows: AuditDTO[] }>("audit");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("All");
  const aq = q.trim().toLowerCase();
  const rows = (data?.rows || []).filter((e) => (kind === "All" || (kind === "Break-glass" ? !!e.reason : e.kind === kind)) && (!aq || [e.who, e.subject, e.action, e.resource, e.ip, e.reason].some((x) => (x || "").toLowerCase().includes(aq))));
  const td = { padding: "11px 8px", borderTop: `1px solid ${T.line}` };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Staff, patient, action, resource or IP" label="Filter audit log" style={{ flex: "1 1 280px", maxWidth: 420 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["All", "View", "Reveal", "Change", "Export", "Account", "Break-glass"].map((k) => <button key={k} onClick={() => setKind(k)} style={{ height: 34, padding: "0 12px", borderRadius: 999, border: "none", background: kind === k ? T.ink : "transparent", color: kind === k ? T.card : T.ink2, fontSize: 13.5, fontWeight: 500, cursor: "pointer", transition: "all 200ms", whiteSpace: "nowrap" }}>{k}</button>)}
        </div>
        <span style={{ fontSize: 13, color: T.faint }}>{rows.length} events</span>
      </div>
      {loading && <BlockSkeleton />}
      {error && !data && <Failed what="the audit log" onRetry={reload} sub="No audit entries were lost. Recording continues in the background." />}
      {data && rows.length === 0 && <Empty title="No matching events" sub="Try a different staff member, patient or action type." />}
      {rows.length > 0 && (
        <div style={{ ...S.card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 1040 }}>
            <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}>
              <th style={{ ...S.th, padding: "12px 8px 12px 20px" }}>Timestamp</th><th style={S.th}>Who</th><th style={S.th}>Role</th><th style={S.th}>Type</th><th style={S.th}>Action</th><th style={S.th}>Resource</th><th style={S.th}>Patient / visitor</th><th style={S.th}>IP</th><th style={{ ...S.th, padding: "12px 20px 12px 8px" }}>Result</th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} onClick={() => a.openAudit(e.id)} className="h-row" style={{ cursor: "pointer" }}>
                  <td style={{ ...td, padding: "11px 8px 11px 20px", color: T.ink2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{e.ts}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{e.who}</td>
                  <td style={{ ...td, color: T.ink2 }}>{e.role}</td>
                  <td style={td}><Chip c={auditChip(e.kind)} /></td>
                  <td style={td}>{e.action}</td>
                  <td style={{ ...td, color: T.ink2 }}>{e.resource}</td>
                  <td style={td}>{e.subject}</td>
                  <td style={{ ...td, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{e.ip}</td>
                  <td style={{ ...td, padding: "11px 20px 11px 8px" }}><Chip c={e.result === "Success" ? chip("Success", "teal", "ph-check") : chip(e.result, "urgent", "ph-x")} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
