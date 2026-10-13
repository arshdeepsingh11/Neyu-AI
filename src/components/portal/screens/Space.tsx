"use client";

// Personal Health Space — My Health (Health Map), Records (reports from any
// provider), Add to Health Space (upload / scan / photo, Neyu reads it),
// Food, AI Plan and the Doctor Report. Built on the existing portal data
// layer and primitives; calm, Apple-like hierarchy.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePortal } from "../context";
import { EP, api, invalidate, load, useResource, ApiError } from "../api";
import { C, screenAnim, Loading, EmptyCard, btnPrimary, btnSecondary, btnOutline, btnLink, cardBox } from "../ui";
import { NIcon } from "@/components/neyu/icons";
import FileReady from "@/components/FileReady";
import { saveFile, isIOS, isNeyuApp } from "@/lib/saveFile";
import { BaselineCard } from "./Baseline";
import { Ticker, Ring, AnimatedList, Shine, Morph, StatusChip, SourceTag, AiTag, OriginalTag, SecHead, ProcessSteps, kindLabel, kindIcon, STATUS } from "../space-ui";
import type { MetricKey } from "@/lib/portal/metrics";

// ── Types (mirror backend/space.ts, backend/documents.ts) ──────────────────
export type Evidence = { label: string; source?: string; date?: string; go?: string };
type Change = { key?: string; status: string; area: string; title: string; text: string; go?: string; source?: string; confidence?: string; basis?: string; evidence?: Evidence[] };
type Coverage = { id: string; label: string; icon: string; level: "strong" | "good" | "partial" | "limited" | "missing"; detail: string; go: string };
type Gap = { area: string; kind?: string; text: string; why?: string; action?: { label: string; go: string } };
type Area = { id: string; label: string; icon: string; state: "known" | "partial" | "missing"; fact: string; change?: string; go: string };
export type SpaceDTO = { changes: Change[]; gaps: Gap[]; areas: Area[]; coverage: Coverage[]; known: number; counts: { docs: number; labs: number; meals: number; sources: number }; sources: string[] };
type DocValue = { name: string; value: string; unit?: string; ref?: string; flag?: string };
type Doc = { id: string; title: string; kind: string; provider: string | null; date: string | null; source: string; mime: string; fileName: string; size: number; values: DocValue[]; keyPoints: string[]; aiFailed: boolean; summary: string | null; status: string; addedAt: string };

const fmtDate = (d: string | null) => (d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "Date not found");
const DOC_SOURCE: Record<string, string> = { upload: "Uploaded document", scan: "Scanned document", photo: "Photo of a document", bioaro: "BioAro Labs (connected)" };
const page: React.CSSProperties = { ...screenAnim };
const h1: React.CSSProperties = { margin: "0 0 6px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" };
const lead: React.CSSProperties = { margin: "0 0 26px", fontSize: 16, lineHeight: 1.55, color: C.ink2, maxWidth: 640 };

/** Opens a target string produced by the backend ("trend:steps", "doc:id", "myhealth:heart"…). */
export function useOpen() {
  const { go, tab } = usePortal();
  return (t?: string) => {
    if (!t) return;
    const [a, b] = t.split(":");
    if (a === "trend" && b) return go("trend", { k: b as MetricKey });
    if (a === "result" && b) return go("result", { id: b });
    if (a === "doc" && b) return go("doc", { id: b });
    if (a === "myhealth") return tab(b === "heart" ? "heart" : b === "lifestyle" ? "lifestyle" : b === "profile" ? "baseline" : "myhealth");
    if (a === "records") return tab(b === "labs" ? "results" : "records");
    if (a === "add") return go("add");
    tab(a as any);
  };
}

// ════════════════════════════════════════════════════════════════════════
// MY HEALTH — the Health Map
// ════════════════════════════════════════════════════════════════════════
const CONF: Record<string, string> = { strong: "Strong evidence", limited: "Limited evidence", insufficient: "Not enough data yet" };

/** "Why am I seeing this?" — the evidence trail behind any Neyu insight. */
export function Why({ basis, confidence, evidence, tone = C.teal }: { basis?: string; confidence?: string; evidence?: Evidence[]; tone?: string }) {
  const open = useOpen();
  const [on, setOn] = useState(false);
  if (!basis && !evidence?.length) return null;
  return (
    <div>
      <button onClick={(e) => { e.stopPropagation(); setOn(!on); }} aria-expanded={on} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: 0, border: "none", background: "none", fontSize: 13, fontWeight: 500, color: tone, cursor: "pointer" }}>
        <NIcon name={on ? "chevronUp" : "info"} size={13} tone="currentColor" />{on ? "Hide evidence" : "Why am I seeing this?"}
      </button>
      {on && (
        <div style={{ marginTop: 6, padding: "12px 14px", borderRadius: 12, background: "#F6F4F1", animation: "mhs-fadeUp 240ms ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink2 }}>Based on</span>{confidence && <span style={{ fontSize: 12, color: confidence === "strong" ? C.tealDark : C.muted }}>{CONF[confidence] || confidence}</span>}</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
            {basis && <li style={{ fontSize: 13.5, color: C.ink2 }}>• {basis.replace(/^Based on /, "")}</li>}
            {(evidence || []).filter((e) => e.label && e.label !== basis).map((e, i) => (
              <li key={i} style={{ fontSize: 13.5, color: C.ink2 }}>
                {e.go ? <button onClick={(ev) => { ev.stopPropagation(); open(e.go); }} style={{ padding: 0, border: "none", background: "none", fontSize: 13.5, color: C.teal, cursor: "pointer", textAlign: "left", textDecoration: "underline", textUnderlineOffset: 2 }}>• {e.label}</button> : <>• {e.label}</>}
                {e.source && <span style={{ color: C.faint }}> · {e.source}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChangeRow({ c, onOpen }: { c: Change; onOpen: (g?: string) => void }) {
  return (
    <div className="mhs-lift" style={{ width: "100%", display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 16, border: `1px solid ${C.line}`, background: C.card }}>
      <StatusChip s={c.status} small />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={() => onOpen(c.go)} disabled={!c.go} style={{ padding: 0, border: "none", background: "none", textAlign: "left", fontSize: 15, lineHeight: 1.45, color: C.ink, cursor: c.go ? "pointer" : "default" }}>{c.text}</button>
        {c.source && <SourceTag>{c.source}</SourceTag>}
        <Why basis={c.basis} confidence={c.confidence} evidence={c.evidence} />
      </span>
      {c.go && <button aria-label="Open" onClick={() => onOpen(c.go)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}><NIcon name="chevron" size={16} tone={C.faint} /></button>}
    </div>
  );
}

/** Health Data Coverage — how much information Neyu has, never how healthy you are. */
const LEVELS: Coverage["level"][] = ["missing", "limited", "partial", "good", "strong"];
export function CoverageList({ items }: { items: Coverage[] }) {
  const open = useOpen();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: "4px 24px" }}>
      {items.map((c) => {
        const n = LEVELS.indexOf(c.level);
        return (
          <button key={c.id} onClick={() => open(c.go)} aria-label={`${c.label}: ${c.level} data. ${c.detail}`} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "10px 0", border: "none", borderBottom: `1px solid ${C.line}`, background: "none", cursor: "pointer", textAlign: "left" }}>
            <NIcon name={c.icon} size={18} tone={n <= 1 ? C.faint : C.teal} />
            <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5 }}>{c.label}</span><span style={{ display: "block", fontSize: 12.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.detail}</span></span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ display: "flex", gap: 3 }}>{[1, 2, 3, 4].map((k) => <span key={k} style={{ width: 14, height: 6, borderRadius: 3, background: k <= n ? (n >= 3 ? C.teal : C.tealLight) : "#E6E2DC" }} />)}</span>
              <span style={{ fontSize: 11.5, color: n <= 1 ? C.muted : C.tealDark, textTransform: "capitalize" }}>{c.level}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function WhatChanged({ s, max = 6, compact }: { s: SpaceDTO; max?: number; compact?: boolean }) {
  const open = useOpen();
  const list = s.changes.slice(0, max);
  if (!list.length) return <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.55 }}>Nothing new to compare yet. As devices, reports and check-ins arrive, Neyu will show what changed here.</p>;
  return <AnimatedList gap={compact ? 8 : 10}>{list.map((c, i) => <ChangeRow key={i} c={c} onOpen={open} />)}</AnimatedList>;
}

function GapList({ gaps }: { gaps: Gap[] }) {
  const open = useOpen();
  if (!gaps.length) return <p style={{ margin: 0, fontSize: 15, color: C.muted }}>Your record covers the main areas. Nice work.</p>;
  return (
    <AnimatedList gap={8}>
      {gaps.map((g, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "#F3F1EE" }}>
          <NIcon name="circle" size={16} tone={C.faint} />
          <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.45, color: C.ink2 }}><b style={{ fontWeight: 500, color: C.ink }}>{g.area}.</b> {g.text}{g.why && <span style={{ display: "block", fontSize: 13, color: C.muted, marginTop: 2 }}>{g.why}</span>}</span>
          {g.kind && <span className="mhs-hide-sm" style={{ fontSize: 11.5, color: C.faint, whiteSpace: "nowrap" }}>{({ no_data: "No data", limited_data: "Limited", outdated_data: "Outdated", incomplete_data: "Incomplete" } as Record<string, string>)[g.kind]}</span>}
          {g.action && <button onClick={() => open(g.action!.go)} style={{ ...btnLink, height: 32, flex: "none" }}>{g.action.label}</button>}
        </div>
      ))}
    </AnimatedList>
  );
}

