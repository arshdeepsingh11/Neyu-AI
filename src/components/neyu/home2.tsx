"use client";

// Neyu homepage, part 2: Proactive pillars · Biology · Meet Neyu · Journey ·
// Operating model · New services · Philosophy · Final CTA.
import React, { useEffect, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import { Helix3D } from "@/components/lab/three";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { PILLARS, OS, JOURNEY, LAYERS5, SERVICES, PHILOSOPHY, PILLARS3 } from "@/data/neyu";
import { N, Section, AiBadge, LiveChart, NeyuReads, StepRail, btn, cardN, gradText, IconTile, CapCard, FlowLines } from "./kit";
import { NIcon } from "./icons";
import { NChart } from "./charts";
import { PillNav, BeamFlow } from "./fx";
import { useInView } from "@/components/nea/ui";

// ── 05 From reactive care to proactive health ────────────────
export function Proactive() {
  return (
    <Section id="pillars" tone="white" label="Neyu 05 Pillars" eyebrow="Care · Diagnostics · Prevention · Longevity" title={<>From reactive care<br /><span style={gradText}>to proactive health.</span></>} lead="Four connected pillars — with fifty services behind them, and Neyu across all of them.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
        {PILLARS.map((p) => (
          <a key={p.k} href={p.href} className="sx-card" style={{ ...cardN, padding: 22, display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", color: N.ink, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}><IconTile icon={p.icon} /><span style={{ fontSize: 11.5, color: N.muted, letterSpacing: ".16em", textTransform: "uppercase" }}>0{PILLARS.indexOf(p) + 1}</span></span>
            <b style={{ fontWeight: 500, fontSize: 26, letterSpacing: "-.02em" }}>{p.title}</b>
            <span style={{ fontSize: 13.5, color: N.tealText, fontWeight: 600, lineHeight: 1.4 }}>{p.tag}</span>
            <span style={{ fontSize: 15, lineHeight: 1.55, color: N.ink2 }}>{p.text}</span>
            <LiveChart mode={p.chart} height={132} />
            <span style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: N.ink2, lineHeight: 1.45 }}><AlbaOrb size={18} motion={false} />{p.neyu}</span>
            <span style={{ marginTop: "auto", fontSize: 14, fontWeight: 600, color: N.deep, display: "inline-flex", gap: 6, alignItems: "center" }}>Explore {p.title}<NIcon name="arrow" size={16} tone={N.deep} /></span>
          </a>
        ))}
      </div>
      <a href="/explore" style={{ ...btn("ghost"), justifySelf: "center" }}>Explore all services<NIcon name="arrow" size={16} tone="currentColor" /></a>
    </Section>
  );
}

// ── 06 Personalized by your biology ──────────────────────────
// Each layer has its own visual and real measurements — switching tabs changes everything.
const BIO = [
  { id: "genomics", name: "Genomics", icon: "dna", color: "#2273D6", text: "Your DNA, read once and used for life: inherited risks, and how you respond to medicines.", facts: [["~20,000", "genes read with whole-genome sequencing"], ["30×", "average read depth"], ["CPIC", "guidelines used for drug–gene results"]], tests: ["whole-genome-sequencing-30x", "pharmacogenomics-test"] },
  { id: "biomarkers", name: "Biomarkers", icon: "flask", color: "#1FA7B4", text: "Inflammation, vascular and aging markers that add what a standard panel misses — each read against its reference range.", facts: [["hs-CRP", "< 1 mg/L lower cardiovascular risk"], ["Lp(a)", "≥ 100 nmol/L raises risk (CCS 2021)"], ["ApoB", "counts every atherogenic particle"]], tests: ["core-inflammation-aging", "gdf-15", "high-sensitive-crp-hs-crp"] },
  { id: "microbiome", name: "Microbiome", icon: "microbiome", color: "#2FBF94", text: "Trillions of gut bacteria shape digestion, inflammation and metabolism. Diversity is one of the clearest signs of a healthy gut.", facts: [["~38 trillion", "bacteria in and on the body"], ["2 phyla", "Firmicutes & Bacteroidetes dominate"], ["Diversity", "higher is generally healthier"]], tests: ["the-biogut-test"] },
  { id: "lifestyle", name: "Lifestyle", icon: "leaf", color: "#58C98C", text: "Sleep, activity, nutrition and stress — the levers you control every day, measured against Canadian guidelines.", facts: [["7–9 h", "sleep for adults (Canadian 24-h guidelines)"], ["150 min", "moderate-to-vigorous activity a week"], ["≤ 8 h", "sedentary time a day"]], tests: ["essential-vitamin-health", "cortisol"] },
  { id: "wearables", name: "Wearables", icon: "watch", color: "#1D5FA8", text: "Heart rate, HRV, steps and sleep from your phone or watch flow into your record — so trends replace single readings.", facts: [["HRV", "rises with recovery and fitness"], ["Resting HR", "trend matters more than one day"], ["Apple Health", "and Android Health Connect"]], tests: [] },
] as const;
function LifestyleRings() {
  const rings = [{ l: "Sleep", v: 7.1, g: 8, u: "h", c: "#2273D6" }, { l: "Activity", v: 165, g: 150, u: "min/wk", c: "#2FBF94" }, { l: "Sedentary", v: 6.5, g: 8, u: "h/day", c: "#1FA7B4", invert: true }];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, alignItems: "center", padding: 18 }}>
      <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 240, justifySelf: "center" }} role="img" aria-label="Lifestyle rings: sleep, activity and sedentary time against Canadian guidelines">
        {rings.map((r, i) => { const R = 84 - i * 22, C = 2 * Math.PI * R, p = Math.min(1, r.v / r.g); return (
          <g key={r.l} transform="rotate(-90 100 100)"><circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
            <circle cx="100" cy="100" r={R} fill="none" stroke={r.c} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)" }} /></g>); })}
      </svg>
      <div style={{ display: "grid", gap: 12 }}>
        {rings.map((r) => <div key={r.l} style={{ display: "grid", gap: 2 }}><span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(234,242,246,.7)" }}><span style={{ width: 9, height: 9, borderRadius: 5, background: r.c }} />{r.l}</span><b style={{ fontWeight: 500, fontSize: 20, color: "#fff" }}>{r.v} <span style={{ fontSize: 13, color: "rgba(234,242,246,.6)", fontWeight: 400 }}>{r.u} · {r.invert ? "limit" : "goal"} {r.g}</span></b></div>)}
      </div>
    </div>
  );
}
export function Biology() {
  const [pick, setPick] = useState<(typeof BIO)[number]["id"]>("genomics");
  const cur = BIO.find((b) => b.id === pick)!;
  const tests = cur.tests.map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean);
  const panel: React.CSSProperties = { borderRadius: 26, overflow: "hidden", background: "radial-gradient(110% 90% at 50% 40%, rgba(255,255,255,.05), transparent 70%)", border: "1px solid rgba(255,255,255,.09)", minHeight: 380, display: "grid", alignContent: "center" };
  return (
    <Section id="biology" tone="dark" label="Neyu 06 Biology" eyebrow="Precision health" title={<>Personalized by your biology.</>} lead="Your health isn't generic. Your health experience shouldn't be either. NEYU brings together relevant biological and lifestyle information for a more personal understanding of you.">
      <PillNav dark label="Layers of your biology" tabs={BIO.map((b) => ({ k: b.id, label: b.name, icon: b.icon }))} value={pick} onChange={(k) => setPick(k)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 24, alignItems: "center" }}>
        <div key={pick + "v"} style={{ ...panel, animation: "fadeUp .35s ease" }}>
          {pick === "genomics" && <div style={{ display: "grid" }}><Helix3D nodes={[{ id: "lpa", name: "LPA", color: "#C7563C" }, { id: "cyp", name: "CYP2C19", color: "#2273D6" }, { id: "slco", name: "SLCO1B1", color: "#1FA7B4" }, { id: "apoe", name: "APOE", color: "#2FBF94" }]} height={250} label="3D DNA helix with four clinically actionable genes — drag to rotate" /><div style={{ padding: "0 18px 16px" }}><NChart mode="dna" height={130} dark /></div></div>}
          {pick === "biomarkers" && <div style={{ padding: 20 }}><NChart mode="bars" height={330} dark /></div>}
          {pick === "microbiome" && <div style={{ padding: 20 }}><NChart mode="microbiome" height={300} dark /></div>}
          {pick === "lifestyle" && <LifestyleRings />}
          {pick === "wearables" && <div style={{ padding: 20, display: "grid", gap: 14 }}><NChart mode="hrv" height={180} dark /><NChart mode="ecg" height={150} dark /></div>}
        </div>
        <div key={pick} style={{ display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}><IconTile icon={cur.icon} dark /><b style={{ fontWeight: 500, fontSize: 28, color: "#fff", letterSpacing: "-.02em" }}>{cur.name}</b></span>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "rgba(234,242,246,.8)" }}>{cur.text}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            {cur.facts.map(([v, l]) => <div key={v} style={{ padding: "12px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}><b style={{ display: "block", fontWeight: 500, fontSize: 17, color: "#7EE0C0" }}>{v}</b><span style={{ fontSize: 12.5, lineHeight: 1.4, color: "rgba(234,242,246,.68)" }}>{l}</span></div>)}
          </div>
          {tests.length > 0 && <div style={{ display: "grid", gap: 8 }}>{tests.map((t) => <a key={t!.id} href="/genomics" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#EAF2F6", textDecoration: "none", fontSize: 15 }}><span>{t!.name}</span><span style={{ color: "#7EE0C0" }}>{money(t!.price)}</span></a>)}</div>}
          {pick === "wearables" && <a href="/my-health" style={{ ...btn("grad"), justifySelf: "start" }}>Connect your phone<NIcon name="arrow" size={16} tone="light" /></a>}
          <NeyuReads dark text={`Neyu reads your ${cur.name.toLowerCase()} next to everything else — a result only means something in context.`} ask={`How would my ${cur.name.toLowerCase()} change my health plan?`} />
        </div>
      </div>
    </Section>
  );
}

// ── 07 Meet Neyu ─────────────────────────────────────────────
const CAN = [
  { t: "Ask a question", d: "Conditions, tests, symptoms, services — in plain language.", icon: "ph-chat-circle-dots", q: "What does a cardiologist assess?" },
  { t: "Understand a result", d: "Paste or photograph results; each value explained in context.", icon: "ph-flask", q: "Can you explain my blood test results?" },
  { t: "Prepare for a visit", d: "Turn symptoms and questions into a one-page summary.", icon: "ph-clipboard-text", q: "Help me prepare for my next appointment." },
  { t: "Explore your health", d: "See how sleep, activity, blood pressure and labs connect.", icon: "ph-compass", q: "How do my sleep and blood pressure affect each other?" },
];
export function MeetNeyu() {
  const { openAlba } = useAlba();
  const [os, setOs] = useState(2);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setOs((i) => (i + 1) % OS.length); }, 2800); return () => clearInterval(t); }, []);
  return (
    <Section id="meet-neyu" tone="dark" label="Neyu 07 Meet Neyu" eyebrow="Your intelligent health companion" title={<>Meet <span style={gradText}>Neyu.</span></>} lead="Neyu helps you make sense of your health information, answer questions, identify what deserves attention and navigate your next steps. The AI is the interface — understanding is the product.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: 28, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {CAN.map((c) => (
            <button key={c.t} onClick={() => openAlba(c.q)} style={{ textAlign: "left", display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#EAF2F6", cursor: "pointer" }} className="sx-card">
              <IconTile icon={c.icon} size={44} dark />
              <span style={{ flex: 1 }}><b style={{ fontWeight: 500, fontSize: 18, color: "#fff" }}>{c.t}</b><span style={{ display: "block", fontSize: 14.5, color: "rgba(234,242,246,.7)", marginTop: 2 }}>{c.d}</span></span>
              <NIcon name="arrow" size={18} tone="#7EE0C0" style={{ transform: "rotate(-45deg)" }} />
            </button>
          ))}
          <button onClick={() => openAlba()} style={{ ...btn("grad"), justifySelf: "start", marginTop: 6 }}><AlbaOrb size={20} motion={false} />Ask Neyu</button>
        </div>
        <div style={{ position: "relative", display: "grid", justifyItems: "center", gap: 18, padding: "10px 0" }}>
          <div style={{ position: "relative", padding: 40 }}><AlbaOrb size={150} glow /></div>
          <div style={{ width: "100%", maxWidth: 440, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#7EE0C0", textAlign: "center" }}>How NEYU works</div>
            {OS.map((o, i) => (
              <button key={o.k} onClick={() => setOs(i)} aria-pressed={os === i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 14, border: `1px solid ${os === i ? "rgba(126,224,192,.6)" : "rgba(255,255,255,.08)"}`, background: os === i ? "rgba(60,199,158,.14)" : "rgba(255,255,255,.03)", color: "#EAF2F6", cursor: "pointer", textAlign: "left", transition: "all .3s" }}>
                <NIcon name={o.icon} size={20} tone={os === i ? "#7EE0C0" : "rgba(234,242,246,.6)"} />
                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 104, color: "#fff" }}>NEYU {o.k}</span>
                <span style={{ fontSize: 13.5, color: "rgba(234,242,246,.72)" }}>{o.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── 08 Your health journey, over time ────────────────────────
const METRICS = {
  bp: { l: "Blood pressure", u: "mmHg (systolic)", v: [142, 141, 139, 140, 136, 134, 133, 131, 130, 128, 127, 126], target: 135, good: "down", notes: { 3: "Neyu noticed readings were higher after short sleep.", 7: "Home average dropped below 135 — within target.", 11: "12-month average: 126. Your care team will review." } },
  ldl: { l: "LDL cholesterol", u: "mmol/L", v: [4.2, 4.1, 4.1, 3.9, 3.7, 3.6, 3.4, 3.3, 3.2, 3.1, 3.0, 2.9], target: 3.5, good: "down", notes: { 2: "Neyu suggested a repeat panel and a nutrition plan.", 6: "Below 3.5 — the usual target.", 11: "Down 31% in a year." } },
  sleep: { l: "Sleep", u: "hours / night", v: [5.9, 6.0, 6.1, 6.0, 6.4, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.1], target: 7, good: "up", notes: { 1: "Neyu linked short sleep to morning blood pressure.", 9: "Reached the 7-hour goal.", 11: "Steady at 7.1 hours." } },
  steps: { l: "Activity", u: "steps / day", v: [5200, 5400, 5600, 6100, 6400, 6800, 7100, 7300, 7600, 7900, 8200, 8400], target: 8000, good: "up", notes: { 2: "Neyu suggested a 10-minute walk after dinner.", 10: "Above 8,000 a day.", 11: "+62% since January." } },
} as const;
type MK = keyof typeof METRICS;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export function Journey() {
  const [m, setM] = useState<MK>("bp");
  const [step, setStep] = useState(0);
  const [hov, setHov] = useState<number | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const d = METRICS[m]; const vals = d.v as readonly number[];
  const lo = Math.min(...vals, d.target) * 0.96, hi = Math.max(...vals, d.target) * 1.03;
  const x = (i: number) => 40 + i * (920 / 11), y = (v: number) => 250 - ((v - lo) / (hi - lo)) * 210;
  const path = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const notes = d.notes as Record<number, string>;
  const shown = hov ?? Number(Object.keys(notes)[Math.min(step, Object.keys(notes).length - 1)]);
  const fmt = (v: number) => (m === "steps" ? v.toLocaleString() : String(v));
  return (
    <Section id="journey" label="Neyu 08 Journey" eyebrow="Over time" title={<>Your health journey,<br /><span style={gradText}>over time.</span></>} lead="Don't just look at today's number. See how your health changes — and what changed it.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(METRICS) as MK[]).map((k) => <button key={k} aria-pressed={m === k} onClick={() => { setM(k); setHov(null); }} style={{ height: 42, padding: "0 16px", borderRadius: 999, border: `1px solid ${m === k ? N.blue : N.line}`, background: m === k ? "rgba(42,132,228,.08)" : "#fff", color: m === k ? N.deep : N.ink2, cursor: "pointer", fontSize: 14.5 }}>{METRICS[k].l}</button>)}
      </div>
      <div ref={ref} style={{ ...cardN, padding: "clamp(14px,2.4vw,26px)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <b style={{ fontWeight: 500, fontSize: 20 }}>{d.l} <span style={{ fontSize: 14, color: N.muted, fontWeight: 400 }}>{d.u} · 12 months · illustrative</span></b>
          <span style={{ fontSize: 14, color: N.muted }}>Target {fmt(d.target)} <span style={{ display: "inline-block", width: 18, borderTop: `2px dashed ${N.teal}`, verticalAlign: "middle" }} /></span>
        </div>
        <svg viewBox="0 0 1000 280" style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`${d.l} trend over 12 months, illustrative`} onMouseLeave={() => setHov(null)}>
          <defs><linearGradient id="jg" x1="0" x2="1"><stop offset="0" stopColor="#3CC79E" /><stop offset="1" stopColor="#2A84E4" /></linearGradient><linearGradient id="jf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#28B8BE" stopOpacity=".22" /><stop offset="1" stopColor="#28B8BE" stopOpacity="0" /></linearGradient></defs>
          {[0, 1, 2, 3].map((i) => <line key={i} x1="40" x2="960" y1={40 + i * 70} y2={40 + i * 70} stroke={N.line2} />)}
          <line x1="40" x2="960" y1={y(d.target)} y2={y(d.target)} stroke={N.teal} strokeDasharray="6 6" />
          <path d={`${path} L960 260 L40 260 Z`} fill="url(#jf)" style={{ opacity: seen ? 1 : 0, transition: "opacity 1s" }} />
          <path key={m} d={path} fill="none" stroke="url(#jg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transition: "stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)" }} />
          {vals.map((v, i) => (
            <g key={i} onMouseEnter={() => setHov(i)} onClick={() => setHov(i)} style={{ cursor: "pointer" }}>
              <rect x={x(i) - 38} y={20} width={76} height={250} fill="transparent" />
              <circle cx={x(i)} cy={y(v)} r={notes[i] !== undefined ? 7 : 4} fill={notes[i] !== undefined ? "#2A84E4" : "#fff"} stroke="#2A84E4" strokeWidth="2" />
              {notes[i] !== undefined && <circle cx={x(i)} cy={y(v)} r={14} fill="none" stroke="#2A84E4" opacity=".35"><animate attributeName="r" values="9;16;9" dur="2.4s" repeatCount="indefinite" /></circle>}
              <text x={x(i)} y={276} textAnchor="middle" fontSize="13" fill={N.faint}>{MON[i]}</text>
              {shown === i && <text x={Math.min(Math.max(x(i), 80), 920)} y={y(v) - 16} textAnchor="middle" fontSize="15" fontWeight="600" fill={N.ink}>{fmt(v)}</text>}
            </g>
          ))}
        </svg>
        <NeyuReads key={m + shown} title={`Neyu noticed · ${MONTHS[shown]}`} text={notes[shown] || `${d.l}: ${fmt(vals[shown])} ${d.u}.`} ask={`How can I improve my ${d.l.toLowerCase()} over the next few months?`} />
      </div>
      <StepRail steps={JOURNEY.map((j) => ({ t: j.k, d: j.text, icon: j.icon }))} active={step} onPick={setStep} />
    </Section>
  );
}

// ── Operating model: Understand → Discover → Connect → Act → Improve ──
export function Model() {
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);
  useEffect(() => { if (manual) return; const t = setInterval(() => { if (!document.hidden) setI((v) => (v + 1) % LAYERS5.length); }, 3000); return () => clearInterval(t); }, [manual]);
  const cur = LAYERS5[i];
  return (
    <Section tone="white" label="Neyu 09 Model" eyebrow="The NEYU model" title={<>Five steps. <span style={gradText}>One connected experience.</span></>} center>
      <StepRail steps={LAYERS5.map((l) => ({ t: l.k, d: l.text, icon: l.icon }))} active={i} onPick={(n) => { setManual(true); setI(n); }} />
      <div style={{ display: "grid", justifyItems: "center" }}>
        <div style={{ maxWidth: 680, width: "100%" }}><NeyuReads key={i} title={`Neyu · ${cur.k}`} text={({ Understand: "Neyu gathers your history, results, biomarkers and signals into one picture.", Discover: "Neyu looks for patterns — what's changing, what's linked, what deserves attention.", Connect: "Neyu points you to the right doctor, test or program, and prepares the handover.", Act: "You get a clear, personal plan: what to do this week, this month and this year.", Improve: "Progress is tracked over time and re-checked with your care team." } as Record<string, string>)[cur.k]} /></div>
      </div>
    </Section>
  );
}

// ── New services ─────────────────────────────────────────────
export function NewServices() {
  return (
    <Section id="services" label="Neyu 10 Services" eyebrow="New at NEYU" title={<>Care that comes to you.</>} lead="Virtual visits, a remote hypertension program, private health packages, executive health, membership and at-home blood collection — all connected to your record and to Neyu.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>
        {SERVICES.map((s) => <CapCard key={s.k} icon={s.icon} title={s.title} text={s.text} href={s.href} meta={s.meta} />)}
      </div>
    </Section>
  );
}

// ── Listen · Connect · Flourish ──────────────────────────────
export function Philosophy() {
  const [o, setO] = useState<number | null>(null);
  return (
    <Section tone="soft" label="Neyu 11 Philosophy" center eyebrow="The NEYU philosophy" title={<>Listen. Connect. <span style={gradText}>Flourish.</span></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
        {PHILOSOPHY.map((p, i) => (
          <button key={p.k} onClick={() => setO(o === i ? null : i)} aria-expanded={o === i} style={{ ...cardN, textAlign: "left", padding: "clamp(22px,3vw,34px)", display: "grid", gap: 12, alignContent: "start", cursor: "pointer", background: "rgba(255,255,255,.8)" }}>
            <NIcon name={p.icon} size={46} tone="grad" stroke={1.2} />
            <b style={{ fontWeight: 300, fontSize: "clamp(32px,3.4vw,44px)", letterSpacing: "-.03em", color: N.ink }}>{p.k}</b>
            <span style={{ fontSize: 17, lineHeight: 1.5, color: N.ink2 }}>{p.text}</span>
            {o === i && <span style={{ fontSize: 15, lineHeight: 1.6, color: N.muted, animation: "fadeUp .3s ease" }}>{p.more}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 }}>
        {PILLARS3.map((p) => <div key={p.k} style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 18px", borderRadius: 20, border: `1px solid ${N.line}`, background: "#fff", minHeight: 76 }}><IconTile icon={p.icon} size={42} /><span style={{ minWidth: 0 }}><b style={{ fontWeight: 600, fontSize: 16 }}>{p.k}</b><span style={{ display: "block", fontSize: 14, lineHeight: 1.45, color: N.muted }}>{p.text}</span></span></div>)}
      </div>
    </Section>
  );
}

// ── Final CTA ────────────────────────────────────────────────
export function FinalCta() {
  const { openAlba } = useAlba();
  return (
    <section data-screen-label="Neyu 12 Final" style={{ position: "relative", overflow: "hidden", padding: "clamp(72px,10vw,140px) clamp(16px,4vw,40px)", textAlign: "center", background: "#06111C", color: "#EAF2F6" }}>
      <BeamFlow style={{ position: "absolute", inset: 0, opacity: 0.95 }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 55% at 50% 50%, rgba(6,17,28,.55), transparent 75%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "grid", justifyItems: "center", gap: 18 }}>
        <AlbaOrb size={64} glow />
        <h2 style={{ margin: 0, fontSize: "clamp(40px,6vw,80px)", lineHeight: 1, letterSpacing: "-.045em", fontWeight: 500, color: "#FFFFFF" }}>Know more about<br /><span style={gradText}>your health.</span></h2>
        <p style={{ margin: 0, fontSize: 19, color: "rgba(234,242,246,.8)" }}>Connect the pieces. Understand the whole.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/my-health/sign-up" style={btn("grad")}>Get started<NIcon name="arrow" size={16} tone="light" /></a>
          <button onClick={() => openAlba()} style={{ ...btn("ghost"), background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.35)" }}><AlbaOrb size={20} motion={false} />Ask Neyu</button>
        </div>
        <AiBadge label="Listen · Connect · Flourish" />
      </div>
    </section>
  );
}
