"use client";

import React from "react";
import type { OverviewDTO } from "@/lib/admin/types";
import { useAdmin, useView, hasPerm } from "../context";
import { T, S, TestTag, Failed, BlockSkeleton } from "../ui";
import { inTab } from "./Inbox";

export default function Overview({ openInbox }: { openInbox: (tab: string) => void }) {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<OverviewDTO>("overview", a.rangeParams);
  const hour = Number(new Date().toLocaleString("en-CA", { timeZone: "America/Edmonton", hour: "numeric", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const q = data?.queue || [];
  const inbox = hasPerm(a.perms, "inbox.manage"); // the queue is part of the Inbox feature
  const emergencies = q.filter((x) => x.priority === "Emergency");
  const summary: [string, string, number, boolean?][] = [
    ["urgent", "Emergency symptom checks", emergencies.length, true], ["referrals", "New referrals", q.filter((x) => inTab(x, "referrals")).length],
    ["appointments", "Reschedule requests", q.filter((x) => inTab(x, "appointments")).length], ["labs", "Pending labs", q.filter((x) => inTab(x, "labs")).length],
    ["prep", "Visit-prep submissions", q.filter((x) => inTab(x, "prep")).length], ["devices", "Devices not syncing", q.filter((x) => inTab(x, "devices")).length],
    ["accounts", "Unverified accounts", q.filter((x) => inTab(x, "accounts")).length],
  ];

  return (
    <section data-screen-label="02 Overview" style={{ display: "flex", flexDirection: "column", gap: 28, animation: "anraFade 260ms ease-out" }}>
      <div>
        <h1 style={S.h1}>{greeting}</h1>
        <p style={{ margin: "4px 0 0", color: T.ink2, fontSize: 16 }}>{inbox ? "Here's what needs your attention today." : "Here's how NEYU is doing."}</p>
      </div>

      {loading && <><BlockSkeleton h={180} /><BlockSkeleton h={110} /><BlockSkeleton h={260} /></>}
      {error && !data && <Failed what="the overview" onRetry={reload} />}

      {data && inbox && (emergencies.length > 0 ? (
        <div role="region" aria-label="Emergency queue" style={{ background: T.peach, borderRadius: 22, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.peachInk, flexWrap: "wrap" }}>
            <i className="ph-fill ph-warning-circle" style={{ fontSize: 22 }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{emergencies.length} emergency-flagged symptom check{emergencies.length === 1 ? "" : "s"}</h2>
            <span style={{ flex: 1 }} />
            <button onClick={() => openInbox("urgent")} className="h-urgent" style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(139,75,55,.25)", background: "transparent", color: T.peachInk, fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>Open emergency queue</button>
          </div>
          {emergencies.map((e) => (
            <button key={e.id} onClick={() => e.aiId && a.openAI(e.aiId)} className="h-up" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", width: "100%", textAlign: "left", background: T.card, border: "none", borderRadius: 16, padding: "14px 16px", cursor: "pointer", transition: "transform 200ms" }}>
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.peachInk, fontWeight: 500 }}>Emergency-flagged symptom check</div>
                <div style={{ fontSize: 15.5, fontWeight: 500, color: T.ink, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>{e.who}<TestTag show={e.test} /></div>
                <div style={{ fontSize: 14, color: T.ink2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail}</div>
              </div>
              <div style={{ display: "flex", gap: 18, fontSize: 13, color: T.ink2, flexWrap: "wrap" }}>
                <span><span style={{ display: "block", color: T.faint }}>Time</span>{e.time}</span>
                <span><span style={{ display: "block", color: T.faint }}>Source</span>Neyu symptom checker</span>
                <span><span style={{ display: "block", color: T.faint }}>Status</span>{e.status}</span>
              </div>
              <span style={{ height: 34, padding: "0 14px", borderRadius: 10, background: T.peachInk, color: T.card, fontSize: 13.5, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>Review<i className="ph ph-arrow-right" /></span>
            </button>
          ))}
          <div style={{ fontSize: 13.5, color: T.peachInk, display: "flex", gap: 8, alignItems: "center" }}><i className="ph ph-phone" />Patients were shown: <strong style={{ fontWeight: 600 }}>If this is an emergency, call 911.</strong></div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", color: T.tealDk, background: T.wash, borderRadius: 16, padding: "14px 18px", fontSize: 14.5 }}><i className="ph ph-check-circle" style={{ fontSize: 18 }} />No emergency-flagged symptom checks waiting for review.</div>
      ))}

      {data && (
        <>
          {inbox && <div>
            <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 500 }}>Needs attention</h2>
            <div style={{ ...S.card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", overflow: "hidden" }}>
              {summary.map(([k, l, n, urgent]) => {
                const hot = urgent && n > 0;
                return (
                  <button key={k} onClick={() => openInbox(k)} className="h-page" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "18px 20px", border: "none", borderRight: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, background: hot ? T.peach : "transparent", textAlign: "left", cursor: "pointer", transition: "background 180ms" }}>
                    <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: hot ? T.peachInk : T.ink, lineHeight: 1.1 }}>{n}</span>
                    <span style={{ fontSize: 13.5, color: T.ink2, display: "flex", alignItems: "center", gap: 4 }}>{l}<i className="ph ph-caret-right" style={{ fontSize: 12 }} /></span>
                  </button>
                );
              })}
            </div>
          </div>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 0, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: "18px 0" }}>
            {data.metrics.map((m) => (
              <div key={m.label} style={{ flex: "1 1 150px", padding: "4px 20px 4px 0", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, color: T.faint }}>{m.label}</span>
                <span style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", transition: "all 300ms" }}>{m.n}</span>
                <span style={{ fontSize: 12.5, color: T.tealDk }}>{m.d}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
            <div style={{ flex: "1.7 1 520px", minWidth: 0, ...S.card, padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}><h2 style={S.h2}>Digital funnel</h2><span style={{ fontSize: 13, color: T.faint }}>{data.rangeLabel}</span></div>
              <ol aria-label="Visitor to booked visit funnel" style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: 0 }}>
                {data.funnel.map((f) => (
                  <li key={f.label} style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", gap: 6, padding: "0 14px 14px 0" }}>
                    <span style={{ fontSize: 13, color: T.ink2, display: "flex", alignItems: "center", gap: 4 }}>{f.notFirst && <i className="ph ph-arrow-right" style={{ fontSize: 12, color: T.faint }} />}{f.label}</span>
                    <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{f.n}</span>
                    <span style={{ height: 6, borderRadius: 999, background: T.wash, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: f.w, background: T.teal, borderRadius: 999, transition: "width 350ms cubic-bezier(.2,.8,.2,1)" }} /></span>
                    <span style={{ fontSize: 12.5, color: T.faint }}>{f.pct} of visitors</span>
                  </li>
                ))}
              </ol>
            </div>
            <div style={{ flex: "1 1 300px", minWidth: 0, ...S.card, padding: "22px 24px" }}>
              <h2 style={{ ...S.h2, margin: "0 0 10px" }}>Recent activity</h2>
              {data.activity.length === 0 && <p style={{ margin: 0, color: T.ink2, fontSize: 14 }}>Nothing yet. New referrals, sign-ups and AI activity appear here.</p>}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
                {data.activity.map((x, i) => (
                  <li key={i}>
                    <button onClick={() => x.go && a.go(x.go)} className="h-page" style={{ display: "flex", gap: 12, alignItems: "flex-start", width: "100%", padding: "10px 8px", margin: "0 -8px", border: "none", background: "transparent", borderRadius: 12, textAlign: "left", cursor: "pointer" }}>
                      <span style={{ width: 68, flex: "none", fontSize: 13, color: T.faint, paddingTop: 1 }}>{x.time}</span>
                      <i className={"ph " + x.icon} style={{ fontSize: 17, color: T.teal, paddingTop: 1 }} />
                      <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: T.ink }}>{x.title}</span><span style={{ display: "block", fontSize: 13, color: T.ink2 }}>{x.who}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