function MapTile({ a }: { a: Area }) {
  const open = useOpen();
  const t = STATUS[a.state];
  return (
    <button onClick={() => open(a.go)} className="mhs-lift" aria-label={`${a.label}: ${t.label}. ${a.fact}`} style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", padding: 16, borderRadius: 18, border: `1px solid ${C.line}`, background: a.state === "missing" ? "transparent" : C.card, cursor: "pointer", textAlign: "left", minHeight: 128, borderStyle: a.state === "missing" ? "dashed" : "solid" }}>
      <span style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: a.state === "missing" ? "#F3F1EE" : C.tealWash }}><NIcon name={a.icon} size={19} tone={a.state === "missing" ? C.faint : C.teal} /></span>
        <StatusChip s={a.change && a.change !== "stable" ? a.change : a.state} small />
      </span>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{a.label}</span>
      <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{a.fact}</span>
    </button>
  );
}

export function MyHealth() {
  const { profile, openSheet } = usePortal();
  const { data: s, error, reload } = useResource<SpaceDTO>(EP.space);
  if (!s) return <Loading error={error} retry={reload} />;
  const total = s.areas.length;
  return (
    <div style={page}>
      <div className="mhs-stack-sm" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center", marginBottom: 30 }}>
        <div>
          <span style={{ fontSize: 13, letterSpacing: ".12em", color: C.teal, fontWeight: 500 }}>HEALTH MAP</span>
          <h1 style={{ ...h1, marginTop: 8 }}>{profile.firstName}, here's what we{" "}<Morph words={["know.", "see changing.", "see improving.", "are missing."]} style={{ color: C.tealDark }} /></h1>
          <p style={{ ...lead, margin: "8px 0 18px" }}>Your entire health in one place — every area, where the information came from, and what's still missing.</p>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {[["Reports", s.counts.docs], ["Lab values", s.counts.labs], ["Meals logged", s.counts.meals], ["Sources", s.counts.sources]].map(([l, v]) => (
              <div key={l as string} style={{ display: "flex", flexDirection: "column" }}><Ticker value={v as number} style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-.02em" }} /><span style={{ fontSize: 13, color: C.muted }}>{l}</span></div>
            ))}
          </div>
        </div>
        <Ring value={s.known} max={total} size={150} label={<><Ticker value={s.known} />/{total}</>} sub="areas known" />
      </div>

      <section aria-label="Health Map" style={{ marginBottom: 34 }}>
        <SecHead title="Your Health Map" sub="Tap an area to see its details. Dashed areas have no information yet." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,170px),1fr))", gap: 10 }}>
          {s.areas.map((a) => <MapTile key={a.id} a={a} />)}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 28, alignItems: "start", marginBottom: 34 }}>
        <section aria-label="What changed">
          <SecHead title="What changed?" sub="Last 30 days compared with the 30 before." />
          <WhatChanged s={s} max={8} />
        </section>
        <section aria-label="What's missing">
          <SecHead title="What's missing?" sub="Information gaps in your record — not medical advice." />
          <GapList gaps={s.gaps} />
        </section>
      </div>

      {s.coverage?.length > 0 && (
        <section aria-label="Health data coverage" style={{ marginBottom: 34 }}>
          <SecHead title="Health data coverage" sub="How much information Neyu has in each area — not how healthy you are." />
          <CoverageList items={s.coverage} />
        </section>
      )}

      <BaselineCard />

      <section style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["How has my health changed this year?", "What information do you have about my heart?", "What should I ask my doctor?"].map((q) => (
          <button key={q} onClick={() => openSheet({ t: "alba", ask: q })} className="h-albacard" style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", borderRadius: 20, border: "1px solid rgba(42,132,228,.2)", background: C.card, fontSize: 14, color: C.lavDeep, cursor: "pointer" }}><NIcon name="sparkle" size={15} tone={C.lavMid} />{q}</button>
        ))}
      </section>
      {s.sources.length > 0 && <p style={{ margin: "22px 0 0", fontSize: 13, color: C.faint, lineHeight: 1.6 }}>Built from: {s.sources.join(" · ")}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// RECORDS — reports from any provider
// ════════════════════════════════════════════════════════════════════════
function AddOptions({ compact }: { compact?: boolean }) {
  const { go } = usePortal();
  const opts = [
    { id: "upload", icon: "upload", t: "Upload a file", d: "PDF or image from your phone or computer" },
    { id: "scan", icon: "scan", t: "Scan a document", d: "Use your camera — we make a clean PDF" },
    { id: "photo", icon: "camera", t: "Take a photo", d: "One quick picture of a report" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit,minmax(min(100%,180px),1fr))" : "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
      {opts.map((o) => (
        <button key={o.id} onClick={() => go("add", { id: o.id })} className="mhs-lift" style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", borderRadius: 16, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={o.icon} size={20} tone={C.teal} /></span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{o.t}</span><span style={{ fontSize: 13, color: C.muted }}>{o.d}</span></span>
        </button>
      ))}
    </div>
  );
}

function DocRow({ d }: { d: Doc }) {
  const { go } = usePortal();
  return (
    <button onClick={() => go("doc", { id: d.id })} className="mhs-lift" style={{ width: "100%", display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", borderRadius: 16, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left" }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={kindIcon[d.kind] || "doc"} size={20} tone={C.teal} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 15.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
        <span style={{ fontSize: 13, color: C.muted }}>{kindLabel[d.kind] || "Report"} · {d.provider || DOC_SOURCE[d.source]} · {fmtDate(d.date)}</span>
      </span>
      {d.status === "review" ? <StatusChip s="new" small /> : d.values.length > 0 ? <span className="mhs-hide-sm" style={{ fontSize: 12.5, color: C.muted, flex: "none" }}>{d.values.length} values</span> : null}
      <NIcon name="chevron" size={16} tone={C.faint} />
    </button>
  );
}

export function Records() {
  const { data, error, reload } = useResource<{ documents: Doc[] }>(EP.docs);
  const [kind, setKind] = useState("all");
  if (!data) return <Loading error={error} retry={reload} />;
  const docs = data.documents;
  const review = docs.filter((d) => d.status === "review");
  const saved = docs.filter((d) => d.status === "saved" && (kind === "all" || d.kind === kind));
  const kinds = [...new Set(docs.filter((d) => d.status === "saved").map((d) => d.kind))];
  const byYear = saved.reduce<Record<string, Doc[]>>((m, d) => { const y = (d.date || d.addedAt).slice(0, 4); (m[y] ||= []).push(d); return m; }, {});
  return (
    <div style={page}>
      <h1 style={h1}>Records</h1>
      <p style={lead}>Every report, from any doctor, lab, hospital or clinic. Neyu reads them for you — and the original is always kept exactly as it was.</p>

      <Shine radius={24} style={{ marginBottom: 30 }}>
        <div style={{ padding: "22px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Add to your Health Space</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>Blood tests, ECGs, imaging, specialist letters, prescriptions — from anywhere.</p></div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.tealDark }}><NIcon name="lock" size={14} tone="currentColor" />Private to you</span>
          </div>
          <AddOptions />
        </div>
      </Shine>

      {review.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SecHead title="Finish reviewing" sub="Neyu read these. Check what it found, then add them to your record." />
          <AnimatedList gap={8}>{review.map((d) => <DocRow key={d.id} d={d} />)}</AnimatedList>
        </section>
      )}

      {!docs.length ? (
        <EmptyCard icon="folder" title="Your records will live here" text="Add your first report — an old blood test, an ECG or a letter from a specialist. BioAro Labs results arrive here automatically when connected." />
      ) : (
        <section>
          <SecHead title="Your reports" right={kinds.length > 1 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", ...kinds].map((k) => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} style={{ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${kind === k ? "transparent" : C.line12}`, background: kind === k ? C.tealChip : "transparent", color: kind === k ? C.tealDark : C.ink2, fontSize: 13, cursor: "pointer" }}>{k === "all" ? "All" : kindLabel[k]}</button>)}
            </div>) : undefined} />
          {Object.keys(byYear).sort().reverse().map((y) => (
            <div key={y} style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, marginBottom: 18 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.muted, paddingTop: 16 }}>{y}</span>
              <AnimatedList gap={8}>{byYear[y].map((d) => <DocRow key={d.id} d={d} />)}</AnimatedList>
            </div>
          ))}
          {!saved.length && <p style={{ fontSize: 14, color: C.muted }}>No reports of this type yet.</p>}
        </section>
      )}
    </div>
  );
}

