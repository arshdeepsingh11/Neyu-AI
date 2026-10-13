"use client";

// Shared, tabbed specialty page (Cardiology, Heart Failure, Internal Medicine,
// Endocrinology, Geriatric, Pediatric Rheumatology, Nutrition, Precision
// Medicine, Respiratory) in the NEYU style: calm light hero with Ask Neyu and a
// live clinical visual, a gliding tab bar, a focused 3D marquee of services,
// a 3D physician carousel, interactive tools, real physicians and real BioAro
// test prices.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import SymptomChecker from "@/components/SymptomChecker";
import { STUDIO, type StudioConfig, type CareItem } from "@/data/specialtyStudio";
import { physicians, type Physician } from "@/data/physicians";
import { locations, brand } from "@/data/content";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { T, wrap, card, btnInk, btnGhost, chip, eyebrow, h2, aiText, Icon, CountUp, Stat, ChartCard, useTip, useInView } from "@/components/nea/ui";
import AskPanel from "./AskPanel";
import { N, btn as nbtn, cardN, gradText, AiBadge, Kicker, PromptCard, FlowLines, wrapN } from "@/components/neyu/kit";
import { NChart } from "@/components/neyu/charts";
import { Marquee3D, PillNav, SignalConvergence } from "@/components/neyu/fx";
import PhysicianIdGrid from "@/components/PhysicianIdGrid";
import { PhysicianSheet as NPhysicianSheet, LanguageMatrix } from "@/components/neyu/people";
import { useToolList, ToolFrame } from "./tools";
import { NIcon } from "@/components/neyu/icons";

type Tab = "overview" | "alba" | "care" | "tools" | "physicians" | "visit";

