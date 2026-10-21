"use client";

// Settings → Privacy requests: account deletions (30-day hold) and data exports.
// Settings → System: which shared store, file storage and job queue are running.

import React, { useState } from "react";
import type { PrivacyAdminDTO } from "@/lib/admin/types";
import { useAdmin, useView, hasPerm } from "../context";
import { T, S, chip, Chip, Failed, BlockSkeleton, Empty } from "../ui";

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—");
const left = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));

function ReasonButton({ label, danger, onRun }: { label: string; danger?: boolean; onRun: (reason: string) => void }) {
  const [open, setOpen] = useState(false), [why, setWhy] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${danger ? "rgba(139,75,55,.3)" : T.line3}`, background: T.card, color: danger ? T.peachInk : T.ink, fontSize: 13.5, cursor: "pointer" }}>{label}</button>;
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <input autoFocus value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (saved in audit log)" aria-label="Reason" style={{ height: 34, borderRadius: 10, border: `1px solid ${T.line3}`, padding: "0 10px", fontSize: 13.5, width: 220 }} />
      <button disabled={why.trim().length < 5} onClick={() => { onRun(why.trim()); setOpen(false); setWhy(""); }} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: danger ? T.peachInk : T.teal, color: T.card, fontSize: 13.5, cursor: "pointer", opacity: why.trim().length < 5 ? 0.5 : 1 }}>{label}</button>
      <button onClick={() => setOpen(false)} style={{ height: 34, padding: "0 10px", border: "none", background: "none", color: T.ink2, cursor: "pointer" }}>Cancel</button>
    </span>
  );
}

export function PrivacyRequests() {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<PrivacyAdminDTO>("privacy");
  if (loading && !data) return <BlockSkeleton h={260} />;
  if (error && !data) return <Failed what="privacy requests" onRetry={reload} />;
  if (!data) return null;
  const can = hasPerm(a.perms, "privacy.deletion.manage");
  const run = (body: Record<string, unknown>, ok: string) => a.act(body, { success: ok, after: () => reload() });
  const statusChip = (s: string) => s === "pending" ? chip("Waiting", "urgent", "ph-hourglass") : s === "completed" ? chip("Deleted", "neutral", "ph-check") : s === "cancelled" ? chip("Cancelled", "teal", "ph-arrow-counter-clockwise") : chip(s, "neutral");
  const td = { padding: "11px 8px", borderTop: `1px solid ${T.line}` } as React.CSSProperties;
  return (
    <div data-screen-label="20 Privacy requests" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, padding: "22px 24px" }}>
        <h2 style={S.h2}>Account deletions</h2>
        <p style={{ margin: "4px 0 14px", fontSize: 14, color: T.ink2 }}>Patients (or staff for them) request deletion; everything is deleted automatically after a {data.holdDays}-day hold. The request stays here as the deletion certificate.</p>
        {data.deletions.length === 0 ? <Empty title="No deletion requests" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
              <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}><th style={S.th}>Patient</th><th style={S.th}>Status</th><th style={S.th}>Requested</th><th style={S.th}>Deletes on</th><th style={S.th}>By</th><th style={S.th} /></tr></thead>
              <tbody>{data.deletions.map((x) => (
                <tr key={x.id} data-testid={"deletion-" + x.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{x.patient}{x.reason && <div style={{ fontSize: 12.5, color: T.faint, fontWeight: 400 }}>“{x.reason}”</div>}</td>
                  <td style={td}><Chip c={statusChip(x.status)} /></td>
                  <td style={{ ...td, color: T.ink2 }}>{d(x.requestedAt)}</td>
                  <td style={{ ...td, color: T.ink2 }}>{x.status === "pending" ? `${d(x.scheduledFor)} · ${left(x.scheduledFor)} days` : x.completedAt ? d(x.completedAt) : "—"}</td>
                  <td style={{ ...td, color: T.ink2 }}>{x.requestedBy}</td>
                  <td style={{ ...td, textAlign: "right" }}>{can && x.status === "pending" && <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ReasonButton label="Cancel deletion" onRun={(reason) => run({ action: "privacy.deletion.cancel", requestId: x.id, reason }, "Deletion cancelled")} />
                    <ReasonButton label="Delete now" danger onRun={(reason) => run({ action: "privacy.deletion.now", requestId: x.id, reason }, "Account deleted")} />
                  </span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ ...S.card, padding: "22px 24px" }}>
        <h2 style={S.h2}>Data exports</h2>
        <p style={{ margin: "4px 0 14px", fontSize: 14, color: T.ink2 }}>Patients download a .zip of all their data and original reports. Files are deleted after 7 days.</p>
        {data.exports.length === 0 ? <Empty title="No exports yet" /> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}><th style={S.th}>Patient</th><th style={S.th}>Status</th><th style={S.th}>Requested</th><th style={S.th}>Available until</th></tr></thead>
            <tbody>{data.exports.map((x) => (
              <tr key={x.id}><td style={{ ...td, fontWeight: 500 }}>{x.patient}</td><td style={td}><Chip c={x.status === "ready" ? chip("Ready", "teal", "ph-check") : x.status === "pending" ? chip("Preparing", "neutral", "ph-spinner") : chip(x.status, "neutral")} /></td><td style={{ ...td, color: T.ink2 }}>{d(x.createdAt)}</td><td style={{ ...td, color: T.ink2 }}>{d(x.expiresAt)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function SystemStatus({ system }: { system?: { store: string; storage: string; queue: string } }) {
  const rows: [string, string, boolean, string][] = [
    ["Shared store (rate limits, sign-in guards, cache)", system?.store === "redis" ? "Redis" : "This server's memory", system?.store === "redis", "Set REDIS_URL to share across servers."],
    ["Background jobs (emails, exports, deletions)", system?.queue === "redis" ? "Redis queue + worker" : "Runs inside this server", system?.queue === "redis", "Set REDIS_URL; the worker starts automatically."],
    ["File storage (reports, exports)", system?.storage === "local" ? "Local disk · encrypted" : system?.storage || "—", true, "STORAGE_DIR on a backed-up disk; S3 later."],
  ];
  return (
    <div style={{ ...S.card, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }} data-testid="system-status">
      <h2 style={S.h2}>System</h2>
      {rows.map(([l, v, ok, hint]) => (
        <div key={l} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}><div style={{ fontWeight: 500 }}>{l}</div><div style={{ fontSize: 13, color: T.faint }}>{hint}</div></div>
          <Chip c={chip(v, ok ? "teal" : "neutral", ok ? "ph-check-circle" : "ph-info")} />
        </div>
      ))}
    </div>
  );
}
