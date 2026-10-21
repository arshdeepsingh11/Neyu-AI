"use client";

// Insights: what people view, search, click and ask Neyu; where they come from; how many
// become patients. Anonymous counts only — no names. Uses the date range in the top bar.

import React, { useState } from "react";
import type { InsightsDTO } from "@backend/siteInsights";
import { useAdmin, useView } from "../context";
import { T, S, Failed, BlockSkeleton } from "../ui";

const fmt = (n: number) => n.toLocaleString("en-CA");
const card = { ...S.card, padding: "20px 22px" } as React.CSSProperties;

function Ranked({ title, rows, empty, unit = "", accent = T.teal, testid }: { title: string; rows: { label: string; n: number; sub?: string }[]; empty: string; unit?: string; accent?: string; testid?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={card} data-testid={testid}>
      <h2 style={{ ...S.h2, fontSize: 16, margin: "0 0 14px" }}>{title}</h2>
      {!rows.length && <p style={{ margin: 0, fontSize: 13.5, color: T.faint }}>{empty}</p>}
      {rows.map((r, i) => (
        <div key={r.label + i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(54px,auto)", gap: 10, alignItems: "center", marginBottom: 9, fontSize: 13.5 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.ink }} title={r.sub ? `${r.label} · ${r.sub}` : r.label}>{r.label}</span>
          <span style={{ height: 8, borderRadius: 999, background: T.side, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(r.n / max) * 100}%`, background: accent, borderRadius: 999, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} /></span>
          <span style={{ textAlign: "right", color: T.ink2, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmt(r.n)}{unit}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ days }: { days: InsightsDTO["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 180, pad = 6;
  const max = Math.max(1, ...days.map((d) => d.visitors));
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, days.length - 1);
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.visitors).toFixed(1)}`).join(" ");
  const area = `${line} L${x(days.length - 1)} ${H} L${x(0)} ${H} Z`;
  const h = hover != null ? days[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Visitors per day"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width) * (days.length - 1)); setHover(Math.max(0, Math.min(days.length - 1, i))); }}>
        <defs><linearGradient id="ins-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={T.teal} stopOpacity=".28" /><stop offset="1" stopColor={T.teal} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H - 8 - f * (H - 24)} y2={H - 8 - f * (H - 24)} stroke={T.line} />)}
        <path d={area} fill="url(#ins-fill)" />
        <path d={line} fill="none" stroke={T.teal} strokeWidth="2.2" strokeLinejoin="round" style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: "insDraw 1.2s cubic-bezier(.2,.8,.2,1) forwards" }} />
        {h && hover != null && <><line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke={T.line3} /><circle cx={x(hover)} cy={y(h.visitors)} r="4.5" fill={T.teal} stroke={T.card} strokeWidth="2" /></>}
        <style>{"@keyframes insDraw{to{stroke-dashoffset:0}}"}</style>
      </svg>
      {h && <div style={{ position: "absolute", top: 0, right: 0, background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "6px 10px", fontSize: 12.5, boxShadow: T.shadow }}>{new Date(h.day + "T12:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })} · <b>{fmt(h.visitors)}</b> visitors · {fmt(h.views)} page views</div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.faint, marginTop: 4 }}>
        <span>{days[0]?.day}</span><span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<InsightsDTO>("insights", a.rangeParams);
  const t = data?.totals;
  const delta = (v: number | null | undefined) => (v == null ? "" : `${v > 0 ? "▲" : v < 0 ? "▼" : "•"} ${Math.abs(v)}% vs previous period`);
  return (
    <section data-screen-label="21 Insights" style={{ display: "flex", flexDirection: "column", gap: 20, animation: "anraFade 260ms ease-out" }}>
      <div><h1 style={S.h1}>Insights</h1><p style={{ margin: "4px 0 0", color: T.ink2 }}>What people look at, search for and ask Neyu — anonymous, no names{data ? " · " + data.rangeLabel : ""}</p></div>
      {loading && !data && <><BlockSkeleton h={110} /><BlockSkeleton h={260} /><BlockSkeleton h={300} /></>}
      {error && !data && <Failed what="insights" onRetry={reload} />}
      {data && t && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }} data-testid="insight-tiles">
            {([["Visitors", fmt(t.visitors), delta(t.visitorsChange)], ["Page views", fmt(t.views), ""], ["New accounts", fmt(t.signups), delta(t.signupsChange)], ["Visitor → account", `${t.conversion}%`, ""], ["Searches", fmt(t.searches), ""], ["Questions to Neyu", fmt(t.neyuQuestions), ""]] as const).map(([l, v, d]) => (
              <div key={l} style={{ ...S.card, padding: "16px 18px" }}>
                <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
                <div style={{ fontSize: 13, color: T.ink2 }}>{l}</div>
                {d && <div style={{ fontSize: 12, color: d.startsWith("▼") ? T.peachInk : T.tealDk, marginTop: 4 }}>{d}</div>}
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <h2 style={{ ...S.h2, fontSize: 16, margin: 0 }}>Visitors per day</h2>
              {t.mobileShare != null && <span style={{ fontSize: 13, color: T.ink2 }}>{t.mobileShare}% on a phone or tablet</span>}
            </div>
            <Trend days={data.days} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            <Ranked title="What people are interested in" rows={data.interests} empty="No visits in this period yet." unit=" views" testid="ins-interests" />
            <Ranked title="What they ask Neyu (topics)" rows={data.neyuTopics} empty="No Neyu questions in this period." accent="#8E7CF0" testid="ins-topics" />
            <Ranked title="What they search for" rows={data.searches} empty="No searches yet — counted from today." testid="ins-searches" />
            <Ranked title="Buttons and links they use" rows={data.clicks.map((c) => ({ label: c.label, n: c.n, sub: c.target || "" }))} empty="No clicks yet — counted from today." testid="ins-clicks" />
            <Ranked title="Most viewed pages" rows={data.topPages.map((p) => ({ label: p.label, n: p.n, sub: `${p.people} people` }))} empty="No visits yet." />
            <Ranked title="Specialties viewed" rows={data.specialties} empty="No specialty pages viewed yet." />
            <Ranked title="Services & tests viewed" rows={data.services} empty="No service pages viewed yet." />
            <Ranked title="Physicians viewed" rows={data.physicians} empty="No physician profiles viewed yet." />
            <Ranked title="Where visitors come from" rows={data.sources} empty="No new visitors in this period." accent={T.tealLt} testid="ins-sources" />
            <div style={card}>
              <h2 style={{ ...S.h2, fontSize: 16, margin: "0 0 14px" }}>From visit to account</h2>
              {data.funnel.map((f, i) => {
                const top = Math.max(1, data.funnel[0].n);
                return (
                  <div key={f.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}><span>{f.label}</span><span style={{ color: T.ink2 }}>{fmt(f.n)}{i ? ` · ${Math.round((f.n / top) * 1000) / 10}%` : ""}</span></div>
                    <div style={{ height: 14, borderRadius: 8, background: T.side, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(2, (f.n / top) * 100)}%`, background: i === 2 ? T.tealDk : T.teal, opacity: 1 - i * 0.15, borderRadius: 8, transition: "width 700ms" }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: T.faint }}>Counts are anonymous. Searches and clicks are not recorded when a browser asks not to be tracked. Emails and long numbers typed into search are removed before saving.</p>
        </>
      )}
    </section>
  );
}