const VISUAL: Record<string, { mode?: string; converge?: string[]; hub?: string; title: string }> = {
  cardiology: { mode: "ecg", title: "Live view · heart rhythm" },
  "heart-failure-clinic": { mode: "echo", title: "Pumping function · ejection fraction" },
  "internal-medicine": { converge: ["Heart", "Kidneys", "Metabolism", "Medicines", "History", "Labs"], hub: "You", title: "The whole picture, read together" },
  endocrinology: { mode: "glucose", title: "Glucose · 24 hours" },
  "geriatric-medicine": { mode: "activity", title: "Movement · this week" },
  "pediatric-rheumatology": { converge: ["Joints", "Eyes", "Growth", "Bloodwork", "School & play", "Family"], hub: "Your child", title: "Care around your child" },
  nutrition: { mode: "microbiome", title: "Gut microbiome · composition" },
  "precision-medicine": { mode: "dna", title: "Your genome · actionable genes" },
  "respiratory-medicine": { mode: "resp", title: "Breathing · overnight" },
};
function RotWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setI((v) => (v + 1) % words.length); }, 2600); return () => clearInterval(t); }, [words.length]);
  return <span key={i} style={{ ...gradText, display: "inline-block", animation: "fadeUp .5s ease" }}>{words[i]}</span>;
}
function Hero({ c, onAsk }: { c: StudioConfig; onAsk: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [muted, setMuted] = useState(true);
  const yt = useRef<HTMLIFrameElement>(null);
  const toggle = () => { yt.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: muted ? "unMute" : "mute", args: [] }), "*"); setMuted(!muted); };
  const v = VISUAL[c.slug] || { mode: "trend", title: "Live view" };
  return (
    <section style={{ position: "relative", overflow: "hidden", padding: "clamp(28px,5vw,64px) 0 clamp(24px,4vw,44px)", background: "radial-gradient(900px 480px at 90% 0%, rgba(34,115,214,.09), transparent 60%), radial-gradient(800px 500px at 0% 30%, rgba(47,191,148,.09), transparent 60%)" }}>
      <FlowLines opacity={0.45} />
      <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: "clamp(24px,4vw,56px)", alignItems: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18, minWidth: 0 }}>
          <Kicker label={c.partner ? `Partner · ${c.partner.name}` : "NEYU Care · Specialty"} badge="AI-assisted" />
          <h1 style={{ margin: 0, fontSize: "clamp(40px,5.8vw,72px)", lineHeight: 1.02, letterSpacing: "-.045em", fontWeight: 500, color: N.ink }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}><NIcon name={c.icon} size={"0.8em"} tone="grad" stroke={1.3} />{c.label}</span><br />
            <span style={{ fontWeight: 400, fontSize: ".72em", color: N.ink2 }}>for </span><RotWord words={c.morph} />
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.6, color: N.ink2, maxWidth: 620 }}>{c.tagline}</p>
          <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length > 1) onAsk(q.trim()); }} style={{ position: "relative", maxWidth: 620, borderRadius: 999 }}>
            <anra-electro radius="30" style={{ position: "absolute", inset: -6, pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 14px", borderRadius: 999, background: "rgba(255,255,255,.97)", border: `1px solid ${N.line}`, boxShadow: "0 20px 50px -30px rgba(14,27,44,.45)" }}>
              <AlbaOrb size={26} />
              <input size={1} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Ask Neyu about ${c.label}`} placeholder={`Ask Neyu — “${c.ask[0]}”`} style={{ flex: 1, minWidth: 0, width: 0, height: 46, border: 0, outline: "none", background: "transparent", fontSize: 16, color: N.ink }} />
              <button type="submit" style={{ ...nbtn("grad"), height: 46, padding: "0 18px" }}><span className="neyu-hide-xs">Ask Neyu</span><NIcon name="arrow" size={16} tone="light" /></button>
            </div>
          </form>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 8, maxWidth: 640 }}>
            {c.ask.slice(1, 3).map((x) => <PromptCard key={x} text={x} onClick={() => onAsk(x)} />)}
          </div>
        </div>
        <div style={{ position: "relative", minWidth: 0 }}>
          <div style={{ ...cardN, overflow: "hidden", padding: c.video ? 0 : "clamp(16px,2vw,22px)", position: "relative", aspectRatio: c.video ? "4 / 3.2" : undefined, background: "#fff" }}>
            {c.video?.kind === "mp4" && <video src={c.video.src} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            {c.video?.kind === "youtube" && <iframe ref={yt} title={`${c.label} — NEYU Health`} src={`https://www.youtube.com/embed/${c.video.id}?autoplay=1&mute=1&loop=1&playlist=${c.video.id}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`} allow="autoplay; encrypted-media" style={{ position: "absolute", top: "50%", left: "50%", width: "max(100%, 177.78vh)", height: "max(100%, 56.25vw)", minWidth: "140%", minHeight: "100%", transform: "translate(-50%,-50%)", border: 0, pointerEvents: "none" }} />}
            {c.video && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(14,27,44,.55) 0%, rgba(14,27,44,.05) 55%)" }} />}
            {c.video?.kind === "youtube" && <button onClick={toggle} aria-label={muted ? "Unmute video" : "Mute video"} style={{ position: "absolute", top: 14, right: 14, zIndex: 3, width: 40, height: 40, borderRadius: 20, border: "1px solid rgba(255,255,255,.4)", background: "rgba(255,255,255,.16)", backdropFilter: "blur(10px)", cursor: "pointer", display: "grid", placeItems: "center" }}><NIcon name={muted ? "mute" : "sound"} size={18} tone="light" /></button>}
            {!c.video && <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}><span style={{ fontSize: 13, color: N.muted }}>{v.title}</span><AiBadge label="Neyu · live" /></div>
              {v.converge ? <SignalConvergence height={320} labels={v.converge} hub={v.hub} /> : <NChart mode={v.mode!} height={300} />}
            </>}
            {c.video && <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, padding: "12px 14px", borderRadius: 18, background: "rgba(255,255,255,.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.8)" }}><NChart mode={v.mode!} height={96} /></div>}
          </div>
          {c.heroLine && <span style={{ position: "absolute", top: -12, left: 18, padding: "6px 12px", borderRadius: 999, background: "#fff", border: `1px solid ${N.line}`, fontSize: 12.5, color: N.ink2, boxShadow: "0 10px 20px -16px rgba(14,27,44,.5)" }}>{c.heroLine}</span>}
        </div>
      </div>
    </section>
  );
}

