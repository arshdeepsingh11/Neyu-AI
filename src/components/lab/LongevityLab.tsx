"use client";

// NEYU Longevity Lab — five research-backed, interactive explainers that turn
// 2022–2026 aging science into plain language, with Neyu, 3D models, charts,
// an AI intake, a page-turning Research Library and BioAro test CTAs.
import React, { useEffect, useRef, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import AskPanel from "@/components/specialty/AskPanel";
import Assessment from "./assess";
import ResearchBook from "./book";
import { Helix3D } from "./three";
import { Responsiveness, StressMap, PaceVsAge, PgxSafety, GeneticsPathways } from "./features";
import { LAB_STATS, PATHWAYS, PAPERS, CONSULT_HREF, type FeatureId } from "@/data/longevityScience";
import { T, wrap, card, btnInk, eyebrow, h2, aiText, CountUp } from "@/components/nea/ui";
import { NIcon } from "@/components/neyu/icons";
import { N, Kicker, IconTile, cardN, btn, gradText, FlowLines } from "@/components/neyu/kit";
import { PillNav } from "@/components/neyu/fx";

type Tab = "overview" | FeatureId | "library" | "alba";
const TABS: { v: Tab; label: string; icon: string }[] = [
  { v: "overview", label: "Overview", icon: "layers" },
  { v: "respond", label: "What works", icon: "loop" },
  { v: "stress", label: "Cell stress", icon: "cell" },
  { v: "pace", label: "Pace of aging", icon: "gauge" },
  { v: "pgx", label: "Medicine safety", icon: "pill" },
  { v: "genes", label: "Longevity genes", icon: "dna" },
  { v: "library", label: "Research library", icon: "book" },
  { v: "alba", label: "Ask Neyu", icon: "spark" },
];
const FEATURES: { v: FeatureId; n: number; title: string; blurb: string; icon: string; color: string; tests: string }[] = [
  { v: "respond", n: 1, title: "Intervention Responsiveness Explorer", blurb: "Which diets, habits and treatments actually shifted aging clocks in 51 human studies.", icon: "loop", color: "#2E7D5B", tests: "Inflammation Aging panels" },
  { v: "stress", n: 2, title: "GDF-15 + Telomere Stress Map", blurb: "A 3D chromosome shows how a cellular stress signal and telomere length move together.", icon: "cell", color: "#C2477E", tests: "GDF-15 · Telomere Length" },
  { v: "pace", n: 3, title: "Pace of Aging vs Biological Age", blurb: "Odometer vs speedometer: see how the speed of aging changes where you’re headed.", icon: "gauge", color: "#2A78D6", tests: "Inflammation · GDF-15 · Telomeres" },
  { v: "pgx", n: 4, title: "Pharmacogenomics Safety Check", blurb: "Pick your medicines and watch which of your genes shape how they work.", icon: "pill", color: "#1D5FA8", tests: "Pharmacogenomics" },
  { v: "genes", n: 5, title: "Longevity Genetics Pathways", blurb: "Explore the pathways centenarians’ genomes have in common on a 3D helix.", icon: "dna", color: "#1D5FA8", tests: "WGS 30X · 100X" },
];
const ASK = ["What is biological age vs pace of aging?", "Why test GDF-15 and telomeres together?", "Which habits have the best evidence for slowing aging?", "What does pharmacogenomic testing show?", "30X vs 100X genome sequencing?"];

function Hero({ onAsk, onGo }: { onAsk: (q: string) => void; onGo: (t: Tab) => void }) {
  const [q, setQ] = useState("");
  const [node, setNode] = useState<string | null>(null);
  const p = PATHWAYS.find((x) => x.id === node);
  return (
    <section style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(24px,4vw,56px)", alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18, minWidth: 0 }}>
        <Kicker label="Longevity · NEYU Longevity Lab" badge="AI-guided · research-backed" />
        <h1 style={{ margin: 0, fontSize: "clamp(40px,6vw,76px)", lineHeight: 1, letterSpacing: "-.045em", fontWeight: 500, color: N.ink }}>
          The science of aging, <span style={gradText}>made personal.</span>
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.6, color: N.ink2, maxWidth: 600 }}>Five interactive explainers built from peer-reviewed studies (2022–2026) — with 3D models, live charts and Neyu to answer your questions. Then measure your own biology with BioAro Labs and review it with an NEYU physician.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length > 1) onAsk(q.trim()); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 14px", borderRadius: 999, background: "#fff", border: `1px solid ${N.line}`, boxShadow: "0 18px 40px -30px rgba(14,27,44,.45)", maxWidth: 580 }}>
          <AlbaOrb size={24} />
          <input value={q} onChange={(e) => setQ(e.target.value)} size={1} aria-label="Ask Neyu about longevity science" placeholder="Ask Neyu — “What slows biological aging?”" style={{ flex: 1, minWidth: 0, width: 0, height: 44, border: 0, outline: "none", background: "transparent", fontSize: 16, color: N.ink }} />
          <button type="submit" style={{ ...btn("grad"), height: 44 }}>Ask Neyu<NIcon name="arrow" size={16} tone="light" /></button>
        </form>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ASK.slice(0, 3).map((x) => <button key={x} onClick={() => onAsk(x)} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 12px", borderRadius: 999, border: `1px solid ${N.line}`, background: "#fff", color: N.ink2, fontSize: 13.5, cursor: "pointer", textAlign: "left" }}><NIcon name="spark" size={13} tone="grad" />{x}</button>)}
        </div>
      </div>
      <div style={{ position: "relative", minWidth: 0, borderRadius: 28, overflow: "hidden", background: "radial-gradient(120% 90% at 85% 5%, rgba(34,115,214,.35) 0%, transparent 55%), radial-gradient(90% 80% at 5% 100%, rgba(47,191,148,.28) 0%, transparent 60%), linear-gradient(150deg,#0B1622 0%,#0E1B2C 60%,#0B1A24 100%)", boxShadow: "0 40px 80px -50px rgba(14,27,44,.7)" }}>
        <Helix3D nodes={PATHWAYS.map(({ id, name, color }) => ({ id, name, color }))} active={node} onPick={setNode} height={440} />
        <div aria-live="polite" style={{ position: "absolute", left: 14, right: 14, bottom: 14, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", fontSize: 13.5, lineHeight: 1.45, color: "rgba(234,242,246,.92)" }}>
          {p ? <><b style={{ fontWeight: 600, color: "#7EE0C0" }}>{p.name}.</b> {p.text} <button onClick={() => onGo("genes")} style={{ border: 0, background: "none", color: "#7EE0C0", cursor: "pointer", padding: 0, fontSize: 13.5 }}>Explore →</button></> : "Tap a glowing node on the helix to meet a longevity pathway · drag to rotate"}
        </div>
      </div>
    </section>
  );
}

export default function LongevityLab() {
  const [tab, setTabState] = useState<Tab>("overview");
  const [seed, setSeed] = useState("");
  const bar = useRef<HTMLDivElement>(null);
  const valid = (t: string): t is Tab => TABS.some((x) => x.v === t);
  const setTab = (t: Tab, scroll = true) => {
    setTabState(t);
    const u = new URL(window.location.href); u.hash = t === "overview" ? "" : t;
    window.history.replaceState(null, "", u.pathname + u.search + (t === "overview" ? "" : "#" + t));
    if (scroll && bar.current) { const y = bar.current.getBoundingClientRect().top + window.scrollY - 90; if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" }); }
  };
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (valid(h)) setTabState(h); };
    read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Links like "#pace" inside the intake result switch tabs instead of jumping.
  useEffect(() => {
    const click = (e: MouseEvent) => { const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null; if (!a) return; const h = a.getAttribute("href")!.slice(1); if (valid(h)) { e.preventDefault(); setTab(h); } };
    document.addEventListener("click", click); return () => document.removeEventListener("click", click);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ask = (q: string) => { setSeed(q); setTab("alba"); };

  return (
    <div style={{ color: T.ink, paddingBottom: 90 }}>
      <style>{`.sx-tabs::-webkit-scrollbar{display:none}.sx-bar{top:10px;transition:top .28s ease}@media (max-width:859px){.sx-bar{top:calc(var(--neyu-topbar,56px) + env(safe-area-inset-top))}html[data-chrome="hidden"] .sx-bar{top:env(safe-area-inset-top)}}`}</style>
      <div style={{ position: "relative", overflow: "hidden", padding: "clamp(28px,5vw,64px) 0 clamp(20px,3vw,36px)", background: "radial-gradient(900px 480px at 90% 0%, rgba(34,115,214,.09), transparent 60%), radial-gradient(800px 500px at 0% 30%, rgba(47,191,148,.09), transparent 60%)" }}>
        <FlowLines opacity={0.45} />
        <div style={{ ...wrap, position: "relative" }}><Hero onAsk={ask} onGo={(t) => setTab(t)} /></div>
      </div>

      <div ref={bar} aria-hidden style={{ height: 0 }} />
      <div className="sx-bar" style={{ position: "sticky", zIndex: 40, marginTop: 20, display: "flex", justifyContent: "center", padding: "0 12px" }}>
        <div style={{ maxWidth: "100%", overflowX: "auto", scrollbarWidth: "none" }} className="sx-tabs"><PillNav label="Longevity Lab sections" size="sm" tabs={TABS.map((t) => ({ k: t.v, label: t.label, icon: t.icon }))} value={tab} onChange={(k) => setTab(k as Tab)} /></div>
      </div>

      <main key={tab} style={{ ...wrap, marginTop: "clamp(22px,3vw,32px)", animation: "fadeUp .35s ease", display: "grid", gap: "clamp(20px,3vw,32px)" }}>
        {tab === "overview" && <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 12 }}>
            {LAB_STATS.map((s) => (
              <div key={s.l} style={{ ...card, padding: "18px 20px", display: "grid", gap: 6 }}>
                <b style={{ fontWeight: 500, fontSize: "clamp(32px,3.4vw,42px)", letterSpacing: "-.035em" }}><span style={aiText}>{s.p}{s.d ? s.v.toFixed(s.d) : <CountUp to={s.v} />}{s.s}</span></b>
                <span style={{ fontSize: 14, color: T.ink2, lineHeight: 1.4 }}>{s.l}</span>
                <span style={{ fontSize: 12, color: T.faint }}>{PAPERS.find((p) => p.id === s.src)?.journal} {PAPERS.find((p) => p.id === s.src)?.year}</span>
              </div>
            ))}
          </section>

          <section style={{ display: "grid", gap: 14 }}>
            <div><div style={{ ...eyebrow, color: N.tealText }}>Five explainers</div><h2 style={{ ...h2, fontSize: "clamp(26px,3.4vw,40px)" }}>Pick a question. <span style={aiText}>See the science.</span></h2></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 14 }}>
              {FEATURES.map((f) => (
                <button key={f.v} className="sx-card" onClick={() => setTab(f.v)} style={{ ...cardN, textAlign: "left", padding: 20, display: "grid", gap: 10, alignContent: "start", cursor: "pointer", color: N.ink }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><IconTile icon={f.icon} /><span style={{ fontSize: 12, letterSpacing: ".16em", color: N.faint }}>0{f.n}</span></span>
                  <b style={{ fontWeight: 500, fontSize: 18, letterSpacing: "-.01em" }}>{f.title}</b>
                  <span style={{ fontSize: 14.5, color: N.ink2, lineHeight: 1.5 }}>{f.blurb}</span>
                  <span style={{ fontSize: 13, color: N.tealText, display: "flex", justifyContent: "space-between", gap: 8 }}><span>{f.tests}</span><span style={{ color: N.blue }}>Open →</span></span>
                </button>
              ))}
              <button className="sx-card" onClick={() => setTab("library")} style={{ ...cardN, textAlign: "left", padding: 20, display: "grid", gap: 10, alignContent: "start", cursor: "pointer", color: N.ink, background: "linear-gradient(160deg,#FFFFFF,#F1F8F6)" }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><IconTile icon="book" /><span style={{ fontSize: 12, letterSpacing: ".16em", color: N.faint }}>LIBRARY</span></span>
                <b style={{ fontWeight: 500, fontSize: 18, letterSpacing: "-.01em" }}>The Research Library</b>
                <span style={{ fontSize: 14.5, lineHeight: 1.5, color: N.ink2 }}>{PAPERS.length} papers as a page-turning book — what each study found, what it means, and what it doesn’t.</span>
                <span style={{ fontSize: 13, color: N.blue }}>Open the book →</span>
              </button>
            </div>
          </section>

          <section style={{ display: "grid", gap: 14 }}>
            <div><div style={{ ...eyebrow, color: N.tealText }}>Your Longevity Lab intake</div><h2 style={{ ...h2, fontSize: "clamp(26px,3.4vw,40px)" }}>Tell Neyu about you. <span style={aiText}>Get your path.</span></h2><p style={{ margin: "8px 0 0", fontSize: 16, color: T.ink2, maxWidth: 720 }}>About 2 minutes. Age, sex, habits, medicines, family history and goals — Neyu ranks which explainers and tests fit you best. Nothing is stored unless you book.</p></div>
            <Assessment kind="lab" accent="#2E7D5B" />
          </section>

          <section style={{ borderRadius: 26, padding: "clamp(20px,4vw,40px)", background: "radial-gradient(600px 300px at 90% 0%, rgba(34,115,214,.35), transparent 60%), radial-gradient(500px 300px at 0% 100%, rgba(47,191,148,.25), transparent 60%), #0E1B2C", color: "#F7F5F1", display: "flex", gap: 20, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ maxWidth: 640 }}><div style={{ ...eyebrow, color: "#7EE0C0" }}>From science to your care</div><p style={{ margin: "8px 0 0", fontSize: "clamp(18px,2vw,22px)", lineHeight: 1.45 }}>Measure it with BioAro Labs. Understand it with an NEYU physician. Re-check what changes.</p></div>
            <a href={CONSULT_HREF} style={{ ...btnInk, background: "#F7F5F1", color: T.ink }}>Book a longevity consultation<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a>
          </section>
          <p style={{ margin: 0, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>Educational content only — not a diagnosis or medical advice. Research findings describe groups of people, not individuals. Medical emergency? Call 911.</p>
        </>}

        {tab === "respond" && <Responsiveness onAsk={ask} />}
        {tab === "stress" && <StressMap onAsk={ask} />}
        {tab === "pace" && <PaceVsAge onAsk={ask} />}
        {tab === "pgx" && <PgxSafety onAsk={ask} />}
        {tab === "genes" && <GeneticsPathways onAsk={ask} />}

        {tab === "library" && (
          <section style={{ display: "grid", gap: 16 }}>
            <div><div style={{ ...eyebrow, color: N.tealText }}>Research Library</div><h2 style={{ ...h2, fontSize: "clamp(26px,3.4vw,40px)" }}>The studies, <span style={aiText}>in plain language.</span></h2><p style={{ margin: "8px 0 0", fontSize: 16, color: T.ink2, maxWidth: 720 }}>Each chapter is one peer-reviewed paper: what was studied, what was found, what it means for you — and what it doesn’t.</p></div>
            <ResearchBook onFeature={(f) => valid(f) && setTab(f as Tab)} />
          </section>
        )}

        {tab === "alba" && (
          <section style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <AlbaOrb size={48} glow />
              <div><div style={{ ...eyebrow, color: N.tealText }}>Neyu · Longevity Lab</div><h2 style={{ ...h2, margin: "4px 0 0", fontSize: "clamp(26px,3.4vw,40px)" }}>Ask anything. <span style={aiText}>Get clarity.</span></h2></div>
            </div>
            <AskPanel page="/longevity-lab" label="longevity science" suggestions={ASK} seed={seed} clearSeed={() => setSeed("")} accent="#2E7D5B" />
          </section>
        )}
      </main>
    </div>
  );
}
