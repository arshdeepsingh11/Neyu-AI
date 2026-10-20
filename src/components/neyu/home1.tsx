"use client";

// Neyu homepage, part 1: Hero (signal flow) · Health is connected (body map) ·
// One health record · Understand.
import React, { useEffect, useRef, useState } from "react";
import NeyuLogo from "@/components/brand/NeyuLogo";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import { signalNote } from "@/data/homeContent";
import { PROPOSITION, RECORD } from "@/data/neyu";
import { physicians } from "@/data/physicians";
import { NIcon, SvgIcon } from "./icons";
import { PillNav } from "./fx";
import { N, Section, AiBadge, AskNeyu, NodeNet, FlowLines, StatN, LiveChart, NeyuReads, btn, cardN, gradText, wrapN, eyebrowN, IconTile, type NetNode } from "./kit";

// ── 01 Hero ──────────────────────────────────────────────────
// The CEO's chain, drawn as one clear flow: You · Biology · Data stream into Neyu,
// and come out as Insight · Care · Life. Real data chips travel along each stream.
type FlowNode = { id: string; label: string; icon: string; side: "in" | "out" };
const FLOW: FlowNode[] = [
  { id: "person", label: "You", icon: "user", side: "in" },
  { id: "biology", label: "Biology", icon: "dna", side: "in" },
  { id: "data", label: "Data", icon: "chart", side: "in" },
  { id: "intel", label: "Insight", icon: "spark", side: "out" },
  { id: "care", label: "Care", icon: "stethoscope", side: "out" },
  { id: "life", label: "Life", icon: "leaf", side: "out" },
];
const CHIPS: Record<string, string> = { person: "Goals · questions", biology: "LDL 3.9 · CYP2C19", data: "BP 128/80 · sleep 6.8 h", intel: "LDL trending down", care: "Cardiology · repeat lipids", life: "Walk 20 min daily" };
const CHAIN_TXT: Record<string, string> = {
  person: "It starts with you — your story, your goals, your questions.",
  biology: "Genomics, biomarkers and microbiome: what makes you unique.",
  data: "Results, imaging, wearables and history, flowing into one record.",
  neyu: "Neyu sits at the centre: it reads everything and connects the pieces.",
  intel: "Patterns and risks surface early, explained in plain language.",
  care: "The right doctor, test or program — connected to everything else.",
  life: "The goal isn't a number. It's a longer, healthier life.",
};
function FlowHub({ active, onPick }: { active: string; onPick: (k: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  useEffect(() => { const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= 640)); ro.observe(el); return () => ro.disconnect(); }, []);
  const ins = FLOW.filter((f) => f.side === "in"), outs = FLOW.filter((f) => f.side === "out");
  const V = wide ? { w: 1000, h: 420 } : { w: 400, h: 720 };
  const hub = wide ? { x: 500, y: 210 } : { x: 200, y: 360 };
  const pos = (f: FlowNode, i: number) => wide ? { x: f.side === "in" ? 120 : 880, y: 90 + i * 120 } : { x: 70 + i * 130, y: f.side === "in" ? 80 : 640 };
  const stream = (f: FlowNode, i: number) => { const p = pos(f, i); return wide
    ? (f.side === "in" ? `M${p.x + 36} ${p.y} C${p.x + 190} ${p.y} ${hub.x - 170} ${hub.y} ${hub.x - 74} ${hub.y}` : `M${hub.x + 74} ${hub.y} C${hub.x + 170} ${hub.y} ${p.x - 190} ${p.y} ${p.x - 36} ${p.y}`)
    : (f.side === "in" ? `M${p.x} ${p.y + 36} C${p.x} ${p.y + 150} ${hub.x} ${hub.y - 170} ${hub.x} ${hub.y - 74}` : `M${hub.x} ${hub.y + 74} C${hub.x} ${hub.y + 170} ${p.x} ${p.y - 150} ${p.x} ${p.y - 36}`); };
  const hubOn = active === "neyu";
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${V.w} ${V.h}`} role="group" aria-label="How NEYU connects your health: you, biology and data flow into Neyu, which returns insight, care and a healthier life" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="fhG" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#2FBF94" /><stop offset=".55" stopColor="#1FA7B4" /><stop offset="1" stopColor="#2273D6" /></linearGradient>
          <linearGradient id="fhS" x1="0" x2="1"><stop offset="0" stopColor="#2FBF94" stopOpacity=".25" /><stop offset="1" stopColor="#2273D6" stopOpacity=".85" /></linearGradient>
          <radialGradient id="fhH"><stop offset="0" stopColor="#1FA7B4" stopOpacity=".35" /><stop offset="1" stopColor="#2273D6" stopOpacity="0" /></radialGradient>
          <radialGradient id="fhSpec" cx=".33" cy=".28" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".6" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <pattern id="fhP" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(14,27,44,.07)" /></pattern>
        </defs>
        <rect x="0" y="0" width={V.w} height={V.h} fill="url(#fhP)" rx="20" />
        {[...ins, ...outs].map((f) => { const i = (f.side === "in" ? ins : outs).indexOf(f); const d = stream(f, i); const on = active === f.id || hubOn; const chip = CHIPS[f.id]; const cw = chip.length * 6.1 + 20; return (
          <g key={f.id + "s"}>
            <path d={d} fill="none" stroke="rgba(14,27,44,.09)" strokeWidth={1.2} />
            <path d={d} fill="none" stroke={on ? "url(#fhG)" : "url(#fhS)"} strokeWidth={on ? 2.4 : 1.4} strokeDasharray={on ? "none" : "6 8"} style={{ transition: "all .3s" }}>{!on && <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.6s" repeatCount="indefinite" />}</path>
            <circle r="4" fill="#2273D6"><animateMotion dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" path={d} /></circle>
            {wide && <g opacity="0"><animateMotion dur={`${6 + i * 1.2}s`} repeatCount="indefinite" path={d} begin={`${i * 1.4 + (f.side === "out" ? 0.7 : 0)}s`} keyPoints={f.side === "in" ? "0.26;0.56" : "0.44;0.74"} keyTimes="0;1" calcMode="linear" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur={`${6 + i * 1.2}s`} begin={`${i * 1.4 + (f.side === "out" ? 0.7 : 0)}s`} repeatCount="indefinite" />
              <rect x={-cw / 2} y={-12} width={cw} height={24} rx={12} fill="#fff" stroke="rgba(31,167,180,.4)" style={{ filter: "drop-shadow(0 6px 10px rgba(14,27,44,.08))" }} />
              <text x={0} y={4} textAnchor="middle" fontSize="11.5" fill="#14324A" style={{ fontFamily: "inherit" }}>{chip}</text>
            </g>}
          </g>
        ); })}
        {/* hub */}
        <g transform={`translate(${hub.x} ${hub.y})`} role="button" tabIndex={0} aria-label="Neyu" aria-pressed={hubOn} onClick={() => onPick("neyu")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick("neyu"); } }} style={{ cursor: "pointer" }}>
          <circle r="128" fill="url(#fhH)"><animate attributeName="r" values="110;135;110" dur="3.6s" repeatCount="indefinite" /></circle>
          {[0, 1, 2].map((k) => <circle key={k} r="70" fill="none" stroke="rgba(31,167,180,.45)" strokeWidth="1"><animate attributeName="r" values="70;118" dur="3s" begin={`${k}s`} repeatCount="indefinite" /><animate attributeName="opacity" values=".6;0" dur="3s" begin={`${k}s`} repeatCount="indefinite" /></circle>)}
          <ellipse rx="96" ry="30" fill="none" stroke="rgba(31,167,180,.5)" strokeWidth="1.2"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite" /></ellipse>
          <ellipse rx="90" ry="38" fill="none" stroke="rgba(34,115,214,.35)"><animateTransform attributeName="transform" type="rotate" from="60" to="-300" dur="22s" repeatCount="indefinite" /></ellipse>
          <circle r="70" fill="url(#fhG)" />
          <circle r="70" fill="url(#fhSpec)" />
          <text y="2" textAnchor="middle" fontSize="24" fontWeight="600" fill="#fff" style={{ fontFamily: "inherit", letterSpacing: ".02em" }}>Neyu</text>
          <text y="24" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.85)" style={{ fontFamily: "inherit", letterSpacing: ".24em" }}>AI · CONNECTS</text>
        </g>
        {[...ins, ...outs].map((f) => { const i = (f.side === "in" ? ins : outs).indexOf(f); const p = pos(f, i); const on = active === f.id; return (
          <g key={f.id} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0} aria-label={f.label} aria-pressed={on} onClick={() => onPick(f.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(f.id); } }} style={{ cursor: "pointer" }}>
            {on && <circle r="56" fill="url(#fhH)" />}
            <circle r="36" fill="#fff" stroke={on ? "url(#fhG)" : "rgba(14,27,44,.12)"} strokeWidth={on ? 2.4 : 1} style={{ filter: "drop-shadow(0 10px 16px rgba(14,27,44,.10))" }} />
            {on && <circle r="44" fill="none" stroke="rgba(34,115,214,.4)" strokeDasharray="3 5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" /></circle>}
            <SvgIcon name={f.icon} x={0} y={0} size={26} color={on ? "url(#fhG)" : "#14324A"} stroke={on ? 1.8 : 1.5} />
            <text y={wide ? 58 : (f.side === "in" ? -50 : 62)} textAnchor="middle" fontSize={wide ? 15 : 17} fontWeight={on ? 600 : 500} fill="#0E1B2C" style={{ fontFamily: "inherit" }}>{f.label}</text>
          </g>
        ); })}
      </svg>
    </div>
  );
}

export function Hero() {
  const { openAlba } = useAlba();
  const [node, setNode] = useState<string>("neyu");
  const [auto, setAuto] = useState(true);
  useEffect(() => { if (!auto) return; const ids = ["person", "biology", "data", "neyu", "intel", "care", "life"]; let i = ids.indexOf("neyu"); const t = setInterval(() => { if (document.hidden) return; i = (i + 1) % ids.length; setNode(ids[i]); }, 3200); return () => clearInterval(t); }, [auto]);
  const label = node === "neyu" ? "Neyu" : FLOW.find((f) => f.id === node)?.label;
  return (
    <section data-screen-label="Neyu 01 Hero" style={{ position: "relative", overflow: "hidden", padding: "clamp(28px,5vw,64px) 0 clamp(40px,6vw,72px)", background: "radial-gradient(1000px 520px at 85% -10%, rgba(34,115,214,.10), transparent 60%), radial-gradient(900px 520px at 5% 10%, rgba(47,191,148,.10), transparent 60%)" }}>
      <FlowLines opacity={0.55} />
      <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr)", justifyItems: "center", textAlign: "center", gap: 18 }}>
        <NeyuLogo layout="stacked" fluid="clamp(120px,13vw,176px)" />
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(44px,7.6vw,100px)", lineHeight: 0.98, letterSpacing: "-.05em", fontWeight: 500, color: N.ink }}>Your Health, <span style={gradText}>Connected.</span></h1>
        <p style={{ margin: 0, fontSize: "clamp(17px,1.7vw,21px)", lineHeight: 1.55, color: N.ink2, maxWidth: 720 }}>{PROPOSITION.lead}</p>
        <AskNeyu big page="/" placeholder="Ask Neyu — what would you like to understand about your health?" suggestions={["Why does my blood pressure matter for my kidneys?", "Explain my LDL of 3.9", "What is an executive health assessment?", "Can I see a doctor virtually?"]} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => openAlba()} style={btn("ink")}><AlbaOrb size={20} motion={false} />Talk to Neyu</button>
          <a href="#connected" style={btn("ghost")}>Explore NEYU<NIcon name="arrow" size={16} style={{ transform: "rotate(90deg)" }} /></a>
        </div>
      </div>
      <div style={{ ...wrapN, position: "relative", marginTop: "clamp(28px,4vw,52px)" }}>
        <div style={{ ...cardN, padding: "clamp(14px,2vw,26px)", background: "rgba(255,255,255,.8)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "0 4px" }}>
            <span style={{ fontSize: 13, color: N.muted, letterSpacing: ".04em" }}>You · Biology · Data → <b style={{ fontWeight: 600, color: N.ink }}>Neyu</b> → Insight · Care · Life</span>
            <AiBadge label="Live · tap any node" />
          </div>
          <FlowHub active={node} onPick={(k) => { setAuto(false); setNode(k); }} />
          <p aria-live="polite" style={{ margin: 0, textAlign: "center", fontSize: 16, color: N.ink, minHeight: "1.6em", padding: "0 8px 4px" }}><b style={{ fontWeight: 600 }}>{label}.</b> {CHAIN_TXT[node]}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 12, marginTop: 22 }}>
          <StatN value={5} label="layers of your health in one record" />
          <StatN value={physicians.length} label="physicians on the NEYU team" />
          <StatN value={40} suffix="+" label="advanced lab tests through BioAro Labs" />
          <StatN value={24} suffix="/7" label="Neyu, your AI health companion" />
        </div>
      </div>
    </section>
  );
}

// ── 02 Health is connected ───────────────────────────────────
// An anatomical map: tap an organ and Neyu draws its real connections across the body.
type Organ = { id: string; label: string; icon: string; x: number; y: number; side?: "l" | "r" };
const BODY: Organ[] = [
  { id: "brain", label: "Brain", icon: "brain", x: 300, y: 92 },
  { id: "hormone", label: "Thyroid & hormones", icon: "hormone", x: 300, y: 172, side: "r" },
  { id: "lungs", label: "Lungs", icon: "lungs", x: 258, y: 238, side: "l" },
  { id: "heart", label: "Heart", icon: "heart", x: 326, y: 262, side: "r" },
  { id: "metab", label: "Metabolism", icon: "bolt", x: 282, y: 330, side: "l" },
  { id: "kidney", label: "Kidneys", icon: "kidney", x: 322, y: 384, side: "r" },
  { id: "sleep", label: "Sleep", icon: "moon", x: 92, y: 150 },
  { id: "genes", label: "Genes", icon: "dna", x: 508, y: 150 },
];
const LINKS: { a: string; b: string; t: string }[] = [
  { a: "heart", b: "kidney", t: "High blood pressure strains the heart and the kidneys together, and kidney function changes how many heart medicines are dosed." },
  { a: "heart", b: "metab", t: "Diabetes and insulin resistance raise cardiovascular risk substantially — glucose and cholesterol are best read side by side." },
  { a: "heart", b: "sleep", t: "Untreated sleep apnea raises blood pressure and is linked to atrial fibrillation; better sleep often helps the heart." },
  { a: "heart", b: "lungs", t: "Breathlessness can start in the heart or the lungs. Testing both avoids missing the real cause." },
  { a: "heart", b: "brain", t: "What protects the heart protects the brain: controlling blood pressure lowers the risk of stroke." },
  { a: "heart", b: "genes", t: "Family history and inherited conditions such as high Lp(a) or familial hypercholesterolemia change the targets that are right for you." },
  { a: "metab", b: "hormone", t: "Thyroid and other hormones shape weight, energy, cholesterol and even heart rhythm." },
  { a: "kidney", b: "metab", t: "Diabetes is a leading cause of kidney disease; protecting one protects the other." },
  { a: "sleep", b: "metab", t: "Short sleep affects appetite hormones and blood-sugar control." },
  { a: "genes", b: "hormone", t: "Genes influence how you make and respond to hormones — and how you process many medicines." },
  { a: "lungs", b: "sleep", t: "Breathing problems at night, like sleep apnea, link the lungs to sleep quality and daytime energy." },
  { a: "brain", b: "sleep", t: "Sleep is when the brain clears waste and consolidates memory." },
  { a: "kidney", b: "hormone", t: "The kidneys make hormones too — renin raises blood pressure, and erythropoietin drives red-cell production." },
];
// Left half of a calm front-facing figure; mirrored to make the whole silhouette.
const HALF: [string, number[]][] = [["M", [300, 134]], ["C", [286, 134, 282, 142, 282, 152]], ["L", [282, 158]], ["C", [262, 164, 236, 166, 222, 176]], ["C", [206, 188, 202, 206, 200, 226]], ["L", [190, 330]], ["C", [188, 360, 182, 400, 176, 440]], ["C", [174, 456, 170, 470, 172, 478]], ["C", [176, 486, 186, 484, 188, 474]], ["L", [198, 400]], ["C", [202, 370, 210, 330, 214, 300]], ["L", [220, 250]], ["C", [224, 284, 226, 320, 224, 352]], ["C", [222, 380, 214, 404, 214, 432]], ["L", [222, 590]], ["C", [222, 606, 232, 614, 246, 612]], ["L", [262, 610]], ["C", [270, 608, 272, 600, 270, 592]], ["L", [284, 462]], ["C", [288, 450, 294, 446, 300, 446]]];
const silhouette = (() => {
  const L = HALF.map(([c, n]) => `${c}${n.join(" ")}`).join(" ");
  // mirror: walk the left half backwards with x → 600 − x
  const pts: number[][] = HALF.map(([, n]) => n);
  let R = "";
  for (let i = HALF.length - 1; i > 0; i--) {
    const [cmd] = HALF[i]; const n = pts[i]; const prevEnd = pts[i - 1].slice(-2);
    if (cmd === "C") R += ` C${600 - n[2]} ${n[3]} ${600 - n[0]} ${n[1]} ${600 - prevEnd[0]} ${prevEnd[1]}`;
    else R += ` L${600 - prevEnd[0]} ${prevEnd[1]}`;
  }
  return `${L}${R} Z`;
})();
function BodyMap({ pick, onPick }: { pick: string | null; onPick: (k: string) => void }) {
  const at = (k: string) => BODY.find((b) => b.id === k)!;
  const lit = LINKS.filter((l) => pick && (l.a === pick || l.b === pick));
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => { const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => setK(Math.min(1.9, Math.max(1, 420 / Math.max(1, e.contentRect.width))))); ro.observe(el); return () => ro.disconnect(); }, []);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg viewBox="0 0 600 640" role="group" aria-label="Body map — tap an organ to see how it connects" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="bmG" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#2FBF94" /><stop offset=".55" stopColor="#1FA7B4" /><stop offset="1" stopColor="#2273D6" /></linearGradient>
          <linearGradient id="bmFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#EAF6F3" /><stop offset="1" stopColor="#EDF3FA" /></linearGradient>
          <radialGradient id="bmH"><stop offset="0" stopColor="#1FA7B4" stopOpacity=".32" /><stop offset="1" stopColor="#2273D6" stopOpacity="0" /></radialGradient>
          <pattern id="bmScan" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6h6" stroke="rgba(31,167,180,.10)" /></pattern>
        </defs>
        {/* orbit and scan line */}
        <ellipse cx="300" cy="330" rx="250" ry="290" fill="none" stroke="rgba(14,27,44,.06)" strokeDasharray="2 9" />
        <ellipse cx="300" cy="88" rx="38" ry="46" fill="url(#bmFill)" stroke="url(#bmG)" strokeWidth="1.4" />
        <path d={silhouette} fill="url(#bmFill)" stroke="url(#bmG)" strokeWidth="1.4" strokeLinejoin="round" />
        <path d={silhouette} fill="url(#bmScan)" />
        <rect x="150" y="40" width="300" height="2" fill="url(#bmG)" opacity=".5"><animate attributeName="y" values="40;610;40" dur="9s" repeatCount="indefinite" /></rect>
        {LINKS.map((l, i) => {
          const A = at(l.a), B = at(l.b); const on = lit.includes(l);
          const mx = (A.x + B.x) / 2 + (A.y - B.y) * 0.25, my = (A.y + B.y) / 2 + (B.x - A.x) * 0.25;
          const d = `M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`;
          return <g key={i}><path d={d} fill="none" stroke={on ? "url(#bmG)" : "rgba(14,27,44,.07)"} strokeWidth={on ? 2.2 : 1} style={{ transition: "stroke .3s" }} />{on && <circle r={3.6} fill="#2273D6"><animateMotion dur={`${1.8 + (i % 3) * 0.5}s`} repeatCount="indefinite" path={d} /></circle>}</g>;
        })}
        {BODY.map((o) => {
          const on = pick === o.id, linked = lit.some((l) => l.a === o.id || l.b === o.id), r = 21 * Math.min(k, 1.5);
          const lx = o.side === "l" ? -r - 10 : o.side === "r" ? r + 10 : 0, anchor = o.side === "l" ? "end" : o.side === "r" ? "start" : "middle", ly = o.side ? 5 : (o.id === "brain" ? -r - 12 : r + 20);
          return (
            <g key={o.id} transform={`translate(${o.x} ${o.y})`} role="button" tabIndex={0} aria-label={o.label} aria-pressed={on} onClick={() => onPick(o.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(o.id); } }} style={{ cursor: "pointer" }}>
              {on && <circle r={r * 2.2} fill="url(#bmH)"><animate attributeName="r" values={`${r * 1.8};${r * 2.4};${r * 1.8}`} dur="2.8s" repeatCount="indefinite" /></circle>}
              <circle r={r} fill="#fff" stroke={on || linked ? "url(#bmG)" : "rgba(14,27,44,.16)"} strokeWidth={on ? 2.4 : linked ? 1.8 : 1} style={{ filter: "drop-shadow(0 6px 10px rgba(14,27,44,.12))", transition: "all .3s" }} />
              <SvgIcon name={o.icon} x={0} y={0} size={r * 1.05} color={on || linked ? "url(#bmG)" : "#14324A"} stroke={1.6} />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={13.5 * Math.min(k, 1.35)} fontWeight={on ? 600 : 500} fill="#0E1B2C" style={{ fontFamily: "inherit", paintOrder: "stroke", stroke: "#F7F6F2", strokeWidth: 4 }}>{o.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export function Connected() {
  const [pick, setPick] = useState<string | null>("heart");
  const links = LINKS.filter((l) => pick && (l.a === pick || l.b === pick));
  const label = (k: string) => BODY.find((b) => b.id === k)?.label || k;
  const neyu = pick && links.length ? `${label(pick)} connects to ${links.map((l) => label(l.a === pick ? l.b : l.a).toLowerCase()).join(", ")}. ${links[0].t}` : "Tap any part of the body: Neyu shows how it connects to the rest — because no organ works alone.";
  return (
    <Section id="connected" label="Neyu 02 Connected" eyebrow="Connected care" title={<>Health is connected.<br /><span style={gradText}>Your care should be too.</span></>} lead="Your body doesn't operate in specialties. Neither should your health experience. NEYU connects the information, people and technology involved in your health.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 24, alignItems: "center" }}>
        <div style={{ ...cardN, padding: "clamp(10px,2vw,22px)", background: "radial-gradient(520px 420px at 50% 45%, #F3FAF8, #FFFFFF)" }}>
          <BodyMap pick={pick} onPick={(k) => setPick(k === pick ? null : k)} />
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <NeyuReads text={neyu} ask={pick ? `How does my ${label(pick).toLowerCase()} affect the rest of my health?` : undefined} />
          <div style={{ display: "grid", gap: 8 }}>
            {links.slice(0, 4).map((l) => (
              <div key={l.a + l.b} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 4, padding: "12px 14px", borderRadius: 16, background: "#fff", border: `1px solid ${N.line}`, animation: "fadeUp .3s ease" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: N.deep }}><NIcon name={BODY.find((b) => b.id === l.a)!.icon} size={16} tone="grad" />{label(l.a)}<span style={{ color: N.faint }}>↔</span><NIcon name={BODY.find((b) => b.id === l.b)!.icon} size={16} tone="grad" />{label(l.b)}</span>
                <span style={{ fontSize: 14.5, lineHeight: 1.5, color: N.ink2 }}>{l.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── 03 One health record ─────────────────────────────────────
export function OneRecord() {
  const [k, setK] = useState(RECORD[1].k);
  const cur = RECORD.find((r) => r.k === k)!;
  const pos = [[500, 80], [820, 230], [700, 520], [300, 520], [180, 230]];
  const nodes: NetNode[] = [{ id: "rec", label: "Your record", x: 500, y: 300, r: 70 }, ...RECORD.map((r, i) => ({ id: r.k, label: r.title, sub: r.sub, x: pos[i][0], y: pos[i][1], icon: r.icon }))];
  return (
    <Section id="record" tone="white" label="Neyu 03 Record" eyebrow="Your Health. One Record." title={<>One health record.<br /><span style={gradText}>A clearer picture.</span></>} lead="Clinical history, diagnostics, biology, lifestyle and environment — finally in one place, and finally read together.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 24, alignItems: "stretch" }}>
        <div style={{ ...cardN, padding: 12 }}>
          <NodeNet viewBox="120 20 760 590" ariaLabel="Five layers of your health record" nodes={nodes} edges={RECORD.map((r) => ["rec", r.k] as [string, string]).concat([["records", "diagnostics"], ["diagnostics", "biology"], ["biology", "lifestyle"], ["lifestyle", "environment"], ["environment", "records"]])} center="rec" active={k} onPick={(x) => x !== "rec" && setK(x)} height="clamp(300px,40vw,470px)" />
        </div>
        <div key={k} style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 14, alignContent: "start", animation: "fadeUp .3s ease" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><IconTile icon={cur.icon} /><div><b style={{ fontWeight: 500, fontSize: 22 }}>{cur.title}</b><div style={{ fontSize: 14, color: N.muted }}>{cur.sub}</div></div></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{cur.sample.map((s) => <span key={s} style={{ padding: "6px 12px", borderRadius: 999, background: N.line2, fontSize: 13.5, color: N.ink2 }}>{s}</span>)}</div>
          <LiveChart mode={cur.chart} height={190} label={`${cur.title} — illustrative`} />
          <NeyuReads title="Neyu connects it · example" text={cur.neyu} ask={`What would NEYU show me about my ${cur.title.toLowerCase()}?`} />
          <a href="/my-health" style={{ ...btn("ink"), justifySelf: "start" }}>Open My Health Space<NIcon name="arrow" size={16} tone="currentColor" /></a>
        </div>
      </div>
    </Section>
  );
}

// ── 04 Understand what your health is telling you ────────────
const UTABS = [
  { k: "ask", t: "Ask questions", icon: "chat" },
  { k: "patterns", t: "Explore patterns", icon: "chart" },
  { k: "results", t: "Understand your results", icon: "flask" },
  { k: "discuss", t: "Know what to discuss", icon: "doc" },
] as const;
const SAMPLE_RESULTS = [
  { n: "LDL cholesterol", v: "3.9 mmol/L", flag: "Above usual target", t: "LDL above 3.5 is read together with blood pressure, family history and diabetes risk — for some people the target is lower." },
  { n: "HbA1c", v: "6.1 %", flag: "Prediabetes range", t: "6.0–6.4 % is the prediabetes range in Canadian guidelines — a strong moment for nutrition and activity changes." },
  { n: "hs-CRP", v: "2.4 mg/L", flag: "Average risk", t: "1–3 mg/L is average cardiovascular risk. It's often repeated, because a recent cold can raise it." },
];
export function Understand() {
  const { openAlba } = useAlba();
  const [tab, setTab] = useState<(typeof UTABS)[number]["k"]>("patterns");
  const [ptab, setPtab] = useState("bp");
  const [ldl, setLdl] = useState(3.9);
  const [act, setAct] = useState(90);
  const [res, setRes] = useState(0);
  const param = ptab === "ldl" ? Math.round(ldl * 10) : ptab === "activity" ? act : undefined;
  return (
    <Section id="understand" label="Neyu 04 Understand" eyebrow="Neyu intelligence" title={<>Understand what your health<br /><span style={gradText}>is telling you.</span></>} lead="NEYU turns complex health information into understandable insights. Ask questions. Explore patterns. Understand your results. Know what to discuss with your care team.">
      <PillNav label="Ways Neyu helps" tabs={UTABS.map((t) => ({ k: t.k, label: t.t, icon: t.icon }))} value={tab} onChange={(k) => setTab(k)} />
      <div key={tab} style={{ animation: "fadeUp .3s ease" }}>
        {tab === "ask" && <div style={{ ...cardN, padding: "clamp(18px,3vw,32px)", display: "grid", gap: 16, justifyItems: "start" }}><AiBadge /><AskNeyu page="/" suggestions={["What does a high hs-CRP mean?", "Is 135/85 high for a home reading?", "What should I ask my cardiologist?"]} /></div>}
        {tab === "patterns" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <PillNav size="sm" label="Signal" tabs={[{ k: "bp", label: "Blood pressure", icon: "gauge" }, { k: "ldl", label: "Cholesterol", icon: "drop" }, { k: "activity", label: "Activity", icon: "steps" }, { k: "ecg", label: "Heart rhythm", icon: "heartPulse" }]} value={ptab as "bp"} onChange={(k) => setPtab(k)} />
              {ptab === "ldl" && <label style={{ display: "grid", gap: 6 }}><span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>LDL cholesterol<b style={{ fontWeight: 600 }}>{ldl.toFixed(1)} mmol/L</b></span><input type="range" min={1.5} max={6.2} step={0.1} value={ldl} onChange={(e) => setLdl(+e.target.value)} style={{ accentColor: N.blue }} /></label>}
              {ptab === "activity" && <label style={{ display: "grid", gap: 6 }}><span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>Active minutes / week<b style={{ fontWeight: 600 }}>{act}</b></span><input type="range" min={0} max={320} step={10} value={act} onChange={(e) => setAct(+e.target.value)} style={{ accentColor: N.blue }} /></label>}
              <NeyuReads key={ptab + ldl + act} text={signalNote(ptab, ldl, act)} ask={"Explain this in plain language: " + signalNote(ptab, ldl, act)} />
            </div>
            <div style={{ ...cardN, padding: 14 }}><LiveChart mode={ptab} param={param} height="clamp(240px,26vw,300px)" /></div>
          </div>
        )}
        {tab === "results" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 20 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {SAMPLE_RESULTS.map((r, i) => (
                <button key={r.n} onClick={() => setRes(i)} aria-pressed={res === i} style={{ textAlign: "left", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "16px 18px", borderRadius: 18, border: `1px solid ${res === i ? N.blue : N.line}`, background: res === i ? "linear-gradient(160deg,#fff,#EEF7FC)" : "#fff", cursor: "pointer" }}>
                  <span><b style={{ fontWeight: 500, fontSize: 16 }}>{r.n}</b><span style={{ display: "block", fontSize: 13, color: N.muted }}>{r.flag}</span></span>
                  <span style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
                </button>
              ))}
              <span style={{ fontSize: 12.5, color: N.faint }}>Sample values for demonstration.</span>
            </div>
            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <NeyuReads key={res} text={SAMPLE_RESULTS[res].t} ask={`My ${SAMPLE_RESULTS[res].n} is ${SAMPLE_RESULTS[res].v}. What does that mean?`} />
              <a href="/lab-results" style={{ ...btn("grad"), justifySelf: "start" }}>Explain my own results<NIcon name="arrow" size={16} tone="currentColor" /></a>
            </div>
          </div>
        )}
        {tab === "discuss" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 20 }}>
            <div style={{ ...cardN, padding: 22, display: "grid", gap: 10 }}>
              <AiBadge label="Neyu visit prep · example" />
              <b style={{ fontWeight: 500, fontSize: 19 }}>Questions for your cardiology visit</b>
              {["My LDL is 3.9 — is my target lower because of my family history?", "Should my home blood pressure readings change my medication?", "Would a stress echo or carotid ultrasound add anything for me?", "When should I repeat my blood work?"].map((q, i) => <div key={q} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.5 }}><span style={{ color: N.tealText, fontWeight: 600 }}>{i + 1}</span>{q}</div>)}
            </div>
            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <NeyuReads text="Bring your home blood-pressure log, a list of your medicines, and these questions. A two-week home average tells your clinician more than any single reading." />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/referral-centre" style={btn("grad")}>Prepare my visit<NIcon name="arrow" size={16} tone="currentColor" /></a>
                <button onClick={() => openAlba("Help me prepare questions for my next doctor's visit.")} style={btn("ghost")}>Ask Neyu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