function CareSheet({ item, onClose, onAsk, accent }: { item: CareItem; onClose: () => void; onAsk: (q: string) => void; accent: string }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="anra-chrome">
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(20,24,27,.38)", backdropFilter: "blur(4px)" }} />
      <div role="dialog" aria-modal="true" aria-label={item.name} style={{ position: "fixed", zIndex: 86, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(560px,calc(100% - 24px))", maxHeight: "86vh", overflow: "auto", background: T.paper, borderRadius: 24, padding: "clamp(20px,4vw,30px)", boxShadow: "0 40px 90px -30px rgba(20,24,27,.5)", animation: "fadeUp .25s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <Icon name={careIcon(item.name, item.icon)} bg={accent + "1A"} color={accent} box={50} size={24} />
          <button onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, border: 0, borderRadius: 12, background: T.line2, cursor: "pointer" }}><NIcon name="ph-x" size={18} tone={"currentColor"} /></button>
        </div>
        <h2 style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.12, letterSpacing: "-.02em", fontWeight: 500 }}>{item.name}</h2>
        <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6, color: T.ink2 }}>{item.desc}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button onClick={() => { onClose(); onAsk(`Tell me about ${item.name} — what is it, what should I expect, and how do I prepare?`); }} style={{ ...btnInk, background: `linear-gradient(135deg, ${accent}, #1D5FA8)` }}><NIcon name="ph-sparkle" size={18} tone={"currentColor"} />Ask Neyu</button>
          <a href="/referral-centre" style={btnGhost}>Start a referral<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a>
        </div>
      </div>
    </div>
  );
}

function TestsChart({ slugs, accent }: { slugs: string[]; accent: string }) {
  const tip = useTip();
  const [ref, seen] = useInView<HTMLDivElement>();
  const tests = slugs.map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean) as typeof LAB_TESTS;
  const max = Math.max(...tests.map((t) => t.price), 1);
  if (!tests.length) return null;
  return (
    <div ref={ref} data-tiphost style={{ position: "relative", display: "grid", gap: 10 }}>
      {tests.map((t) => (
        <a key={t.id} href={t.url("CA")} target="_blank" rel="noopener" onMouseMove={(e) => tip.show(e, <><b>{t.name}</b><br />{t.why}</>)} onMouseLeave={tip.hide}
          style={{ display: "grid", gridTemplateColumns: "minmax(120px,42%) 1fr 76px", gap: 10, alignItems: "center", textDecoration: "none", color: T.ink2, fontSize: 14 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
          <span style={{ height: 10, borderRadius: 5, background: T.line2 }}><span style={{ display: "block", height: "100%", borderRadius: 5, width: seen ? `${(t.price / max) * 100}%` : 0, background: `linear-gradient(90deg, ${accent}, #6EA8B6)`, transition: "width .9s cubic-bezier(.2,.8,.2,1)" }} /></span>
          <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: T.ink }}>{money(t.price)}</span>
        </a>
      ))}
      <p style={{ margin: "4px 0 0", fontSize: 12, color: T.faint }}>BioAro Labs prices as listed on bioarolabs.com. Ordered and paid with BioAro — tap a test to open it.</p>
      {tip.node}
    </div>
  );
}