// ── Review (shared by Add and Report detail) ──────────────────────────────
const KINDS = Object.keys(kindLabel);
const inp: React.CSSProperties = { width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.line12}`, background: "#fff", fontSize: 15, fontFamily: "inherit", color: C.ink };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.muted }}>{label}{children}</label>;
}

function Review({ doc, onDone, onDiscard }: { doc: Doc; onDone: (d: Doc) => void; onDiscard: () => void }) {
  const { toast } = usePortal();
  const [f, setF] = useState({ title: doc.title, kind: doc.kind, provider: doc.provider || "", date: doc.date || "" });
  const [values, setValues] = useState<DocValue[]>(doc.values);
  const [busy, setBusy] = useState(false);
  const [rereading, setRereading] = useState(false);
  const retry = async () => {
    setRereading(true);
    try {
      const r = await api<{ document: Doc }>(`/api/portal/documents/${doc.id}/read`, { method: "POST" });
      const d = r.document; setF({ title: d.title, kind: d.kind, provider: d.provider || "", date: d.date || "" }); setValues(d.values); Object.assign(doc, d, { aiFailed: false }); toast("Neyu read your report");
    } catch (e: any) { toast(e.message); } finally { setRereading(false); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ document: Doc; labsAdded: number }>(`/api/portal/documents/${doc.id}`, { method: "PATCH", body: { ...f, date: f.date || null, values, confirm: true } });
      invalidate(EP.docs, EP.space, EP.results, EP.history); load(EP.space, true).catch(() => {});
      toast(r.labsAdded ? `Added · ${r.labsAdded} results now in Lab results` : "Added to your Health Space");
      onDone(r.document);
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>We found:</h2><AiTag label="Read by Neyu — please check" />
      </div>
      {doc.aiFailed && (
        <div role="status" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "12px 14px", borderRadius: 12, background: "#FFF4E0", color: "#8A5A12", fontSize: 14 }}>
          <span style={{ flex: "1 1 260px" }}>Neyu couldn't read this file right now. Your original is saved — try again, or add the details yourself.</span>
          <button onClick={retry} disabled={rereading} style={{ ...btnOutline, height: 38, background: C.card, color: "#8A5A12", borderColor: "rgba(138,90,18,.3)" }}>{rereading ? "Reading again…" : "Try reading again"}</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 }}>
        <Field label="Report"><input style={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Type"><select style={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}</select></Field>
        <Field label="Provider / laboratory"><input style={inp} value={f.provider} placeholder="e.g. Dynacare, Foothills Hospital" onChange={(e) => setF({ ...f, provider: e.target.value })} /></Field>
        <Field label="Date of the report"><input type="date" style={inp} value={f.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      </div>
      {values.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 500 }}>Results ({values.length})</h3>
          <div style={{ borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden", background: C.card }}>
            {values.map((v, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 36px", gap: 8, alignItems: "center", padding: "8px 12px", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                <span>{v.name}</span>
                <span style={{ fontWeight: 500 }}>{v.value} {v.unit}{v.flag && v.flag !== "normal" ? <span style={{ color: C.peachInk, fontWeight: 400 }}> · {v.flag}</span> : null}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{v.ref || "—"}</span>
                <button aria-label={`Remove ${v.name}`} onClick={() => setValues(values.filter((_, j) => j !== i))} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", color: C.faint }}><NIcon name="x" size={15} tone="currentColor" /></button>
              </div>
            ))}
          </div>
          {f.kind === "lab" && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted }}>These values will also appear in Lab results and Trends, marked with this source.</p>}
        </div>
      )}
      {doc.summary && <div style={{ padding: "14px 16px", borderRadius: 14, background: C.lav }}><p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{doc.summary}</p></div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={save} disabled={busy || !f.title.trim()} className="h-primary" style={{ ...btnPrimary, height: 48, padding: "0 22px", opacity: busy ? 0.7 : 1 }}>{busy ? "Adding…" : "Add to Health Space"}</button>
        <button onClick={onDiscard} disabled={busy} style={btnOutline}>Discard</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// REPORT DETAIL — original vs Neyu's reading, always clearly separated
// ════════════════════════════════════════════════════════════════════════
export function DocDetail({ id }: { id: string }) {
  const { openSheet, toast, back } = usePortal();
  const url = `/api/portal/documents/${id}`;
  const { data, error, reload } = useResource<{ document: Doc }>(url);
  const [view, setView] = useState<"original" | "summary" | "results">("summary");
  const [confirmDel, setConfirmDel] = useState(false);
  if (!data) return <Loading error={error} retry={reload} />;
  const d = data.document;
  const file = `${url}/file`;
  const del = async () => {
    try { await api(url, { method: "DELETE" }); invalidate(EP.docs, EP.space, EP.results); load(EP.docs, true).catch(() => {}); toast("Report removed"); back(); } catch (e: any) { toast(e.message); }
  };
  if (d.status === "review") return <div style={page}><Review doc={d} onDone={() => { invalidate(url); reload(); }} onDiscard={del} /></div>;
  const tabs = [["summary", "Summary"], ["results", `Results${d.values.length ? ` (${d.values.length})` : ""}`], ["original", "Original report"]] as const;
  return (
    <div style={page}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={kindIcon[d.kind] || "doc"} size={26} tone={C.teal} /></span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ ...h1, fontSize: 28 }}>{d.title}</h1>
          <p style={{ margin: 0, fontSize: 15, color: C.muted }}>{kindLabel[d.kind]} · {fmtDate(d.date)}</p>
          <div style={{ marginTop: 6 }}><SourceTag>{d.provider ? `${d.provider} — ${fmtDate(d.date)}` : DOC_SOURCE[d.source]}</SourceTag></div>
        </div>
      </div>

      <div role="tablist" aria-label="Report views" style={{ display: "inline-flex", padding: 3, borderRadius: 12, background: "#ECE9E4", marginBottom: 20, maxWidth: "100%", overflowX: "auto" }}>
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 9, background: view === k ? C.card : "transparent", boxShadow: view === k ? "0 1px 3px rgba(29,35,39,.1)" : "none", fontSize: 14, fontWeight: 500, color: view === k ? C.ink : C.muted, cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>)}
      </div>

      {view === "summary" && (
        <section style={{ ...cardBox, padding: 22, maxWidth: 760, animation: "mhs-fadeIn 300ms ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>What this report says</h2><AiTag /></div>
          <p style={{ margin: "0 0 14px", fontSize: 16, lineHeight: 1.65, color: C.ink2 }}>{d.summary || "Neyu hasn't written an explanation for this report. Open the original to read it."}</p>
          {d.keyPoints.length > 0 && <><h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: C.muted }}>Key points from the report</h3><ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, lineHeight: 1.5 }}>{d.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul></>}
          <p style={{ margin: "16px 0 0", fontSize: 12.5, color: C.faint, lineHeight: 1.5 }}>An AI explanation to help you understand — not a diagnosis. The original report is the medical record.</p>
        </section>
      )}
      {view === "results" && (d.values.length ? (
        <section style={{ ...cardBox, overflow: "hidden", maxWidth: 760, animation: "mhs-fadeIn 300ms ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)", gap: 8, padding: "10px 16px", fontSize: 12.5, color: C.muted, background: "#F8F6F3" }}><span>Test</span><span>Result</span><span>Reference</span></div>
          {d.values.map((v, i) => {
            const flagged = v.flag && v.flag !== "normal";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)", gap: 8, padding: "12px 16px", borderTop: `1px solid ${C.line}`, fontSize: 14.5, alignItems: "center" }}>
                <span>{v.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: flagged ? C.peachInk : C.ink }}>{flagged && <NIcon name="alert" size={14} tone="currentColor" />}{v.value} {v.unit}{flagged && <span style={{ fontWeight: 400, fontSize: 12.5 }}>({v.flag})</span>}</span>
                <span style={{ color: C.muted, fontSize: 13.5 }}>{v.ref || "—"}</span>
              </div>
            );
          })}
          <p style={{ margin: 0, padding: "12px 16px", fontSize: 12.5, color: C.faint, borderTop: `1px solid ${C.line}` }}>Values as printed on the original report. Flags are the laboratory's.</p>
        </section>
      ) : <EmptyCard icon="flask" title="No results in this report" text="This report doesn't contain lab-style values. Read the summary or open the original." />)}
      {view === "original" && (
        <section style={{ animation: "mhs-fadeIn 300ms ease" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <OriginalTag />
            <a href={file} target="_blank" rel="noopener" style={{ ...btnLink, textDecoration: "none" }}><NIcon name="external" size={15} tone="currentColor" />Open</a>
            <a href={file + "?download=1"} style={{ ...btnLink, textDecoration: "none" }}><NIcon name="download" size={15} tone="currentColor" />Download</a>
          </div>
          <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line12}`, background: "#E9E6E1" }}>
            {d.mime === "application/pdf"
              ? <iframe title={`Original: ${d.title}`} src={file} style={{ width: "100%", height: "min(78vh, 900px)", border: 0, display: "block" }} />
              : /image\/(heic|heif)/.test(d.mime) ? <p style={{ padding: 20, margin: 0, fontSize: 14 }}>This photo format can't be shown in the browser. Use Download to view it.</p>
              : <img src={file} alt={`Original: ${d.title}`} style={{ display: "block", maxWidth: "100%", margin: "0 auto" }} />}
          </div>
        </section>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
        <button onClick={() => openSheet({ t: "alba", ask: `Explain my ${d.title}${d.date ? ` from ${fmtDate(d.date)}` : ""} in simple words.` })} className="h-secondary" style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 8 }}><NIcon name="sparkle" size={16} tone="currentColor" />Ask Neyu about this report</button>
        {!confirmDel ? <button onClick={() => setConfirmDel(true)} style={btnOutline}>Remove</button> : (
          <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px", fontSize: 14 }}>Remove this report and its values?
            <button onClick={del} style={{ ...btnOutline, borderColor: "rgba(139,75,55,.35)", color: C.peachInk }}>Remove</button><button onClick={() => setConfirmDel(false)} style={btnLink}>Cancel</button></span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ADD TO HEALTH SPACE — upload / scan (→ PDF) / photo → Neyu reads → review
// ════════════════════════════════════════════════════════════════════════
const READ_STEPS = ["Uploading securely", "Reading your report", "Finding results, dates and provider", "Writing a simple explanation"];

async function enhance(file: File, docLook: boolean): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, 1700 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const x = c.getContext("2d")!;
    if (docLook) x.filter = "grayscale(1) contrast(1.35) brightness(1.08)";
    x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

async function pagesToPdf(pages: string[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612, H = 792, m = 18;
  for (let i = 0; i < pages.length; i++) {
    if (i) pdf.addPage();
    const im = await new Promise<HTMLImageElement>((r) => { const x = new Image(); x.onload = () => r(x); x.src = pages[i]; });
    const s = Math.min((W - m * 2) / im.width, (H - m * 2) / im.height);
    pdf.addImage(pages[i], "JPEG", (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
  }
  return pdf.output("blob");
}

export function AddRecord() {
  const { route, go, tab, toast } = usePortal();
  const mode0 = (route.id === "scan" || route.id === "photo" || route.id === "upload" ? route.id : null) as "scan" | "photo" | "upload" | null;
  const [mode, setMode] = useState<"scan" | "photo" | "upload" | null>(mode0);
  const [stage, setStage] = useState<"pick" | "pages" | "reading" | "review" | "done" | "error">(mode0 === "scan" ? "pages" : "pick");
  const [pages, setPages] = useState<string[]>([]);
  const [docLook, setDocLook] = useState(true);
  const [step, setStep] = useState(0);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null), camRef = useRef<HTMLInputElement>(null), photoRef = useRef<HTMLInputElement>(null);

  // Open the right picker straight away when arriving from an option button.
  useEffect(() => { const t = setTimeout(() => { if (mode0 === "upload") fileRef.current?.click(); if (mode0 === "photo") photoRef.current?.click(); if (mode0 === "scan") camRef.current?.click(); }, 250); return () => clearTimeout(t); }, [mode0]);

  const send = (blob: Blob, name: string, source: string) => new Promise<void>((resolve) => {
    setStage("reading"); setStep(0); setErr("");
    const fd = new FormData(); fd.append("file", blob, name); fd.append("source", source);
    const xhr = new XMLHttpRequest();
    let t: ReturnType<typeof setInterval> | undefined;
    xhr.upload.onload = () => { setStep(1); t = setInterval(() => setStep((s) => Math.min(3, s + 1)), 3500); };
    xhr.onload = () => {
      clearInterval(t);
      let j: any = {}; try { j = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 401) { window.location.href = "/my-health/sign-in?next=/my-health?s=records"; return resolve(); }
      if (xhr.status >= 400 || !j.document) { setErr(j.error || "We couldn't add this file. Please try again."); setStage("error"); return resolve(); }
      setStep(4); invalidate(EP.docs); load(EP.docs, true).catch(() => {});
      setTimeout(() => { setDoc(j.document); setStage("review"); }, 450);
      resolve();
    };
    xhr.onerror = () => { clearInterval(t); setErr("Connection lost. Check your internet and try again."); setStage("error"); resolve(); };
    xhr.open("POST", "/api/portal/documents"); xhr.send(fd);
  });

  const onFile = async (f: File | undefined, source: string) => {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast("This file is larger than 15 MB."); return; }
    if (source === "photo" && /image\/(jpeg|png|webp)/.test(f.type)) { const d = await enhance(f, false); const b = await (await fetch(d)).blob(); return send(b, (f.name || "photo").replace(/\.\w+$/, "") + ".jpg", "photo"); }
    send(f, f.name || "report", source);
  };
  const addPage = async (f: File | undefined) => { if (!f) return; try { const d = await enhance(f, docLook); setPages((p) => [...p, d]); setStage("pages"); } catch { toast("That image couldn't be read. Try another photo."); } };
  const makePdf = async () => { const b = await pagesToPdf(pages); send(b, `Scanned report ${new Date().toISOString().slice(0, 10)}.pdf`, "scan"); };

  const inputs = (
    <>
      <input ref={fileRef} type="file" hidden accept="application/pdf,image/*" onChange={(e) => { onFile(e.target.files?.[0], "upload"); e.target.value = ""; }} />
      <input ref={photoRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { onFile(e.target.files?.[0], "photo"); e.target.value = ""; }} />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { addPage(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );

  return (
    <div style={{ ...page, maxWidth: 820 }}>
      {inputs}
      {stage === "pick" && (
        <>
          <h1 style={h1}>Add to My Health Space</h1>
          <p style={lead}>From any doctor, lab, hospital or clinic — today's or from years ago. Neyu reads it and keeps the original.</p>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0], "upload"); }}
            style={{ display: "grid", gap: 12, padding: 18, borderRadius: 24, border: `1.5px dashed ${drag ? C.teal : C.line12}`, background: drag ? C.tealWash : "transparent", transition: "all .2s" }}>
            {[
              { m: "upload" as const, icon: "upload", t: "Upload a file", d: "PDF or image. Drag it here on a computer.", f: () => fileRef.current?.click() },
              { m: "scan" as const, icon: "scan", t: "Scan a document", d: "Photograph each page — we turn them into one clean PDF.", f: () => { setMode("scan"); setStage("pages"); camRef.current?.click(); } },
              { m: "photo" as const, icon: "camera", t: "Take a photo", d: "A single picture of a report or prescription.", f: () => photoRef.current?.click() },
            ].map((o) => (
              <button key={o.m} onClick={o.f} className="mhs-lift" style={{ display: "flex", gap: 16, alignItems: "center", padding: "18px 18px", borderRadius: 18, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 52, height: 52, borderRadius: 16, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={o.icon} size={26} tone={C.teal} /></span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontSize: 17, fontWeight: 500 }}>{o.t}</span><span style={{ fontSize: 14, color: C.muted }}>{o.d}</span></span>
                <NIcon name="chevron" size={18} tone={C.faint} />
              </button>
            ))}
          </div>
          <p style={{ margin: "16px 0 0", display: "flex", gap: 8, fontSize: 13, color: C.muted, lineHeight: 1.5 }}><NIcon name="shieldCheck" size={16} tone={C.teal} />Only you can see your reports. Sharing is always your choice. PDF or photo, up to 15 MB.</p>
        </>
      )}

      {stage === "pages" && (
        <>
          <h1 style={h1}>Scan a document</h1>
          <p style={lead}>Take a clear photo of each page on a flat surface, in good light. Add as many pages as you need.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12, marginBottom: 18 }}>
            {pages.map((p, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "0.77", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line12}`, background: "#fff", animation: "mhs-fadeUp 300ms ease" }}>
                <img src={p} alt={`Page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", left: 8, bottom: 8, padding: "2px 8px", borderRadius: 8, background: "rgba(29,35,39,.7)", color: "#fff", fontSize: 12 }}>Page {i + 1}</span>
                <button aria-label={`Remove page ${i + 1}`} onClick={() => setPages(pages.filter((_, j) => j !== i))} style={{ position: "absolute", right: 6, top: 6, width: 30, height: 30, borderRadius: 15, border: "none", background: "rgba(255,255,255,.92)", cursor: "pointer" }}><NIcon name="x" size={14} tone={C.ink} /></button>
              </div>
            ))}
            <button onClick={() => camRef.current?.click()} style={{ aspectRatio: "0.77", borderRadius: 12, border: `1.5px dashed ${C.tealLight}`, background: C.tealWash, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: C.tealDark, fontSize: 14, fontWeight: 500 }}>
              <NIcon name="camera" size={26} tone={C.teal} />{pages.length ? "Add page" : "Take first page"}
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.ink2, marginBottom: 18, cursor: "pointer" }}><input type="checkbox" checked={docLook} onChange={(e) => setDocLook(e.target.checked)} style={{ width: 18, height: 18 }} />Clean document look (black & white, sharper text) for new pages</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={makePdf} disabled={!pages.length} className="h-primary" style={{ ...btnPrimary, height: 48, padding: "0 22px", opacity: pages.length ? 1 : 0.5 }}>Save {pages.length > 1 ? `${pages.length} pages ` : ""}as PDF</button>
            <button onClick={() => { setPages([]); setStage("pick"); }} style={btnOutline}>Cancel</button>
          </div>
        </>
      )}

      {stage === "reading" && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ position: "relative", width: 120, height: 150, borderRadius: 14, background: "#fff", border: `1px solid ${C.line12}`, boxShadow: "0 24px 50px -30px rgba(29,35,39,.45)", marginBottom: 28, overflow: "hidden" }}>
            {[18, 34, 50, 66, 82, 98, 114].map((y, i) => <span key={y} style={{ position: "absolute", left: 16, top: y, height: 6, width: [70, 86, 60, 80, 50, 76, 64][i], borderRadius: 3, background: "#ECE9E4" }} />)}
            <span style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#1FA9B0,transparent)", boxShadow: "0 0 14px #1FA9B0", animation: "mhs-scan 2.2s ease-in-out infinite" }} />
          </div>
          <h1 style={{ ...h1, fontSize: 28 }}>Reading your report…</h1>
          <p style={{ ...lead, marginBottom: 22 }}>This usually takes 10–30 seconds. You can stay here.</p>
          <ProcessSteps steps={READ_STEPS} at={step} />
        </div>
      )}

      {stage === "review" && doc && <Review doc={doc} onDone={(d) => { setDoc(d); setStage("done"); }} onDiscard={async () => { await api(`/api/portal/documents/${doc.id}`, { method: "DELETE" }).catch(() => {}); invalidate(EP.docs); setDoc(null); setStage("pick"); setPages([]); }} />}

      {stage === "done" && doc && (
        <div style={{ textAlign: "left", animation: "mhs-fadeUp 400ms ease" }}>
          <span style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(110,168,182,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><NIcon name="check" size={32} tone={C.tealDark} stroke={2.2} /></span>
          <h1 style={h1}>Added to your Health Space</h1>
          <p style={lead}>{doc.title}{doc.provider ? ` from ${doc.provider}` : ""} is now part of your health story. The original is saved unchanged.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => go("doc", { id: doc.id })} className="h-primary" style={btnPrimary}>View report</button>
            <button onClick={() => { setDoc(null); setPages([]); setMode(null); setStage("pick"); }} style={btnSecondary}>Add another</button>
            <button onClick={() => tab("assessment")} style={btnOutline}>Create Doctor Report</button>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div role="alert" style={{ padding: 22, borderRadius: 20, background: C.peach, maxWidth: 560 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 500, color: C.peachInk }}>We couldn't add this file</h2>
          <p style={{ margin: "0 0 14px", fontSize: 15, color: C.ink2 }}>{err}</p>
          <button onClick={() => setStage(mode === "scan" && pages.length ? "pages" : "pick")} style={{ ...btnOutline, background: C.card }}>Try again</button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// FOOD
// ════════════════════════════════════════════════════════════════════════
type FoodLog = { id: string; day: string; at: string; meal: string; text: string; portion: string | null; tags: string[]; photo: string | null };
type FoodDTO = { today: string; logs: FoodLog[]; patterns: { meals7: number; daysLogged7: number; plants: number; protein: number; fibre: number; processed: number; breakfastDays: number; water: number }; note: string | null };
const MEALS = [["breakfast", "Breakfast", "sun"], ["lunch", "Lunch", "food"], ["dinner", "Dinner", "moon"], ["snack", "Snack", "apple"], ["drink", "Drink", "cup"]] as const;
const mealNow = () => { const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 17 ? "snack" : "dinner"; };
const TAG_TONE = (t: string) => (/vegetables|fruit|fibre|whole-grain|protein|healthy-fat|water|home-cooked/.test(t) ? { bg: "rgba(110,168,182,.16)", ink: C.tealDark } : /processed|fried|sugary|salty|alcohol/.test(t) ? { bg: "#FFF1E6", ink: C.peachInk } : { bg: "#EFECE8", ink: C.ink3 });

export function Food() {
  const { toast, openSheet } = usePortal();
  const { data, error, reload } = useResource<FoodDTO>(EP.food);
  const [meal, setMeal] = useState<string>(mealNow());
  const [text, setText] = useState("");
  const [portion, setPortion] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  if (!data) return <Loading error={error} retry={reload} />;
  const p = data.patterns;
  const log = async () => {
    if (!text.trim() && !photo) return;
    setBusy(true);
    try { await api(EP.food, { body: { meal, text, portion, photo } }); setText(""); setPhoto(null); setPortion(null); invalidate(EP.space); await load(EP.food, true); toast("Meal logged"); }
    catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const del = async (id: string) => { try { await api(`/api/portal/food/${id}`, { method: "DELETE" }); await load(EP.food, true); } catch (e: any) { toast(e.message); } };
  const byDay = data.logs.reduce<Record<string, FoodLog[]>>((m, l) => { (m[l.day] ||= []).push(l); return m; }, {});
  const dayName = (d: string) => (d === data.today ? "Today" : new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }));
  return (
    <div style={page}>
      <h1 style={h1}>Food</h1>
      <p style={lead}>Not a calorie counter. A simple way for Neyu to understand how you eat — so your plan and your doctor summary reflect real life.</p>

      <section style={{ ...cardBox, padding: 20, marginBottom: 28 }}>
        <div role="radiogroup" aria-label="Meal" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {MEALS.map(([k, l, ic]) => <button key={k} role="radio" aria-checked={meal === k} onClick={() => setMeal(k)} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${meal === k ? "transparent" : C.line12}`, background: meal === k ? C.ink : "transparent", color: meal === k ? "#fff" : C.ink2, fontSize: 14, cursor: "pointer" }}><NIcon name={ic} size={15} tone="currentColor" />{l}</button>)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && log()} placeholder="What did you have? e.g. dal, rice and salad" aria-label="What did you eat" style={{ ...inp, flex: "1 1 260px", height: 48, fontSize: 16 }} />
          <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { try { setPhoto(await enhance(f, false)); } catch { toast("That photo couldn't be read."); } } }} />
          <button onClick={() => camRef.current?.click()} aria-label="Add a food photo" style={{ ...btnOutline, height: 48, display: "flex", alignItems: "center", gap: 8 }}><NIcon name="camera" size={18} tone={C.teal} /><span className="mhs-hide-sm">Photo</span></button>
          <button onClick={log} disabled={busy || (!text.trim() && !photo)} className="h-primary" style={{ ...btnPrimary, height: 48, opacity: busy || (!text.trim() && !photo) ? 0.55 : 1 }}>{busy ? "Logging…" : "Log"}</button>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <span style={{ fontSize: 13, color: C.muted, marginRight: 4 }}>Portion</span>
          {["small", "regular", "large"].map((x) => <button key={x} onClick={() => setPortion(portion === x ? null : x)} aria-pressed={portion === x} style={{ height: 30, padding: "0 12px", borderRadius: 15, border: `1px solid ${portion === x ? "transparent" : C.line12}`, background: portion === x ? C.tealChip : "transparent", color: portion === x ? C.tealDark : C.ink2, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>{x}</button>)}
          {photo && <span style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}><img src={photo} alt="Food photo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} /><button onClick={() => setPhoto(null)} style={btnLink}>Remove</button></span>}
        </div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <SecHead title="This week" sub={`${p.meals7} meals over ${p.daysLogged7} day${p.daysLogged7 === 1 ? "" : "s"}`} />
        {p.meals7 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><Ring value={p.plants} size={92} stroke={8} label={<><Ticker value={p.plants} />%</>} /><span style={{ fontSize: 13, color: C.muted }}>Fruit & veg</span></div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><Ring value={p.protein} size={92} stroke={8} label={<><Ticker value={p.protein} />%</>} /><span style={{ fontSize: 13, color: C.muted }}>Protein</span></div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><Ring value={p.fibre} size={92} stroke={8} label={<><Ticker value={p.fibre} />%</>} /><span style={{ fontSize: 13, color: C.muted }}>Fibre</span></div>
            </div>
            <div style={{ padding: "16px 18px", borderRadius: 18, background: C.lav }}>
              <div style={{ marginBottom: 8 }}><AiTag label="Neyu noticed" /></div>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6 }}>{data.note || "Log a few more meals this week and Neyu will share what it notices."}</p>
              {p.processed > 0 && <p style={{ margin: "8px 0 0", fontSize: 13.5, color: C.muted }}>{p.processed}% of meals were processed, fried or sugary.</p>}
              <button onClick={() => openSheet({ t: "alba", ask: "Based on my food log, what is one easy improvement for this week?" })} style={{ ...btnLink, color: C.lavInk, marginTop: 4 }}>Ask Neyu about my eating<NIcon name="arrow" size={14} tone="currentColor" /></button>
            </div>
          </div>
        ) : <EmptyCard icon="apple" title="Start with today's next meal" text="Type what you had or snap a photo. Neyu tags it (vegetables, protein, fibre…) and finds patterns over time." />}
      </section>

      {Object.keys(byDay).length > 0 && (
        <section>
          <SecHead title="Your log" sub="Last two weeks" />
          {Object.keys(byDay).sort().reverse().map((d) => (
            <div key={d} style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: C.muted }}>{dayName(d)}</h3>
              <AnimatedList gap={8} delay={50}>
                {byDay[d].map((l) => (
                  <div key={l.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: C.card, border: `1px solid ${C.line}` }}>
                    {l.photo ? <img src={l.photo} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", flex: "none" }} /> : <span style={{ width: 48, height: 48, borderRadius: 12, background: "#F3F1EE", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={MEALS.find((m) => m[0] === l.meal)?.[2] || "food"} size={20} tone={C.muted} /></span>}
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 15 }}><span style={{ color: C.muted, textTransform: "capitalize" }}>{l.meal}{l.portion ? ` · ${l.portion}` : ""} — </span>{l.text}</span>
                      {l.tags.length > 0 && <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{l.tags.slice(0, 6).map((t) => { const tt = TAG_TONE(t); return <span key={t} style={{ height: 22, padding: "0 8px", borderRadius: 11, background: tt.bg, color: tt.ink, fontSize: 12, display: "inline-flex", alignItems: "center" }}>{t.replace("-", " ")}</span>; })}</span>}
                    </span>
                    <button aria-label="Delete this meal" onClick={() => del(l.id)} style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer", color: C.faint, flex: "none" }}><NIcon name="x" size={15} tone="currentColor" /></button>
                  </div>
                ))}
              </AnimatedList>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PLAN — AI health plan (clearly labelled) next to the care-team protocol
// ════════════════════════════════════════════════════════════════════════
type PlanDTO = { plan: null | { intro: string; sections: { id: string; title: string; items: { title: string; detail: string }[] }[]; basedOn: string[]; createdAt: string; byAi: boolean } };
const PLAN_ICON: Record<string, string> = { move: "steps", food: "apple", sleep: "moon", habits: "target" };

export function Plan() {
  const { toast, tab } = usePortal();
  const { data, error, reload } = useResource<PlanDTO>(EP.plan);
  const [busy, setBusy] = useState(false), [step, setStep] = useState(0);
  const make = async () => {
    setBusy(true); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(3, s + 1)), 1800);
    try { await api(EP.plan, { method: "POST" }); await load(EP.plan, true); toast("Your plan is ready"); } catch (e: any) { toast(e.message); } finally { clearInterval(t); setBusy(false); }
  };
  if (!data) return <Loading error={error} retry={reload} />;
  const pl = data.plan;
  if (busy) return <div style={page}><h1 style={{ ...h1, fontSize: 28 }}>Creating your plan…</h1><p style={lead}>Neyu is looking at your activity, sleep, food, results and goals.</p><ProcessSteps steps={["Reviewing your recent data", "Checking your goals", "Choosing small, realistic steps", "Writing your plan"]} at={step} /></div>;
  return (
    <div style={page}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}><h1 style={{ ...h1, margin: 0 }}>Your health plan</h1><AiTag /></div>
      {!pl ? (
        <>
          <p style={lead}>Neyu can suggest simple steps for movement, food, sleep and habits — based on the information in your Health Space.</p>
          <Shine radius={24} style={{ maxWidth: 640 }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{["Movement", "Food", "Sleep", "Habits"].map((x, i) => <span key={x} style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 16, background: C.tealWash, color: C.tealDark, fontSize: 14 }}><NIcon name={Object.values(PLAN_ICON)[i]} size={15} tone="currentColor" />{x}</span>)}</div>
              <button onClick={make} className="h-primary" style={{ ...btnPrimary, height: 48, padding: "0 22px" }}>Create my plan</button>
              <p style={{ margin: "14px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>AI-generated guidance, not medical advice. Talk with your healthcare professional before big changes.</p>
            </div>
          </Shine>
        </>
      ) : (
        <>
          <p style={{ ...lead, marginBottom: 8 }}>{pl.intro}</p>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: C.faint }}>Created {new Date(pl.createdAt).toLocaleDateString("en-CA", { month: "long", day: "numeric" })}{pl.basedOn.length ? ` · based on ${pl.basedOn.join(", ")}` : ""}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 14, marginBottom: 22 }}>
            {pl.sections.map((s, si) => (
              <section key={s.id} style={{ ...cardBox, padding: 20, animation: `mhs-fadeUp 420ms ease ${si * 80}ms both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span style={{ width: 36, height: 36, borderRadius: 11, background: C.tealWash, display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name={PLAN_ICON[s.id] || "spark"} size={19} tone={C.teal} /></span><h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{s.title}</h2></div>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {s.items.map((it, i) => <li key={i} style={{ display: "flex", gap: 10 }}><span style={{ width: 22, height: 22, borderRadius: 11, border: `1.5px solid ${C.tealLight}`, fontSize: 12, color: C.tealDark, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: 1 }}>{i + 1}</span><span><span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{it.title}</span><span style={{ display: "block", fontSize: 14, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{it.detail}</span></span></li>)}
                </ol>
              </section>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={make} style={btnSecondary}>Refresh with my latest data</button>
            <button onClick={() => tab("protocol")} style={btnLink}>See your care team's protocol<NIcon name="arrow" size={14} tone="currentColor" /></button>
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.55, maxWidth: 640 }}>This plan is AI-generated guidance based on the information currently in your Health Space. It isn't medical advice — discuss bigger changes with your healthcare professional. Your care team's protocol always comes first.</p>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DOCTOR REPORT — Doctor Assessment: choose → prepare → preview → PDF
// ════════════════════════════════════════════════════════════════════════
type AssessDTO = {
  assessment: {
    generatedAt: string; days: number; patient: { name: string; age: number | null; sex: string | null; dob: string | null };
    activity: { label: string; value: string; n: number }[]; labs: { name: string; value: string; unit: string; ref: string; flag: string; date: string; source: string }[];
    reports: { id: string; date: string; title: string; kind: string; provider: string | null; summary: string; flagged: string[] }[]; newInfo: string[]; eating: string[]; physical: string[]; checkins: string | null; profileChanges: { date: string; text: string }[];
    history: { date: string; text: string }[]; conditions: string[]; medications: string[]; allergies: string[]; familyHistory: string[];
    nutrition: null | { meals: number; veg: number; protein: number; fibre: number; processed: number; diet: string | null };
    changes: Change[]; goals: string[]; documents: { id: string; title: string; kind: string; provider: string | null; date: string; inRange: boolean; pages: number }[]; sources: string[];
  };
  summary: string; observations: string[]; questions: string[]; byAi: boolean; gaps: Gap[];
};
const RANGES = [[30, "30 days"], [90, "3 months"], [180, "6 months"], [365, "1 year"], [3650, "All history"]] as const;
const SECTIONS = [["overview", "Patient overview"], ["medications", "Medications"], ["observations", "Neyu observations"], ["newinfo", "New information"], ["reports", "Report summaries"], ["activity", "Recent activity"], ["labs", "Lab results"], ["lifestyle", "Eating & activity"], ["profile", "Profile changes"], ["trends", "What changed"], ["nutrition", "Nutrition overview"], ["history", "Medical history"], ["goals", "Goals"], ["questions", "Questions for doctor"], ["sources", "Data sources"]] as const;
type PageInfo = { summaryPages: number; reports: { id: string; pages: number }[] };

export function Assessment() {
  const { toast, go } = usePortal();
  const [days, setDays] = useState(90);
  const [sections, setSections] = useState<string[]>(SECTIONS.map((s) => s[0]));
  const [stage, setStage] = useState<"setup" | "prep" | "preview">("setup");
  const [step, setStep] = useState(0);
  const [d, setD] = useState<AssessDTO | null>(null);
  const [docIds, setDocIds] = useState<string[]>([]);
  const [obs, setObs] = useState<string[]>([]), [qs, setQs] = useState<string[]>([]), [newQ, setNewQ] = useState(""), [summary, setSummary] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [readyFile, setReadyFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [dl, setDl] = useState<null | { print: boolean; info: PageInfo | null }>(null);
  const docs = useResource<{ documents: Doc[] }>(EP.docs).data?.documents.filter((x) => x.status === "saved") || [];

  const prepare = async () => {
    setStage("prep"); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(3, s + 1)), 1200);
    try {
      const r = await api<AssessDTO>(`/api/portal/assessment?days=${days}`);
      setD(r); setObs(r.observations); setQs(r.questions); setSummary(r.summary || "");
      setDocIds(r.assessment.documents.filter((x) => x.inRange).map((x) => x.id).slice(0, 10));
      setStep(4); setTimeout(() => setStage("preview"), 300);
    } catch (e: any) { toast(e.message); setStage("setup"); } finally { clearInterval(t); }
  };
  const body = (extra: Record<string, unknown> = {}) => JSON.stringify({ days, sections, docIds, observations: sections.includes("observations") ? obs : [], questions: qs, summary, ...extra });
  // Step 1 of download: ask about attaching originals, showing page counts.
  const askDownload = async (print: boolean) => {
    setDl({ print, info: null });
    try {
      const res = await fetch("/api/portal/assessment/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: body({ dryRun: true }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error || "Couldn't count pages.");
      setDl({ print, info: j });
    } catch (e: any) { setDl(null); toast(e.message); }
  };
  const pdf = async (withReports: boolean) => {
    if (!d || !dl) return;
    const print = dl.print; setPdfBusy(true);
    try {
      const res = await fetch("/api/portal/assessment/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: body({ docIds: withReports ? docIds : [] }) });
      if (!res.ok) throw new ApiError((await res.json().catch(() => ({})))?.error || "We couldn't create the PDF.", res.status);
      const blob = await res.blob(), url = URL.createObjectURL(blob);
      const fname = `Doctor-Assessment-${new Date().toISOString().slice(0, 10)}.pdf`;
      if (isIOS() || isNeyuApp()) {
        // iPhone / app: a hidden download or print frame is ignored — use the share sheet (Print is in it).
        URL.revokeObjectURL(url); setReadyFile({ blob, name: fname });
      } else if (print) {
        const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; f.src = url; document.body.appendChild(f);
        f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch { window.open(url, "_blank"); } setTimeout(() => f.remove(), 60_000); };
      } else {
        URL.revokeObjectURL(url); await saveFile(blob, fname);
        toast("PDF saved to your device");
      }
      setDl(null);
    } catch (e: any) { toast(e.message); } finally { setPdfBusy(false); }
  };
  const tog = (arr: string[], set: (x: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);

  if (stage === "prep") return <div style={page}><h1 style={{ ...h1, fontSize: 28 }}>Preparing your Doctor Visit summary…</h1><p style={lead}>Neyu is organising everything in your Health Space for your doctor.</p><ProcessSteps steps={["Gathering results, reports and activity", "Summarising each report with its date", "Looking at eating, activity and profile changes", "Writing a 30-second summary and questions"]} at={step} /></div>;

  if (stage === "setup" || !d) return (
    <div style={page}>
      <span style={{ fontSize: 13, letterSpacing: ".12em", color: C.teal, fontWeight: 500 }}>DOCTOR VISIT MODE</span>
      <h1 style={{ ...h1, marginTop: 8 }}>Walk into any appointment prepared.</h1>
      <p style={lead}>One clear summary of your health for any doctor — with a 30-second overview, what changed, short summaries of every report with dates, how you eat and move, and your questions. You review everything first.</p>
      <Shine radius={26} style={{ maxWidth: 860 }}>
        <div style={{ padding: "24px 24px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 500 }}>Since when?</h2>
            <div role="radiogroup" aria-label="Time period" style={{ display: "inline-flex", flexWrap: "wrap", padding: 3, borderRadius: 12, background: "#ECE9E4", gap: 2 }}>
              {RANGES.map(([v, l]) => <button key={v} role="radio" aria-checked={days === v} onClick={() => setDays(v)} style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 9, background: days === v ? C.card : "transparent", boxShadow: days === v ? "0 1px 3px rgba(29,35,39,.1)" : "none", fontSize: 14, fontWeight: 500, color: days === v ? C.ink : C.muted, cursor: "pointer" }}>{l}</button>)}
            </div>
          </div>
          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 500 }}>Include</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SECTIONS.map(([k, l]) => { const on = sections.includes(k); return <button key={k} aria-pressed={on} onClick={() => tog(sections, setSections, k)} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 18, border: `1px solid ${on ? "transparent" : C.line12}`, background: on ? C.tealChip : "transparent", color: on ? C.tealDark : C.muted, fontSize: 14, cursor: "pointer" }}><NIcon name={on ? "check" : "plus"} size={14} tone="currentColor" stroke={2} />{l}</button>; })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={prepare} disabled={!sections.length} className="h-primary" style={{ ...btnPrimary, height: 50, padding: "0 24px", fontSize: 16 }}>Create Doctor Assessment</button>
            <span style={{ fontSize: 13, color: C.muted }}>{docs.length} report{docs.length === 1 ? "" : "s"} in your Health Space</span>
          </div>
        </div>
      </Shine>
      <p style={{ margin: "18px 0 0", display: "flex", gap: 8, fontSize: 13, color: C.muted, lineHeight: 1.5, maxWidth: 760 }}><NIcon name="shieldCheck" size={16} tone={C.teal} />Nothing is sent to anyone. The PDF is only created on your request and saved to your device — you decide who gets it.</p>
    </div>
  );

  const a = d.assessment, on = (k: string) => sections.includes(k);
  const H = ({ children, sub }: { children: React.ReactNode; sub?: string }) => <div style={{ margin: "26px 0 10px", paddingLeft: 10, borderLeft: `3px solid #1B8FD0` }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{children}</h3>{sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.faint }}>{sub}</p>}</div>;
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,38%) 1fr", gap: 12, padding: "8px 0", borderBottom: "1px solid #EEF0F1", fontSize: 14 }}><span style={{ color: C.muted }}>{k}</span><span>{v}</span></div>;
  const Bul = ({ xs, empty }: { xs: string[]; empty: string }) => xs.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>{xs.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>{empty}</p>;
  const none = <span style={{ color: C.faint }}>None recorded</span>;
  const info = dl?.info, pagesOf = (id: string) => info?.reports.find((r) => r.id === id)?.pages || 0;
  const withPages = info ? info.summaryPages + docIds.reduce((n, id) => n + pagesOf(id), 0) : 0;
  return (
    <div style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <div><h1 style={{ ...h1, fontSize: 28 }}>Your Doctor Assessment</h1><p style={{ margin: 0, fontSize: 15, color: C.muted }}>Review and edit Neyu's notes — then download or print.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setStage("setup")} style={btnOutline}>Change options</button>
          <button onClick={() => askDownload(true)} disabled={pdfBusy} style={{ ...btnSecondary, height: 44 }}>Print</button>
          <button onClick={() => askDownload(false)} disabled={pdfBusy} className="h-primary" style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 8 }}><NIcon name="download" size={16} tone="#fff" />Download PDF</button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <article aria-label="Doctor Assessment preview" style={{ flex: "999 1 560px", minWidth: 0, background: "#fff", borderRadius: 18, boxShadow: "0 1px 2px rgba(29,35,39,.06), 0 40px 80px -50px rgba(29,35,39,.45)", padding: "clamp(20px,4vw,40px)", border: `1px solid ${C.line}` }}>
          <div style={{ margin: "-4px -4px 18px", padding: "18px 18px 16px", borderRadius: 12, background: "#EEF7FB" }}>
            <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#1B8FD0", fontWeight: 500 }}>DOCTOR ASSESSMENT</span>
            <h2 style={{ margin: "6px 0 4px", fontSize: 24, fontWeight: 500 }}>{a.patient.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.ink2 }}>{[a.patient.age != null ? `Age ${a.patient.age}` : "", a.patient.sex, a.patient.dob ? `DOB ${a.patient.dob}` : "", RANGES.find((r) => r[0] === days)?.[1], `Prepared ${new Date(a.generatedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}`].filter(Boolean).join(" · ")}</p>
          </div>
          <p style={{ margin: "0 0 4px", padding: "10px 12px", borderRadius: 10, background: "#FFF6E3", color: "#8A5A12", fontSize: 12.5, lineHeight: 1.5 }}>AI-generated patient health summary — not a medical diagnosis. Values are reproduced from their sources; original reports can be attached unchanged.</p>

          <H sub="Written by Neyu from the data below — edit anything before downloading">30-second summary</H>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} aria-label="30-second summary" style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.line12}`, fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.6, color: C.ink, resize: "vertical", boxSizing: "border-box" }} />

          {on("newinfo") && a.newInfo.length > 0 && <><H>New information in this period</H><Bul xs={a.newInfo} empty="" /></>}
          {on("overview") && <><H>Patient overview</H><Row k="Conditions (patient-reported)" v={a.conditions.join("; ") || none} /><Row k="Allergies" v={a.allergies.join("; ") || none} /><Row k="Family history" v={a.familyHistory.join("; ") || none} /></>}
          {on("medications") && <><H sub="As listed by the patient">Medications</H><Bul xs={a.medications} empty="None recorded" /></>}
          {on("observations") && (
            <><H sub="AI-generated from the data in this report — edit or remove anything">Summary observations</H>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {obs.map((o, i) => <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, lineHeight: 1.55 }}><span style={{ width: 5, height: 5, borderRadius: 3, background: "#1B8FD0", marginTop: 8, flex: "none" }} /><span style={{ flex: 1 }}>{o}</span><button aria-label="Remove observation" onClick={() => setObs(obs.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.faint, cursor: "pointer" }}><NIcon name="x" size={13} tone="currentColor" /></button></li>)}
                {!obs.length && <li style={{ fontSize: 14, color: C.faint }}>No observations.</li>}
              </ul></>
          )}
          {on("reports") && (
            <><H sub="Short summary of each report with its date — the original is the medical record">Reports</H>
              {a.reports.length ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{a.reports.map((r) => (
                <div key={r.id} style={{ paddingBottom: 10, borderBottom: "1px solid #EEF0F1" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ fontSize: 13, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.date}</span><span style={{ fontSize: 14.5, fontWeight: 500 }}>{r.title}</span>{r.provider && <span style={{ fontSize: 12.5, color: C.faint }}>{r.provider}</span>}</div>
                  <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.55, color: C.ink2 }}>{r.summary}</p>
                  {r.flagged.length > 0 && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8A5A12" }}>Flagged on the report: {r.flagged.join("; ")}</p>}
                </div>))}</div> : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>No reports in this period.</p>}</>
          )}
          {on("activity") && <><H sub="Daily averages from connected devices and home readings">Recent health activity</H>{a.activity.length ? a.activity.map((r) => <Row key={r.label} k={r.label} v={<>{r.value}{r.n ? <span style={{ color: C.faint }}> · {r.n} {r.label.includes("pressure") ? "readings" : "days"}</span> : null}</>} />) : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>No device or home readings in this period.</p>}</>}
          {on("labs") && <><H sub="Most recent value per test · flags as printed or against the stated range">Laboratory results</H>{a.labs.length ? (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}><thead><tr style={{ color: C.muted, textAlign: "left" }}><th style={{ fontWeight: 500, padding: "6px 6px 6px 0" }}>Test</th><th style={{ fontWeight: 500, padding: 6 }}>Result</th><th style={{ fontWeight: 500, padding: 6 }}>Reference</th><th style={{ fontWeight: 500, padding: 6 }}>Date · source</th></tr></thead>
              <tbody>{a.labs.map((l) => { const f = l.flag && l.flag !== "in range"; return <tr key={l.name + l.date} style={{ borderTop: "1px solid #EEF0F1" }}><td style={{ padding: "7px 6px 7px 0" }}>{l.name}</td><td style={{ padding: 7, fontWeight: f ? 500 : 400, color: f ? "#8A5A12" : C.ink }}>{l.value} {l.unit}{f ? ` (${l.flag})` : ""}</td><td style={{ padding: 7, color: C.ink2 }}>{l.ref || "—"}</td><td style={{ padding: 7, color: C.muted, fontSize: 12.5 }}>{l.date} · {l.source}</td></tr>; })}</tbody></table></div>
          ) : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>No laboratory results in this period.</p>}</>}
          {on("lifestyle") && <><H sub="From the food log, devices and weekly check-ins">Daily life</H>
            <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 500 }}>Eating habits</p><Bul xs={a.eating} empty="No food information in this period." />
            <p style={{ margin: "12px 0 4px", fontSize: 13.5, fontWeight: 500 }}>Physical activity</p><Bul xs={a.physical} empty="No activity information in this period." />
            {a.checkins && <><p style={{ margin: "12px 0 4px", fontSize: 13.5, fontWeight: 500 }}>Weekly check-ins</p><Bul xs={[a.checkins]} empty="" /></>}</>}
          {on("profile") && <><H sub="What the patient updated, with dates">Recent profile changes</H><Bul xs={a.profileChanges.map((c) => `${c.date} — ${c.text}`)} empty="No profile changes in this period." /></>}
          {on("trends") && <><H>What changed</H>{a.changes.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>{a.changes.map((c, i) => <li key={i}>{c.status !== "new" && <b style={{ fontWeight: 500 }}>{STATUS[c.status]?.label}: </b>}{c.text}</li>)}</ul> : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>Not enough history to compare yet.</p>}</>}
          {on("nutrition") && <><H sub="High-level pattern from the food log">Nutrition overview</H>{a.nutrition ? <>{a.nutrition.diet && <Row k="Eating pattern" v={a.nutrition.diet} />}{a.nutrition.meals > 0 && <><Row k="Meals logged" v={a.nutrition.meals} /><Row k="With fruit or vegetables" v={`${Math.round((a.nutrition.veg / a.nutrition.meals) * 100)}%`} /><Row k="With protein" v={`${Math.round((a.nutrition.protein / a.nutrition.meals) * 100)}%`} /><Row k="Processed, fried or sugary" v={`${Math.round((a.nutrition.processed / a.nutrition.meals) * 100)}%`} /></>}</> : <p style={{ margin: 0, fontSize: 14, color: C.faint }}>No food log in this period.</p>}</>}
          {on("history") && <><H>Medical history in this period</H><Bul xs={a.history.map((h) => `${h.date} — ${h.text}`)} empty="No visits or reports in this period." /></>}
          {on("goals") && <><H>Patient goals</H><Bul xs={a.goals} empty="No goals set." /></>}
          {on("questions") && (
            <><H sub="Yours, plus suggestions from Neyu">Questions for the doctor</H>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
                {qs.map((q, i) => <li key={i}><span style={{ display: "flex", gap: 8 }}><span style={{ flex: 1 }}>{q}</span><button aria-label="Remove question" onClick={() => setQs(qs.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.faint, cursor: "pointer" }}><NIcon name="x" size={13} tone="currentColor" /></button></span></li>)}
              </ol>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={newQ} onChange={(e) => setNewQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newQ.trim()) { setQs([...qs, newQ.trim()]); setNewQ(""); } }} placeholder="Add your own question" style={{ ...inp, height: 38, fontSize: 14 }} /><button onClick={() => { if (newQ.trim()) { setQs([...qs, newQ.trim()]); setNewQ(""); } }} style={{ ...btnOutline, height: 38 }}>Add</button></div></>
          )}
          {on("sources") && <><H>Data sources</H><p style={{ margin: 0, fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>{a.sources.join(" · ") || "Patient-entered information only."}</p></>}
          <p style={{ margin: "26px 0 0", paddingTop: 12, borderTop: "1px solid #EEF0F1", fontSize: 11.5, color: C.faint }}>AI-generated patient health summary · not a diagnosis · NEYU Health My Health Space</p>
        </article>

        <aside style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <section style={{ ...cardBox, padding: 18 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500 }}>In this summary</h2>
            <p style={{ margin: 0, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{a.reports.length} report summaries · {a.labs.length} lab values · {a.activity.length} activity measures{a.eating.length ? " · eating habits" : ""}{a.profileChanges.length ? ` · ${a.profileChanges.length} profile changes` : ""}</p>
            {!a.documents.length && <p style={{ margin: "10px 0 0", fontSize: 14, color: C.muted }}>No reports yet. <button onClick={() => go("add")} style={{ ...btnLink, display: "inline", height: "auto" }}>Add one</button></p>}
          </section>
          {d.gaps.length > 0 && (
            <section style={{ padding: 18, borderRadius: 20, background: "#F3F1EE" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>Not in your record yet</h2>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13.5, color: C.ink2, lineHeight: 1.55 }}>{d.gaps.slice(0, 4).map((g) => <li key={g.text}>{g.text}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>

      {/* Download: Neyu asks about attaching the original reports and shows page counts */}
      {dl && (
        <div role="dialog" aria-modal="true" aria-label="Attach original reports" onClick={() => !pdfBusy && setDl(null)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(29,35,39,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "mhs-fadeIn 200ms ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86vh", overflow: "auto", background: C.card, borderRadius: 22, padding: 24, boxShadow: "0 40px 80px -30px rgba(29,35,39,.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><AiTag label="Neyu" /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Attach your original reports?</h2></div>
            <p style={{ margin: "0 0 16px", fontSize: 14.5, color: C.muted, lineHeight: 1.55 }}>Your summary already includes a short summary of each report with its date. Attaching the originals gives your doctor the full documents — but makes the PDF longer.</p>
            {!info ? <div aria-busy="true" style={{ padding: "18px 0", color: C.muted, fontSize: 14 }}>Counting pages…</div> : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14.5 }}><span>Doctor Assessment summary</span><span style={{ color: C.muted }}>{info.summaryPages} page{info.summaryPages === 1 ? "" : "s"}</span></div>
                {a.documents.map((x) => (
                  <label key={x.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={docIds.includes(x.id)} onChange={() => tog(docIds, setDocIds, x.id)} style={{ width: 18, height: 18, marginTop: 2 }} />
                    <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, fontSize: 14 }}><span>{x.title}</span><span style={{ fontSize: 12.5, color: C.muted }}>{x.date} · {x.provider || "Added by you"}{x.inRange ? "" : " · outside this period"}</span></span>
                    <span style={{ fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>{pagesOf(x.id)} pages</span>
                  </label>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  <button onClick={() => pdf(true)} disabled={pdfBusy || !docIds.length} className="h-primary" style={{ ...btnPrimary, height: 48, opacity: docIds.length ? 1 : 0.5 }}>{pdfBusy ? "Creating PDF…" : `${dl.print ? "Print" : "Download"} with ${docIds.length} report${docIds.length === 1 ? "" : "s"} — ${withPages} pages`}</button>
                  <button onClick={() => pdf(false)} disabled={pdfBusy} style={{ ...btnSecondary, height: 48 }}>{dl.print ? "Print" : "Download"} summary only — {info.summaryPages} page{info.summaryPages === 1 ? "" : "s"}</button>
                  <button onClick={() => setDl(null)} disabled={pdfBusy} style={{ ...btnLink, justifyContent: "center" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <FileReady file={readyFile} onClose={() => setReadyFile(null)} />
    </div>
  );
}