// A specific icon for each care item, from its name — so a row never repeats one icon.
const CARE_ICONS: [RegExp, string][] = [
  [/stress echo|exercise stress|treadmill|stress test/i, "steps"], [/echo|ultrasound|doppler|imaging|mpi|perfusion|nuclear/i, "echo"], [/holter|monitor|ambulatory|bp\b|blood pressure|hypertension/i, "monitor"],
  [/ecg|electrocardio|rhythm|arrhythm|palpitation|fibrillation/i, "pulse"], [/heart failure|ejection|cardiomyopathy/i, "heartPulse"], [/consult|assessment|review|management/i, "stethoscope"],
  [/diabet|glucose|sugar|a1c/i, "drop"], [/thyroid/i, "thyroid"], [/adrenal|pituitary|hormone|pcos|menopause|testosterone/i, "hormone"], [/osteopor|bone|joint|arthritis|lupus|rheumat|inflammat/i, "joint"],
  [/obesity|weight|metabolic/i, "scale"], [/cholesterol|lipid|vascular|carotid|artery|abi/i, "vessel"], [/memory|cognit|dementia|brain/i, "brain"], [/fall|frailty|mobility|balance/i, "steps"],
  [/medication|polypharm|drug|prescri/i, "pill"], [/sleep|apnea|cpap|snor/i, "moon"], [/asthma|copd|lung|breath|spirometry|pulmonary|cough/i, "lungs"], [/nutrition|diet|food|meal|fibre|fiber/i, "food"],
  [/genom|genetic|dna|hereditary|pharmacogen/i, "dna"], [/aging|longevity|healthspan/i, "hourglass"], [/child|youth|pediatric|juvenile/i, "child"], [/kidney|renal/i, "kidney"], [/skin|laser|aesthetic/i, "skin"],
];
const careIcon = (name: string, fallback: string) => CARE_ICONS.find(([re]) => re.test(name))?.[1] || fallback;

export default function SpecialtyExperience({ slug }: { slug: string }) {
  const c = STUDIO[slug];
  const [a] = c.accent;
  const docs = useMemo(() => (c.disciplines.length ? physicians.filter((p) => c.disciplines.some((d) => p.disciplines.includes(d))) : []), [c]);
  const team = useMemo(() => physicians.filter((p) => !docs.includes(p)), [docs]);
  const TABS: { v: Tab; label: string; icon: string }[] = [
    { v: "overview", label: "Overview", icon: "ph-house-simple" },
    { v: "alba", label: "Ask Neyu", icon: "ph-sparkle" },
    { v: "care", label: c.partner ? "Services" : "Care & tests", icon: "ph-first-aid-kit" },
    { v: "tools", label: "Tools & insights", icon: "ph-chart-line-up" },
    { v: "physicians" as Tab, label: "Physicians", icon: "ph-user-circle" },
    { v: "visit", label: "Visit", icon: "ph-map-pin" },
  ];
  const [tab, setTabState] = useState<Tab>("overview");
  const [seed, setSeed] = useState("");
  const [care, setCare] = useState<CareItem | null>(null);
  const [doc, setDoc] = useState<Physician | null>(null);
  const [lang, setLang] = useState("All");
  const [loc, setLoc] = useState("All");
  const barRef = useRef<HTMLDivElement>(null);
  const tools = useToolList();
  const page = `/specialties/${slug}`;

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    const u = new URL(window.location.href);
    if (t === "overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", t);
    history.replaceState(null, "", u.pathname + u.search);
    const bar = barRef.current;
    if (bar) { const stick = window.innerWidth <= 859 ? 64 : 10; const top = bar.getBoundingClientRect().top + window.scrollY - stick; if (window.scrollY > top + 1) window.scrollTo({ top, behavior: "smooth" }); }
  }, []);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab") as Tab | null; if (t && TABS.some((x) => x.v === t)) setTabState(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const ask = useCallback((q: string) => { setSeed(q); setTab("alba"); }, [setTab]);

  const langs = ["All", ...Array.from(new Set(physicians.flatMap((p) => p.languages))).sort()];
  const pick = (l: Physician[]) => l.filter((p) => (lang === "All" || p.languages.includes(lang)) && (loc === "All" || p.location === loc));
  const shownDocs = pick(docs), shownTeam = pick(team);
  const testCount = c.tests.filter((s) => LAB_TESTS.some((t) => t.id === "labs-" + s)).length;
  const langCount = new Set(physicians.flatMap((p) => p.languages)).size;
  const groups = Array.from(new Set(c.care.map((x) => x.group || "")));

  const TAB_ICON: Record<Tab, string> = { overview: "layers", alba: "spark", care: "firstAid", tools: "chart", physicians: "doctor", visit: "pin" };
  return (
    <div className="anra-root neyu-page" style={{ color: N.ink, background: N.paper, paddingBottom: 90, overflowX: "clip" }}>
      <div className="neyu-main">
      <Hero c={c} onAsk={ask} />

      <div ref={barRef} aria-hidden style={{ height: 0 }} />
      <div className="sx-bar" style={{ position: "sticky", zIndex: 40, display: "flex", justifyContent: "center", padding: "0 12px" }}>
        <PillNav label={`${c.label} sections`} tabs={TABS.map((t) => ({ k: t.v, label: t.label, icon: TAB_ICON[t.v] }))} value={tab} onChange={(k) => setTab(k)} />
      </div>
      <style>{`.sx-bar{top:10px;transition:top .28s ease}@media (max-width:859px){.sx-bar{top:calc(var(--neyu-topbar,56px) + env(safe-area-inset-top))}html[data-chrome="hidden"] .sx-bar{top:env(safe-area-inset-top)}}`}</style>

      <main key={tab} style={{ ...wrapN, marginTop: "clamp(22px,3vw,34px)", animation: "fadeUp .35s ease", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "clamp(18px,2.6vw,28px)" }}>
        {tab === "overview" && <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,165px),1fr))", gap: 12 }}>
            <Stat icon="doctor" value={<CountUp to={docs.length || physicians.length} />} label={docs.length ? `${c.label} physician${docs.length > 1 ? "s" : ""} · ${physicians.length} on the NEYU team` : "NEYU physicians"} />
            {c.partner ? <Stat icon="map" value="AB" label={c.partner.note.replace(/\.$/, "")} /> : <Stat icon="pin" value={<CountUp to={locations.length} />} label="Calgary clinics" />}
            {langCount > 0 && <Stat icon="language" value={<CountUp to={langCount} />} label="languages spoken by our physicians" />}
            <Stat icon="firstAid" value={<CountUp to={c.care.length} />} label={c.partner ? "services" : "areas of care"} />
            {testCount > 0 && <Stat icon="flask" value={<CountUp to={testCount} />} label="related BioAro Labs tests" />}
            <Stat icon="spark" value={<CountUp to={c.tools.length} />} label="AI & screening tools" />
          </section>
          <section style={{ ...card, padding: "clamp(18px,2.6vw,26px) 0", overflow: "hidden" }}>
            <div style={{ padding: "0 clamp(18px,2.6vw,26px)", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div><div style={{ ...eyebrow, color: N.teal }}>{c.partner ? "Services" : "Care & diagnostics"}</div><h2 style={{ ...h2, fontSize: "clamp(22px,2.8vw,32px)" }}>Everything in one place.</h2></div>
              <button onClick={() => setTab("care")} style={nbtn("ghost")}>See all<NIcon name="arrow" size={16} tone="currentColor" /></button>
            </div>
            <Marquee3D items={c.care.map((x) => ({ icon: careIcon(x.name, x.icon), label: x.name }))} height={200} />
          </section>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 16 }}>
            <div style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 12, alignContent: "start" }}>
              <div style={{ ...eyebrow, color: N.teal }}>About</div>
              {c.overview.map((p) => <p key={p.slice(0, 20)} style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: T.ink2 }}>{p}</p>)}
              {c.whenToSee && <div style={{ padding: "14px 16px", borderRadius: 16, background: "linear-gradient(160deg,#F3FAF8,#EEF5FB)", border: `1px solid ${N.line}`, fontSize: 15, lineHeight: 1.55, display: "flex", gap: 10 }}><NIcon name="info" size={18} tone="grad" style={{ marginTop: 2 }} /><span><b style={{ fontWeight: 600, color: N.deep }}>When to see us · </b>{c.whenToSee}</span></div>}
            </div>
            <div style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 14, alignContent: "start" }}>
              <div style={{ ...eyebrow, color: N.teal }}>{slug === "cardiology" ? "Symptoms we assess" : "What we look after"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{c.conditions.map((x) => <button key={x} onClick={() => ask(`What is ${x.split(" (")[0].toLowerCase()} and when should I see a specialist?`)} className="neyu-chip" style={{ ...chip(false), minHeight: 36, fontSize: 13.5, textAlign: "left", whiteSpace: "normal", padding: "6px 14px" }}><NIcon name="spark" size={14} tone="grad" />{x.split(" (")[0]}</button>)}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: T.faint }}>Tap any topic and Neyu explains it.</p>
            </div>
          </section>
          <section style={{ ...card, padding: "clamp(20px,3vw,28px)" }}>
            <div style={{ ...eyebrow, color: N.teal }}>Your path</div>
            <h2 style={{ ...h2, fontSize: "clamp(24px,3vw,34px)" }}>From referral to a plan <span style={aiText}>made for you.</span></h2>
            <ol style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))", gap: 10, position: "relative" }}>
              {(c.partner ? [["referral", "Referral", "Your family doctor refers you."], ["stethoscope", "Assessment", "Consultation with the specialist team."], ["pulse", "Testing", "Diagnostics, at home or in the lab."], ["loop", "Ongoing care", "Equipment, education and support."]]
                : [["referral", "Referral", "From your family doctor or walk-in."], ["stethoscope", "Consultation", "A specialist reviews your full history."], ["flask", "Testing", "On-site diagnostics and, when useful, BioAro tests."], ["spark", "Your plan", "Clear next steps, tracked in My Health Space."]]).map(([ic, t, d], i) => (
                <li key={t} style={{ padding: "16px 16px", borderRadius: 18, background: "#FBFCFC", border: `1px solid ${N.line2}`, display: "grid", gap: 8, animation: `fadeUp .4s ${i * 0.08}s both` }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Icon name={ic} box={38} size={19} /><span style={{ fontSize: 12, color: T.faint, letterSpacing: ".14em" }}>0{i + 1}</span></span>
                  <b style={{ fontWeight: 500, fontSize: 16 }}>{t}</b><span style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.45 }}>{d}</span>
                </li>
              ))}
            </ol>
          </section>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12 }}>
            {[["spark", "Ask Neyu", `Questions about ${c.label.toLowerCase()}, answered.`, "alba"], ["chart", "Screening tools", "Instant, visual self-checks.", "tools"], ["doctor", "Physicians", "Who you will see, and the languages they speak.", "physicians"]].map(([ic, t, d, go]) => (
              <button key={t} onClick={() => setTab(go as Tab)} className="sx-card" style={{ ...card, padding: 18, textAlign: "left", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
                <Icon name={ic} /><span><b style={{ display: "block", fontWeight: 500, fontSize: 16 }}>{t}</b><span style={{ fontSize: 13.5, color: T.muted }}>{d}</span></span><NIcon name="arrow" size={16} tone={T.muted} />
              </button>
            ))}
          </section>
        </>}

        {tab === "alba" && (
          <section style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <AlbaOrb size={48} glow />
              <div><div style={{ ...eyebrow, color: T.violet }}>Neyu · {c.label}</div><h2 style={{ ...h2, margin: "4px 0 0", fontSize: "clamp(26px,3.4vw,40px)" }}>Ask anything. <span style={aiText}>Get clarity.</span></h2></div>
            </div>
            <AskPanel page={page} label={c.label} suggestions={c.ask} seed={seed} clearSeed={() => setSeed("")} accent={a} />
          </section>
        )}

        {tab === "care" && <>
          {groups.map((g) => (
            <section key={g || "care"} style={{ display: "grid", gap: 12 }}>
              {g && <div style={eyebrow}>{g}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,270px),1fr))", gap: 12 }}>
                {c.care.filter((x) => (x.group || "") === g).map((x, i) => (
                  <button key={x.name} onClick={() => setCare(x)} className="sx-card" style={{ ...card, padding: 18, textAlign: "left", cursor: "pointer", display: "grid", gap: 10, alignContent: "start", animation: `fadeUp .35s ${Math.min(i, 10) * 0.03}s both` }}>
                    <Icon name={careIcon(x.name, x.icon)} bg={a + "18"} color={a} />
                    <b style={{ fontWeight: 500, fontSize: 17, lineHeight: 1.25 }}>{x.name}</b>
                    <span style={{ fontSize: 14, color: T.muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.desc}</span>
                    <span style={{ fontSize: 12.5, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: a }}>Learn more →</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {testCount > 0 && <ChartCard title="Related BioAro Labs tests" sub="Advanced tests that can add to your picture — discuss results with your physician"><TestsChart slugs={c.tests} accent={a} /></ChartCard>}
        </>}

        {tab === "tools" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 16, alignItems: "start" }}>
            {c.tools.map((k) => {
              if (k === "symptoms-cardio" || k === "symptoms-resp") return <ToolFrame key={k} title="AI symptom check" sub="Describe what you notice — Neyu suggests an urgency level" icon="ph-sparkle" accent={a}><SymptomChecker specialty={k === "symptoms-cardio" ? "cardiology" : "respiratory"} /></ToolFrame>;
              if (k === "tests") return <ChartCard key={k} title="Genomic test explorer" sub="Compare BioAro genomic tests by price"><TestsChart slugs={c.tests} accent={a} /></ChartCard>;
              const Tool = (tools as Record<string, React.ComponentType<{ accent: string; onAsk: (q: string) => void }>>)[k];
              return Tool ? <Tool key={k} accent={a} onAsk={ask} /> : null;
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 16 }}>
            {testCount > 0 && !c.tools.includes("tests") && <ChartCard title="Related tests, by price" sub="BioAro Labs"><TestsChart slugs={c.tests} accent={a} /></ChartCard>}
            <div style={{ display: "grid", gap: 8 }}><div style={{ ...eyebrow, color: N.teal }}>Languages spoken by our physicians</div><LanguageMatrix /></div>
          </div>
        </>}

        {tab === "physicians" && <>
          {c.physicianNote && <p style={{ margin: 0, fontSize: 15, color: T.ink2 }}>{c.physicianNote}</p>}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }} className="neyu-noscroll">{langs.map((l) => <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} style={{ ...chip(lang === l), minHeight: 36, fontSize: 13.5 }}>{l === "All" ? "Any language" : l}</button>)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["All", ...locations.map((l) => l.tag)].map((l) => <button key={l} onClick={() => setLoc(l)} aria-pressed={loc === l} style={{ ...chip(loc === l), minHeight: 36, fontSize: 13.5 }}><NIcon name="pin" size={15} tone="currentColor" />{l === "All" ? "Any location" : l}</button>)}</div>
          </div>
          {[[shownDocs, c.partner ? "" : `${c.label} physicians`], [shownTeam, docs.length ? "Also on our NEYU team" : "Our NEYU physicians"]].map(([list, title]) => (list as Physician[]).length > 0 && (
            <section key={title as string} style={{ display: "grid", gap: 4 }}>
              {title && <div style={{ ...eyebrow, color: N.teal }}>{title as string} · {(list as Physician[]).length}</div>}
              <PhysicianIdGrid list={list as Physician[]} onOpen={setDoc} />
            </section>
          ))}
          {!shownDocs.length && !shownTeam.length && <p style={{ color: T.muted }}>No physician matches both filters — try “Any”.</p>}
          <LanguageMatrix highlight={lang === "All" ? undefined : lang} />
        </>}

        {tab === "visit" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16 }}>
            {c.partner ? (
              <div style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 12 }}>
                <div style={eyebrow}>Partner</div>
                <h2 style={{ ...h2, margin: 0, fontSize: "clamp(24px,3vw,32px)" }}>{c.partner.name}</h2>
                <a href={c.partner.tel} style={{ display: "flex", gap: 10, color: T.ink2, textDecoration: "none", fontSize: 16 }}><NIcon name="ph-phone" size={18} tone={a} />{c.partner.phone}</a>
                <a href={c.partner.site} target="_blank" rel="noopener" style={{ display: "flex", gap: 10, color: T.ink2, textDecoration: "none", fontSize: 16 }}><NIcon name="ph-globe" size={18} tone={a} />{c.partner.site.replace(/^https?:\/\//, "")}</a>
                <p style={{ margin: 0, fontSize: 14, color: T.muted }}>{c.partner.note}</p>
                <a href={c.partner.tel} style={{ ...btnInk, justifySelf: "start" }}>Call {c.partner.name.split(" ").slice(0, 2).join(" ")}<NIcon name="ph-phone" size={18} tone={"currentColor"} /></a>
              </div>
            ) : locations.map((l) => (
              <div key={l.tag} style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 10 }}>
                <div style={eyebrow}>{l.tag}</div>
                <h2 style={{ ...h2, margin: 0, fontSize: "clamp(22px,2.6vw,28px)" }}>{l.name}</h2>
                <a href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(l.address)} target="_blank" rel="noopener" style={{ display: "flex", gap: 10, color: T.ink2, textDecoration: "none" }}><NIcon name="ph-map-pin" size={18} tone={a} style={{ marginTop: 3 }} />{l.address}</a>
                <a href={"tel:" + l.phone.replace(/[^\d]/g, "")} style={{ display: "flex", gap: 10, color: T.ink2, textDecoration: "none" }}><NIcon name="ph-phone" size={18} tone={a} style={{ marginTop: 3 }} />{l.phone}</a>
                <span style={{ display: "flex", gap: 10, color: T.muted, fontSize: 14 }}><NIcon name="ph-printer" size={18} tone={"currentColor"} style={{ marginTop: 3 }} />Fax {l.fax}</span>
              </div>
            ))}
            <div style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 12, background: `linear-gradient(150deg,#fff,${a}12)` }}>
              <div style={eyebrow}>Getting started</div>
              <h2 style={{ ...h2, margin: 0, fontSize: "clamp(22px,2.6vw,28px)" }}>Most visits start with a referral.</h2>
              <p style={{ margin: 0, fontSize: 15, color: T.ink2, lineHeight: 1.55 }}>Your family doctor or a walk-in physician can refer you. Our Referral Centre makes it simple to send one.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/referral-centre" style={btnInk}>Referral Centre<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a><a href={"tel:" + brand.phone.replace(/[^\d]/g, "")} style={btnGhost}><NIcon name="ph-phone" size={18} tone={"currentColor"} />{brand.phone}</a></div>
              <p style={{ margin: 0, fontSize: 12.5, color: T.faint }}>Emergency? Call 911.</p>
            </div>
          </div>
        )}
      </main>

      {care && <CareSheet item={care} onClose={() => setCare(null)} onAsk={ask} accent={a} />}
      {doc && <NPhysicianSheet p={doc} onClose={() => setDoc(null)} />}
      </div>
    </div>
  );
}
