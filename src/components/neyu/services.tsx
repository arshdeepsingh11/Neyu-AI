"use client";

// New NEYU services + companion pages: Meet Neyu, Virtual Care, Virtual
// Hypertension Clinic, Private Health Packages & Executive Health, Membership,
// At-home Blood Collection, and Explore (all services).
import React, { useMemo, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import AskPanel from "@/components/specialty/AskPanel";
import { SPECS, DIAGS } from "@/data/homeContent";
import { physicians } from "@/data/physicians";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { PAPERS } from "@/data/longevityScience";
import { OS, PHILOSOPHY, PACKAGES, pkgLabTotal, MEMBERSHIP, MEMBERSHIP_COMPARE, memberHas, AT_HOME_TESTS, SERVICES, PILLARS, type Pkg } from "@/data/neyu";
import { N, Section, PillarHero, NodeNet, LiveChart, NeyuReads, CapCard, CtaBand, StepRail, AiBadge, RequestForm, AskNeyu, btn, cardN, gradText, IconTile, FlowLines, StatN, wrapN, type NetNode } from "./kit";
import { Cylinder3D, PillNav } from "./fx";
import { NIcon } from "./icons";

// ═════════════════════ MEET NEYU ═════════════════════
export function MeetNeyuPage() {
  const { openAlba } = useAlba();
  const [os, setOs] = useState(2);
  const knows = [
    { v: SPECS.length, l: "specialties" }, { v: physicians.length, l: "physicians" }, { v: LAB_TESTS.length, l: "lab tests & prices" },
    { v: PAPERS.length, l: "research papers" }, { v: DIAGS.length, l: "diagnostic services" }, { v: SERVICES.length, l: "new NEYU services" },
  ];
  const can = [
    ["ph-chat-circle-dots", "Answers health questions", "Conditions, symptoms, tests and treatments, in plain language — grounded in NEYU's own knowledge."],
    ["ph-flask", "Explains your results", "Type, photograph or upload results; every value explained in context."],
    ["ph-path", "Finds your pathway", "Turns what you describe into the right specialist, test, virtual visit or program."],
    ["ph-clipboard-text", "Prepares your visit", "Symptoms, history and questions turned into a one-page summary."],
    ["ph-chart-line-up", "Reads your trends", "In My Health Space, with your consent: blood pressure, sleep, activity and labs over time."],
    ["ph-microphone", "Listens and speaks", "Talk to Neyu and hear answers read aloud."],
  ];
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden", padding: "clamp(48px,8vw,110px) 0", background: "radial-gradient(900px 500px at 50% 0%, rgba(42,132,228,.14), transparent 65%)" }}>
        <FlowLines opacity={0.7} />
        <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr)", justifyItems: "center", textAlign: "center", gap: 18 }}>
          <div style={{ padding: 30 }}><AlbaOrb size={130} glow /></div>
          <AiBadge label="Your intelligent health companion" />
          <h1 style={{ margin: 0, fontSize: "clamp(46px,7vw,92px)", lineHeight: 1, letterSpacing: "-.05em", fontWeight: 500 }}>Meet <span style={gradText}>Neyu.</span></h1>
          <p style={{ margin: 0, fontSize: "clamp(17px,1.6vw,20px)", lineHeight: 1.6, color: N.ink2, maxWidth: 680 }}>Neyu helps you make sense of your health information, answer questions, identify what deserves attention and navigate your next steps. Ask a question. Understand a result. Prepare for a visit. Explore your health.</p>
          <AskNeyu big page="/neyu" suggestions={["What can you help me with?", "Explain an HbA1c of 6.2", "Prepare me for a cardiology visit"]} />
        </div>
      </section>
      <Section tone="white" label="Chat" eyebrow="Talk to Neyu" title={<>Ask anything. <span style={gradText}>Get clarity.</span></>}>
        <AskPanel page="/neyu" label="your health" suggestions={["What does NEYU offer?", "Which test checks inflammation?", "How does the Virtual Hypertension Clinic work?", "What is an executive health assessment?"]} accent={N.blue} />
      </Section>
      <Section label="Capabilities" eyebrow="What Neyu can do" title="The AI is the interface. Understanding is the product.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 14 }}>
          {can.map(([ic, t, d]) => <button key={t} onClick={() => openAlba(t === "Explains your results" ? "Can you explain my blood test results?" : `How can you help me: ${t.toLowerCase()}?`)} className="sx-card" style={{ ...cardN, padding: 22, display: "grid", gap: 10, textAlign: "left", cursor: "pointer" }}><IconTile icon={ic} /><b style={{ fontWeight: 500, fontSize: 19 }}>{t}</b><span style={{ fontSize: 15, color: N.ink2, lineHeight: 1.55 }}>{d}</span></button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 12 }}>{knows.map((k) => <StatN key={k.l} value={k.v} label={`${k.l} Neyu knows`} />)}</div>
      </Section>
      <Section tone="dark" label="OS" eyebrow="How NEYU works" title={<>One identity. One record. <span style={gradText}>One intelligence.</span></>} lead="NEYU is built in layers, so new services plug in without changing how you use it.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 24, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {OS.map((o, i) => <button key={o.k} onClick={() => setOs(i)} aria-pressed={os === i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", borderRadius: 16, border: `1px solid ${os === i ? "rgba(126,224,192,.6)" : "rgba(255,255,255,.1)"}`, background: os === i ? "rgba(60,199,158,.14)" : "rgba(255,255,255,.03)", color: "#EAF2F6", cursor: "pointer", textAlign: "left", marginLeft: i * 10 }}><span style={{ fontSize: 12, color: "#7EE0C0", width: 20 }}>0{i + 1}</span><NIcon name={o.icon} size={22} tone="#7EE0C0" /><span><b style={{ fontWeight: 600, color: "#fff" }}>NEYU {o.k}</b><span style={{ display: "block", fontSize: 14, color: "rgba(234,242,246,.72)" }}>{o.text}</span></span></button>)}
          </div>
          <NeyuReads dark key={os} title={`NEYU ${OS[os].k}`} text={OS[os].text + " " + (["Your consent settings decide what Neyu can read.", "Wearables, labs, imaging and genomics all flow into the same place.", "Neyu explains, connects and flags — it never diagnoses.", "Specialists, virtual visits and diagnostics share one record.", "Assessments, packages and programs catch risk early.", "Your healthspan is tracked over years."][os])} />
        </div>
      </Section>
      <Section tone="soft" label="Safety" center eyebrow="Safety first" title="Neyu knows when to step aside.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
          {[["ph-siren", "Emergencies go to 911", "Emergency words are caught before any AI runs, every time."], ["ph-prohibit", "No diagnosis", "Neyu explains and guides; your clinician diagnoses and treats."], ["ph-lock-key", "Your consent", "In My Health Space, Neyu only sees what you switch on."], ["ph-books", "Grounded answers", "Facts and prices come from NEYU's own knowledge, not guesses."]].map(([ic, t, d]) => <div key={t} style={{ ...cardN, padding: 20, display: "grid", gap: 8, textAlign: "left" }}><IconTile icon={ic} size={40} /><b style={{ fontWeight: 500, fontSize: 18 }}>{t}</b><span style={{ fontSize: 14.5, color: N.ink2 }}>{d}</span></div>)}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>{PHILOSOPHY.map((p) => <span key={p.k} style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-.02em" }}>{p.k}.</span>)}</div>
      </Section>
    </>
  );
}

// ═════════════════════ VIRTUAL CARE ═════════════════════
export function VirtualCare() {
  const [step, setStep] = useState(1);
  const steps = [
    { t: "Request", d: "Choose a visit type and a time that suits you.", icon: "ph-calendar-plus" },
    { t: "Neyu intake", d: "Neyu gathers your symptoms, medicines and questions first.", icon: "ph-brain" },
    { t: "Video visit", d: "A secure video visit with a NEYU physician.", icon: "ph-video-camera" },
    { t: "Plan & follow-up", d: "Your plan, results and next steps land in your record.", icon: "ph-folder-simple-user" },
  ];
  const nodes: NetNode[] = [{ id: "home", label: "You, at home", x: 160, y: 300, icon: "ph-house-line", r: 44 }, { id: "neyu", label: "Neyu", x: 500, y: 300, r: 62 }, { id: "doc", label: "NEYU physician", x: 840, y: 300, icon: "ph-stethoscope", r: 44 }, { id: "rec", label: "Your record", x: 500, y: 90, icon: "ph-folder-simple-user" }, { id: "labs", label: "Labs & imaging", x: 500, y: 520, icon: "ph-flask" }];
  return (
    <>
      <PillarHero kicker="Virtual Care" title={<>See a doctor<br /><span style={gradText}>from home.</span></>} lead="Secure video visits with NEYU physicians. Neyu prepares your visit before you join, and everything you discuss is connected to your record." page="/virtual-care"
        suggestions={["What can be treated virtually?", "How do I prepare for a video visit?", "Can I review my results virtually?"]}
        stats={[{ v: physicians.length, l: "NEYU physicians" }, { v: 4, l: "steps, start to plan" }, { v: 1, l: "connected record" }]}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="Virtual visit: you, Neyu and your physician, connected to your record" nodes={nodes} edges={[["home", "neyu"], ["neyu", "doc"], ["neyu", "rec"], ["neyu", "labs"], ["rec", "doc"], ["labs", "doc"]]} center="neyu" height="clamp(280px,32vw,400px)" /></div>} />
      <Section tone="white" label="How it works" eyebrow="How it works" title={<>Four steps. <span style={gradText}>Neyu in every one.</span></>}>
        <StepRail steps={steps} active={step} onPick={setStep} />
        <NeyuReads key={step} text={["Pick a new concern, a follow-up, a results review or a medication review — and a time.", "Before your visit, Neyu asks a few questions and builds a summary for your physician, so the visit starts where it should.", "Join from your phone or computer. Your physician already has Neyu's summary and your record.", "Your plan, any tests ordered and your next steps appear in My Health Space — Neyu can explain them afterwards."][step]} />
      </Section>
      <Section label="Suitability" eyebrow="Is virtual right for me?" title="Good for virtual — and when to come in.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16 }}>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 10 }}><b style={{ fontWeight: 500, fontSize: 19, color: "#1F7A55" }}><NIcon name="ph-check-circle" size={18} tone={"currentColor"} /> Usually good virtually</b>{["Follow-up visits and results reviews", "Blood-pressure and diabetes check-ins", "Medication reviews", "Questions about a diagnosis or test", "Planning tests before an in-person visit"].map((x) => <span key={x} style={{ fontSize: 15, color: N.ink2 }}>• {x}</span>)}</div>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 10 }}><b style={{ fontWeight: 500, fontSize: 19, color: "#9A4A1C" }}><NIcon name="ph-buildings" size={18} tone={"currentColor"} /> Better in person</b>{["When an examination or test is needed", "New, severe or worsening symptoms", "Imaging, stress testing or monitoring", "Procedures"].map((x) => <span key={x} style={{ fontSize: 15, color: N.ink2 }}>• {x}</span>)}</div>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 10, background: "#FBEDE9", borderColor: "#F1C9BD" }}><b style={{ fontWeight: 600, fontSize: 19, color: "#8B2F1C" }}><NIcon name="ph-siren" size={18} tone={"currentColor"} /> Emergencies</b><span style={{ fontSize: 15, color: "#5A2A1E", lineHeight: 1.55 }}>Chest pain, trouble breathing, fainting, stroke signs or severe bleeding: call 911 or go to the nearest emergency department. Virtual care is not for emergencies.</span></div>
        </div>
      </Section>
      <Section id="request" tone="white" label="Request" eyebrow="Request a virtual visit" title="Tell us what you need.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "start" }}>
          <RequestForm service="virtual-care" title="Request a virtual visit" options={{ label: "Visit type", values: ["New concern", "Follow-up", "Results review", "Medication review", "Blood-pressure check-in"] }} cta="Request my visit" />
          <div style={{ display: "grid", gap: 12 }}>
            <NeyuReads text="Most specialist visits in Alberta need a referral. If you have one, the team links it to your visit; if not, they'll explain the options." ask="Do I need a referral for a virtual visit?" />
            <a href="/referral-centre" style={{ ...btn("ghost"), justifySelf: "start" }}><NIcon name="ph-paper-plane-tilt" size={18} tone={"currentColor"} />Upload a referral</a>
          </div>
        </div>
      </Section>
      <CtaBand title="Ongoing care, virtually." text="Virtual visits are included in NEYU Membership Plus and Executive." primary={{ label: "See membership", href: "/membership" }} secondary={{ label: "Ask Neyu", alba: "How does NEYU virtual care work?" }} />
    </>
  );
}

// ═════════════════════ VIRTUAL HYPERTENSION CLINIC ═════════════════════
type Reading = { s: number; d: number; t: string };
const START: Reading[] = [[142, 91], [138, 88], [140, 90], [136, 86], [134, 85], [137, 87], [132, 84], [130, 83]].map(([s, d], i) => ({ s, d, t: `Day ${i + 1}` }));
export function HypertensionClinic() {
  const { openAlba } = useAlba();
  const [rs, setRs] = useState<Reading[]>(START);
  const [s, setS] = useState(""), [d, setD] = useState("");
  const add = (e: React.FormEvent) => { e.preventDefault(); const sv = +s, dv = +d; if (sv < 70 || sv > 260 || dv < 40 || dv > 160) return; setRs([...rs, { s: sv, d: dv, t: `Day ${rs.length + 1}` }].slice(-14)); setS(""); setD(""); };
  const last = rs.slice(-7); const avgS = Math.round(last.reduce((a, r) => a + r.s, 0) / last.length), avgD = Math.round(last.reduce((a, r) => a + r.d, 0) / last.length);
  const urgent = rs.some((r) => r.s >= 180 || r.d >= 110);
  const status = urgent ? { t: "A reading is very high", c: "#8B2F1C", x: "A home reading at or above 180/110 needs prompt medical attention. With chest pain, shortness of breath, weakness or confusion, call 911." } : avgS >= 135 || avgD >= 85 ? { t: "Above the home target", c: "#9A4A1C", x: `Your 7-reading average is ${avgS}/${avgD}. Hypertension Canada uses 135/85 as the home threshold — your physician reviews this with you.` } : { t: "Within the home target", c: "#1F7A55", x: `Your 7-reading average is ${avgS}/${avgD}, below 135/85. Keep measuring — the trend matters more than one reading.` };
  const lo = 60, hi = 190, x = (i: number) => 40 + i * (920 / Math.max(1, rs.length - 1)), y = (v: number) => 250 - ((v - lo) / (hi - lo)) * 220;
  const program = [
    { t: "Enroll", d: "A short intake and a physician review of your history.", icon: "ph-user-plus" },
    { t: "Measure", d: "Two readings, morning and evening, for 7 days with a validated cuff.", icon: "ph-gauge" },
    { t: "Neyu coaching", d: "Neyu explains your readings and nudges the habits that matter.", icon: "ph-brain" },
    { t: "Physician review", d: "Your NEYU physician reviews your averages and adjusts your plan.", icon: "ph-stethoscope" },
    { t: "Keep improving", d: "Regular check-ins until your average is on target — and it stays there.", icon: "ph-trend-down" },
  ];
  const [ps, setPs] = useState(1);
  return (
    <>
      <PillarHero kicker="Virtual Hypertension Clinic" title={<>Blood pressure,<br /><span style={gradText}>managed from home.</span></>} lead="A remote program for high blood pressure: home readings, Neyu coaching between visits, and regular review by a NEYU physician — all in one connected record." page="/hypertension-clinic"
        suggestions={["How do I measure blood pressure correctly?", "What is a normal home reading?", "Does salt really matter?"]}
        stats={[{ v: 135, s: "/85", l: "home target (Hypertension Canada)" }, { v: 7, l: "days of readings per review" }, { v: 2, l: "readings, morning and evening" }]}
        visual={<div style={{ ...cardN, padding: 14 }}><LiveChart mode="bp" height="clamp(260px,30vw,360px)" label="Home blood pressure, 14 days — illustrative" /></div>} />
      <Section tone="white" label="Log" eyebrow="Try it · your readings" title={<>Log a reading. <span style={gradText}>Neyu reads the trend.</span></>} lead="Add home readings and watch your 7-reading average against the 135/85 home target. Sample readings are pre-filled.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "start" }}>
          <div style={{ ...cardN, padding: "clamp(14px,2vw,22px)", display: "grid", gap: 12 }}>
            <svg viewBox="0 0 1000 280" style={{ width: "100%", height: "auto" }} role="img" aria-label={`Home readings, average ${avgS}/${avgD}`}>
              <rect x="40" y={y(135)} width="920" height={y(85) - y(135)} fill="rgba(60,199,158,.08)" />
              <line x1="40" x2="960" y1={y(135)} y2={y(135)} stroke="#3CC79E" strokeDasharray="6 6" /><line x1="40" x2="960" y1={y(85)} y2={y(85)} stroke="#2A84E4" strokeDasharray="6 6" />
              <text x="964" y={y(135) + 4} fontSize="13" fill={N.muted}>135</text><text x="964" y={y(85) + 4} fontSize="13" fill={N.muted}>85</text>
              {rs.map((r, i) => <g key={i}><line x1={x(i)} x2={x(i)} y1={y(r.s)} y2={y(r.d)} stroke="rgba(14,27,44,.18)" strokeWidth="3" /><circle cx={x(i)} cy={y(r.s)} r="6" fill={r.s >= 135 ? "#C2410C" : "#3CC79E"} /><circle cx={x(i)} cy={y(r.d)} r="6" fill={r.d >= 85 ? "#C2410C" : "#2A84E4"} /></g>)}
            </svg>
            <form onSubmit={add} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13, color: N.muted }}>Systolic<input inputMode="numeric" value={s} onChange={(e) => setS(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="128" style={{ width: 96, height: 46, borderRadius: 12, border: `1px solid ${N.line}`, padding: "0 12px", fontSize: 16 }} /></label>
              <label style={{ display: "grid", gap: 4, fontSize: 13, color: N.muted }}>Diastolic<input inputMode="numeric" value={d} onChange={(e) => setD(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="82" style={{ width: 96, height: 46, borderRadius: 12, border: `1px solid ${N.line}`, padding: "0 12px", fontSize: 16 }} /></label>
              <button type="submit" style={{ ...btn("ink"), height: 46 }}>Add reading</button>
              <button type="button" onClick={() => setRs(START)} style={{ ...btn("ghost"), height: 46 }}>Reset</button>
            </form>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...cardN, padding: 20, display: "grid", gap: 6 }}><span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: N.muted }}>7-reading average</span><b style={{ fontWeight: 400, fontSize: 48, letterSpacing: "-.03em", color: status.c }}>{avgS}/{avgD}</b><span style={{ fontSize: 16, fontWeight: 600, color: status.c }}>{status.t}</span></div>
            <NeyuReads key={avgS + "/" + avgD + urgent} text={status.x} ask={`My last home blood pressure readings average ${avgS}/${avgD}. What does that mean and what can I do?`} />
            <button onClick={() => openAlba("How do I measure my blood pressure correctly at home?")} style={{ ...btn("ghost"), justifySelf: "start" }}>How to measure correctly</button>
          </div>
        </div>
      </Section>
      <Section label="Program" eyebrow="The program" title={<>Five steps to <span style={gradText}>on-target, and staying there.</span></>}>
        <StepRail steps={program} active={ps} onPick={setPs} />
      </Section>
      <Section id="enroll" tone="white" label="Enroll" eyebrow="Join the clinic" title="Enroll in the Virtual Hypertension Clinic.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "start" }}>
          <RequestForm service="hypertension-clinic" title="Enroll" options={{ label: "Where are you now?", values: ["Diagnosed with high blood pressure", "Readings have been high at home", "On medication, not on target", "Not sure — I want a check"] }} cta="Request enrollment" />
          <NeyuReads text="Bring the cuff you use and a list of your medicines to your first visit. If you don't have a validated cuff, the team will suggest one." ask="Which home blood pressure monitors are validated?" />
        </div>
      </Section>
      <CtaBand title="Included in Membership Plus." text="The Virtual Hypertension Clinic is part of NEYU Membership Plus and Executive." primary={{ label: "See membership", href: "/membership" }} secondary={{ label: "Ask Neyu", alba: "How does the Virtual Hypertension Clinic work?" }} />
    </>
  );
}

// ═════════════════════ PACKAGES & EXECUTIVE HEALTH ═════════════════════
export function Packages() {
  const [goal, setGoal] = useState<string | null>(null);
  const [age, setAge] = useState("40–54");
  const rec: Pkg = useMemo(() => {
    const m: Record<string, string> = { heart: "heart", complete: "executive", aging: "longevity", genes: "precision", energy: "metabolic" };
    return PACKAGES.find((p) => p.id === (m[goal || ""] || (age === "55+" ? "executive" : "heart")))!;
  }, [goal, age]);
  return (
    <>
      <PillarHero kicker="Private Health Packages" title={<>Packages built around<br /><span style={gradText}>a real question.</span></>} lead="From a focused heart check to a complete executive health assessment — imaging, advanced labs and a physician review, connected in one report and explained by Neyu." page="/packages"
        suggestions={["What's in Executive Health?", "Which package fits a family history of heart disease?", "What is a longevity baseline?"]}
        stats={[{ v: PACKAGES.length, l: "curated packages" }, { v: 40, s: "+", l: "lab tests to choose from" }, { v: 1, l: "connected report" }]}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="Packages around your question" nodes={[{ id: "q", label: "Your question", x: 500, y: 300, r: 62 }, ...PACKAGES.map((p, i) => { const a = -Math.PI / 2 + (i / PACKAGES.length) * Math.PI * 2; return { id: p.id, label: p.title.replace(" & Hormone", ""), x: Math.round(500 + Math.cos(a) * 360), y: Math.round(300 + Math.sin(a) * 220), icon: p.icon }; })]} edges={PACKAGES.map((p) => ["q", p.id] as [string, string])} center="q" active={rec.id} height="clamp(300px,34vw,420px)" /></div>} />
      <Section tone="white" label="Finder" eyebrow="Neyu package finder" title={<>Two questions. <span style={gradText}>The right package.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 20, alignItems: "start" }}>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 14 }}>
            <b style={{ fontWeight: 500, fontSize: 18 }}>What matters most right now?</b>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[["heart", "My heart"], ["complete", "A complete check"], ["aging", "Aging well"], ["genes", "My genes & medicines"], ["energy", "Energy, weight, hormones"]].map(([k, l]) => <button key={k} aria-pressed={goal === k} onClick={() => setGoal(k)} style={{ minHeight: 42, padding: "0 16px", borderRadius: 999, border: `1px solid ${goal === k ? N.blue : N.line}`, background: goal === k ? "rgba(42,132,228,.08)" : "#fff", color: goal === k ? N.deep : N.ink2, cursor: "pointer", fontSize: 14.5 }}>{l}</button>)}</div>
            <b style={{ fontWeight: 500, fontSize: 18 }}>Your age</b>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["Under 40", "40–54", "55+"].map((a) => <button key={a} aria-pressed={age === a} onClick={() => setAge(a)} style={{ minHeight: 42, padding: "0 16px", borderRadius: 999, border: `1px solid ${age === a ? N.blue : N.line}`, background: age === a ? "rgba(42,132,228,.08)" : "#fff", color: age === a ? N.deep : N.ink2, cursor: "pointer", fontSize: 14.5 }}>{a}</button>)}</div>
          </div>
          <div key={rec.id} style={{ display: "grid", gap: 12, animation: "fadeUp .3s ease" }}>
            <AiBadge label="Neyu suggests" />
            <a href={`#${rec.id}`} style={{ ...cardN, padding: 20, display: "flex", gap: 14, alignItems: "center", textDecoration: "none", color: N.ink }}><IconTile icon={rec.icon} /><span style={{ flex: 1 }}><b style={{ fontWeight: 500, fontSize: 20 }}>{rec.title}</b><span style={{ display: "block", fontSize: 14.5, color: N.muted }}>{rec.tag}</span></span><NIcon name="ph-arrow-down" size={18} tone={"currentColor"} /></a>
            <NeyuReads text={`${rec.for} ${rec.neyu}`} ask={`Is the ${rec.title} package right for me?`} />
          </div>
        </div>
      </Section>
      <Section label="Packages" eyebrow="All packages" title="What's inside each package.">
        <div style={{ display: "grid", gap: 18 }}>
          {PACKAGES.map((p) => (
            <article key={p.id} id={p.id} style={{ ...cardN, padding: "clamp(18px,3vw,30px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 22, scrollMarginTop: 90, border: p.id === "executive" ? `1.5px solid ${N.blue}` : cardN.border }}>
              <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}><IconTile icon={p.icon} />{p.id === "executive" && <AiBadge label="Executive Health" />}</div>
                <b style={{ fontWeight: 500, fontSize: 26, letterSpacing: "-.02em" }}>{p.title}</b>
                <span style={{ fontSize: 15, color: N.tealText, fontWeight: 600 }}>{p.tag}</span>
                <span style={{ fontSize: 15, color: N.ink2, lineHeight: 1.55 }}><b style={{ fontWeight: 600 }}>For:</b> {p.for}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: N.ink2 }}><AlbaOrb size={18} motion={false} />{p.neyu}</span>
              </div>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: N.muted }}>In clinic</span>
                {p.clinic.map((c) => <span key={c} style={{ display: "flex", gap: 8, fontSize: 15 }}><NIcon name="ph-check" size={18} tone={N.green} style={{ marginTop: 3 }} />{c}</span>)}
                <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: N.muted, marginTop: 8 }}>Advanced labs · BioAro</span>
                {p.labs.map((l) => <span key={l.slug} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 15 }}><span><NIcon name="ph-flask" size={18} tone={N.blue} /> {l.name}</span><span style={{ color: N.muted }}>{money(l.price)}</span></span>)}
                <span style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${N.line}`, paddingTop: 8, fontSize: 15 }}><b style={{ fontWeight: 600 }}>Lab component</b><b style={{ fontWeight: 600 }}>{money(pkgLabTotal(p))}</b></span>
                <span style={{ fontSize: 12.5, color: N.faint }}>Lab prices are BioAro list prices. Clinic services are quoted by the NEYU team.</span>
              </div>
              <div style={{ display: "grid", gap: 10, alignContent: "start" }}><LiveChart mode={p.chart} height={150} /><a href="#request" style={{ ...btn("grad"), justifySelf: "start" }}>Request this package<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a></div>
            </article>
          ))}
        </div>
      </Section>
      <Section id="request" tone="white" label="Request" eyebrow="Request a package" title="Get a quote and book.">
        <RequestForm service="package" title="Request a package" options={{ label: "Package", values: PACKAGES.map((p) => p.title) }} cta="Request a quote" />
      </Section>
      <CtaBand title="Every year, not once." text="NEYU Membership Executive includes an annual Executive Health assessment and a yearly Longevity Baseline re-test." primary={{ label: "See membership", href: "/membership" }} secondary={{ label: "Ask Neyu", alba: "Which health package is right for me?" }} />
    </>
  );
}

// ═════════════════════ MEMBERSHIP ═════════════════════
export function Membership() {
  const [tier, setTier] = useState("plus");
  const year = [
    { m: "Month 1", t: "Onboarding", d: "Record connected, wearables synced, first review with your physician.", icon: "ph-plug" },
    { m: "Every day", t: "Neyu", d: "Questions answered, results explained, trends watched.", icon: "ph-brain" },
    { m: "Quarterly", t: "Check-ins", d: "Virtual visits and blood-pressure reviews (Plus & Executive).", icon: "ph-video-camera" },
    { m: "Yearly", t: "Assessment", d: "Annual review, preventive labs or Executive Health — and a fresh plan.", icon: "ph-clipboard-text" },
  ];
  return (
    <>
      <PillarHero kicker="NEYU Membership" title={<>Connected care,<br /><span style={gradText}>all year.</span></>} lead="Subscription care built on your NEYU record: Neyu every day, virtual visits, the hypertension clinic, at-home collection and annual assessments — one plan, connected." page="/membership"
        suggestions={["What's included in Plus?", "Is Executive worth it for me?", "Can my family join?"]}
        stats={[{ v: MEMBERSHIP.length, l: "membership tiers" }, { v: MEMBERSHIP_COMPARE.length, l: "connected benefits" }, { v: 365, l: "days of Neyu" }]}
        visual={<div style={{ ...cardN, padding: 14 }}><LiveChart mode="trend" height="clamp(260px,30vw,360px)" label="Health trend across a membership year — illustrative" /></div>} />
      <Section tone="white" label="Tiers" eyebrow="Choose your plan" title={<>Three ways to <span style={gradText}>stay connected.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          {MEMBERSHIP.map((m) => (
            <button key={m.id} onClick={() => setTier(m.id)} aria-pressed={tier === m.id} style={{ ...cardN, textAlign: "left", padding: 24, display: "grid", gap: 12, alignContent: "start", cursor: "pointer", border: tier === m.id ? `2px solid ${N.blue}` : cardN.border, background: m.highlight ? "linear-gradient(160deg,#FFFFFF,#EEF7FC)" : "#fff", position: "relative" }}>
              {m.highlight && <span style={{ position: "absolute", top: 16, right: 16 }}><AiBadge label="Most popular" /></span>}
              <IconTile icon={m.icon} />
              <b style={{ fontWeight: 500, fontSize: 28, letterSpacing: "-.02em" }}>{m.title}</b>
              <span style={{ fontSize: 15, color: N.tealText, fontWeight: 600 }}>{m.tag}</span>
              <span style={{ fontSize: 14, color: N.muted }}>Pricing shared on request · founding members</span>
              {m.features.map((f) => <span key={f} style={{ display: "flex", gap: 8, fontSize: 15 }}><NIcon name="ph-check" size={18} tone={N.green} style={{ marginTop: 3 }} />{f}</span>)}
            </button>
          ))}
        </div>
        <div style={{ ...cardN, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 15 }}>
            <thead><tr><th style={{ textAlign: "left", padding: 16, fontWeight: 500, color: N.muted }}>Benefit</th>{MEMBERSHIP.map((m) => <th key={m.id} style={{ padding: 16, fontWeight: 600, color: tier === m.id ? N.deep : N.ink, background: tier === m.id ? "rgba(42,132,228,.06)" : "transparent" }}>{m.title}</th>)}</tr></thead>
            <tbody>{MEMBERSHIP_COMPARE.map((f) => <tr key={f} style={{ borderTop: `1px solid ${N.line2}` }}><td style={{ padding: "12px 16px" }}>{f}</td>{MEMBERSHIP.map((m) => <td key={m.id} style={{ textAlign: "center", padding: 12, background: tier === m.id ? "rgba(42,132,228,.06)" : "transparent" }}>{memberHas(m.id, f) ? <NIcon name="ph-check-circle" size={20} tone={N.green} aria-label="Included" /> : <span style={{ color: N.faint }} aria-label="Not included">—</span>}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Section>
      <Section label="Year" eyebrow="A year with NEYU" title="What membership looks like.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 14 }}>
          {year.map((y) => <div key={y.t} style={{ ...cardN, padding: 20, display: "grid", gap: 8 }}><span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{y.m}</span><IconTile icon={y.icon} size={40} /><b style={{ fontWeight: 500, fontSize: 19 }}>{y.t}</b><span style={{ fontSize: 14.5, color: N.ink2 }}>{y.d}</span></div>)}
        </div>
        <NeyuReads text={`With ${MEMBERSHIP.find((m) => m.id === tier)!.title}, Neyu keeps your whole year connected: every reading, visit and result in one record, with a fresh plan after each assessment.`} ask={`What would NEYU Membership ${MEMBERSHIP.find((m) => m.id === tier)!.title} include for me?`} />
      </Section>
      <Section id="join" tone="white" label="Join" eyebrow="Join NEYU" title="Request membership details.">
        <RequestForm service="membership" title="Request membership" options={{ label: "Tier", values: MEMBERSHIP.map((m) => m.title) }} cta="Request details" note="No payment is taken online. The team shares pricing and confirms everything with you first." />
      </Section>
    </>
  );
}

// ═════════════════════ AT-HOME COLLECTION ═════════════════════
export function AtHome() {
  const [postal, setPostal] = useState("");
  const fsa = postal.trim().toUpperCase().replace(/\s/g, "").slice(0, 3);
  const area = !fsa ? null : /^T[123]/.test(fsa) ? { ok: true, t: "Calgary area — at-home collection is available." } : /^T[0-9]/.test(fsa) ? { ok: true, t: "Alberta — the team will confirm availability for your area." } : { ok: false, t: "At-home collection is Calgary-only for now. Outside Alberta, request a visit anyway: the team can send a lab requisition you can use at a collection site near you, and results still come into your NEYU record." };
  const tests = AT_HOME_TESTS.map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean);
  const cats = ["home", ...Array.from(new Set(LAB_TESTS.map((t) => t.cat)))];
  const [cat, setCat] = useState("home");
  const shown = (cat === "home" ? tests : LAB_TESTS.filter((t) => t.cat === cat)) as typeof LAB_TESTS;
  const catIcon = (c: string) => /genom|dna/i.test(c) ? "dna" : /aging/i.test(c) ? "hourglass" : /hormone/i.test(c) ? "hormone" : /nutri/i.test(c) ? "food" : /vascul|heart|cardio/i.test(c) ? "vessel" : /brain/i.test(c) ? "brain" : /gut/i.test(c) ? "microbiome" : /skin/i.test(c) ? "skin" : "flask";
  const steps = [
    { t: "Choose tests", d: "Pick tests yourself, follow a package, or ask Neyu.", icon: "ph-list-checks", more: ["Single tests or a full package", "Prices shown up front (BioAro Labs list prices)", "Not sure? Describe your goal and get a short list"], neyu: "Tell me your goal — heart health, energy, aging — and I'll suggest the tests that fit, with what each one shows." },
    { t: "Book a time", d: "Home or office, at a time that suits you.", icon: "ph-calendar-check", more: ["Send a request — nothing is charged online", "The NEYU team confirms the time and price with you", "Morning slots for fasting tests"], neyu: "I'll tell you which tests need fasting or a morning sample, so the visit is right the first time." },
    { t: "Collection", d: "A trained collector visits; it takes minutes.", icon: "ph-house-line", more: ["A trained collector comes to you", "It only takes a few minutes", "Samples go to the lab the same day"], neyu: "Before the visit I send a short checklist: water, sleeves, ID and any medicines to mention." },
    { t: "Results in your record", d: "Results arrive in My Health Space; Neyu explains them.", icon: "ph-folder-simple-user", more: ["Results land in My Health Space", "Shown next to your past results and trends", "A NEYU physician reviews anything that needs follow-up"], neyu: "I explain each value in plain language and show what changed since last time — then what to ask your doctor." },
  ];
  const [st, setSt] = useState(2);
  return (
    <>
      <PillarHero kicker="At-home Blood Collection" title={<>Testing,<br /><span style={gradText}>without the trip.</span></>} lead="A trained collector comes to your home or office. Results flow straight into your NEYU record, and Neyu explains every value." page="/at-home"
        suggestions={["Do I need to fast for blood tests?", "Which tests can be done at home?", "How long do results take?"]}
        stats={[{ v: tests.length, l: "popular tests at home" }, { v: 4, l: "simple steps" }, { v: 1, l: "connected record" }]}
        visual={<div style={{ ...cardN, padding: 14 }}><LiveChart mode="bars" height="clamp(260px,30vw,360px)" label="Biomarker panel — illustrative" /></div>} />
      <Section tone="white" label="Steps" eyebrow="How it works" title={<>Four steps, <span style={gradText}>at your door.</span></>}>
        <StepRail steps={steps} active={st} onPick={setSt} />
      </Section>
      <Section label="Coverage" eyebrow="Coverage" title="Check your area.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 20, alignItems: "start" }}>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 15 }}>Your postal code<input value={postal} onChange={(e) => setPostal(e.target.value.slice(0, 7))} placeholder="T2E 7K6" autoComplete="postal-code" style={{ height: 50, borderRadius: 14, border: `1px solid ${N.line}`, padding: "0 14px", fontSize: 17, textTransform: "uppercase" }} /></label>
            {area && <p role="status" style={{ margin: 0, fontSize: 15.5, color: area.ok ? "#1F7A55" : "#9A4A1C", display: "flex", gap: 8 }}><NIcon name={area.ok ? "check" : "info"} size={18} tone="currentColor" style={{ marginTop: 2 }} />{area.t}</p>}
          </div>
          <NeyuReads text="Some tests need fasting or a morning sample. When you book, the team confirms the exact preparation for the tests you chose." ask="How should I prepare for an at-home blood test?" />
        </div>
      </Section>
      <Section tone="white" label="Tests" eyebrow="BioAro Labs · 3D showcase" title={<>Advanced testing, <span style={gradText}>at home.</span></>} lead="Spin the showcase, hover to pause, tap a test to see what it measures. The team confirms which tests can be collected at home when you book.">
        <div style={{ display: "grid", gap: 14 }}>
          <PillNav label="Test categories" size="sm" tabs={cats.map((c) => ({ k: c, label: c === "home" ? "Popular at home" : c }))} value={cat} onChange={(k) => setCat(k)} />
          <Cylinder3D label="BioAro Labs tests" items={shown} height={400}
            render={(t, front) => <div style={{ ...cardN, width: "100%", height: "100%", boxSizing: "border-box", padding: 18, display: "flex", flexDirection: "column", gap: 8, background: front ? "linear-gradient(160deg,#FFFFFF,#EEF7FC)" : "#FFFFFF", borderColor: front ? "rgba(42,132,228,.45)" : N.line }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><IconTile icon={catIcon(t.cat)} size={40} active={front} /><span style={{ fontSize: 17, fontWeight: 500 }}>{money(t.price)}</span></span>
              <span style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{t.cat}</span>
              <b style={{ fontWeight: 500, fontSize: 16.5, lineHeight: 1.25 }}>{t.name}</b>
              <span style={{ fontSize: 13.5, color: N.ink2, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{t.why}</span>
              <span style={{ marginTop: "auto", fontSize: 13, color: N.blue }}>Tap for details →</span>
            </div>}
            detail={(t) => <div style={{ ...cardN, padding: "clamp(16px,2.4vw,24px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{t.cat}</span>
                <b style={{ fontWeight: 500, fontSize: 22 }}>{t.name}</b>
                <span style={{ fontSize: 15, color: N.ink2, lineHeight: 1.55 }}>{t.why}</span>
                <span style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14, color: N.ink }}>{t.facts.map(([k, v]) => <span key={k}><span style={{ color: N.muted }}>{k}: </span>{v}</span>)}</span>
                <span style={{ fontSize: 20, fontWeight: 500 }}>{money(t.price)} <span style={{ fontSize: 13, color: N.muted, fontWeight: 400 }}>BioAro Labs list price</span></span>
              </div>
              <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <NeyuReads text={`${t.name}: ${t.bestFor || t.why}`} ask={`What does the ${t.name} measure, and how do I prepare for it?`} />
                <a href="#book" style={{ ...btn("grad"), justifySelf: "start" }}>Request this test<NIcon name="arrow" size={16} tone="light" /></a>
              </div>
            </div>} />
        </div>
      </Section>
      <Section id="book" label="Book" eyebrow="Book a collection" title="Request an at-home visit.">
        <RequestForm service="at-home" title="Request at-home collection" options={{ label: "Tests", values: ["Not sure — help me choose", "A package", ...tests.map((t) => t!.name)] }} cta="Request a visit" />
      </Section>
    </>
  );
}

// ═════════════════════ EXPLORE ALL SERVICES ═════════════════════
type Item = { t: string; d: string; href: string; pillar: string; kind: string; icon: string };
export function Explore() {
  const items: Item[] = useMemo(() => [
    ...SPECS.map((s) => ({ t: s.name, d: s.addresses, href: s.href, pillar: "Care", kind: "Specialty", icon: "ph-stethoscope" })),
    ...SERVICES.map((s) => ({ t: s.title, d: s.text, href: s.href, pillar: PILLARS.find((p) => p.k === s.pillar)!.title, kind: "Service", icon: s.icon })),
    { t: "Referral Centre", d: "Scan, upload or enter a referral in minutes.", href: "/referral-centre", pillar: "Care", kind: "Tool", icon: "ph-paper-plane-tilt" },
    { t: "Find a physician", d: "Match by need, language and location.", href: "/physicians", pillar: "Care", kind: "Tool", icon: "ph-identification-badge" },
    ...DIAGS.map((d) => ({ t: d.name, d: d.desc, href: d.href, pillar: "Diagnostics", kind: "Diagnostics", icon: "ph-pulse" })),
    { t: "Advanced lab tests", d: `${LAB_TESTS.length} BioAro Labs tests with real prices.`, href: "/genomics", pillar: "Diagnostics", kind: "Lab", icon: "ph-flask" },
    { t: "Genomics", d: "Whole-genome sequencing, pharmacogenomics and disease-based DNA.", href: "/genomics", pillar: "Diagnostics", kind: "Precision", icon: "ph-dna" },
    { t: "Lab Result Explainer", d: "Type, photograph or upload results — explained by Neyu.", href: "/lab-results", pillar: "Diagnostics", kind: "Neyu tool", icon: "ph-flask" },
    { t: "Health risk assessment", d: "Scored against Canadian guidelines, explained by Neyu.", href: "/prevention#risk", pillar: "Prevention", kind: "Neyu tool", icon: "ph-clipboard-text" },
    { t: "Symptom Checker", d: "Describe what you feel — emergency signs flagged first.", href: "/cardiac-symptoms", pillar: "Prevention", kind: "Neyu tool", icon: "ph-heartbeat" },
    ...PACKAGES.map((p) => ({ t: p.title, d: p.for, href: `/packages#${p.id}`, pillar: "Prevention", kind: "Package", icon: p.icon })),
    { t: "Longevity Lab", d: "Five research explainers with 3D models and live charts.", href: "/longevity-lab", pillar: "Longevity", kind: "Research", icon: "ph-atom" },
    { t: "Nutrition Starter Plan", d: "Four questions, one practical plan.", href: "/longevity", pillar: "Longevity", kind: "Neyu tool", icon: "ph-bowl-food" },
    { t: "Longevity score", d: "A direction, not a verdict.", href: "/longevity#score", pillar: "Longevity", kind: "Feature", icon: "ph-gauge" },
    { t: "Meet Neyu", d: "Your intelligent health companion.", href: "/neyu", pillar: "Neyu", kind: "AI", icon: "ph-brain" },
    { t: "Explain My Diagnosis", d: "What a diagnosis or report means, and what to ask.", href: "/explain-diagnosis", pillar: "Neyu", kind: "Neyu tool", icon: "ph-file-text" },
    { t: "My Health Space", d: "Your connected record, trends, results and wearables.", href: "/my-health", pillar: "Neyu", kind: "Record", icon: "ph-folder-simple-user" },
    { t: "Patient Resources", d: "Test preparation, forms and new-patient information.", href: "/resources", pillar: "Care", kind: "Info", icon: "ph-books" },
    { t: "Clinical services & trials", d: "Service details, the CHARM clinic and clinical trials.", href: "/services", pillar: "Care", kind: "Info", icon: "ph-hand-heart" },
  ], []);
  const [q, setQ] = useState(""), [p, setP] = useState("All");
  const shown = items.filter((i) => (p === "All" || i.pillar === p) && (!q || (i.t + " " + i.d + " " + i.kind).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden", padding: "clamp(48px,7vw,96px) 0 24px" }}>
        <FlowLines />
        <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16 }}>
          <AiBadge label="Explore NEYU" />
          <h1 style={{ margin: 0, fontSize: "clamp(42px,6vw,80px)", lineHeight: 1, letterSpacing: "-.045em", fontWeight: 500 }}>Every service, <span style={gradText}>connected.</span></h1>
          <p style={{ margin: 0, fontSize: 18, color: N.ink2, maxWidth: 640 }}>{items.length} services, tools and programs across Care, Diagnostics, Prevention and Longevity — with Neyu across all of them.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search services" placeholder="Search — e.g. blood pressure, genome, virtual" style={{ flex: "1 1 280px", height: 52, borderRadius: 999, border: `1px solid ${N.line}`, padding: "0 20px", fontSize: 16, background: "#fff" }} />
            {["All", "Care", "Diagnostics", "Prevention", "Longevity", "Neyu"].map((x) => <button key={x} aria-pressed={p === x} onClick={() => setP(x)} style={{ height: 44, padding: "0 16px", borderRadius: 999, border: `1px solid ${p === x ? N.ink : N.line}`, background: p === x ? N.ink : "#fff", color: p === x ? "#fff" : N.ink2, cursor: "pointer", fontSize: 14.5 }}>{x}</button>)}
          </div>
        </div>
      </section>
      <section style={{ ...wrapN, paddingBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: 12 }}>
          {shown.map((i) => <a key={i.t + i.href} href={i.href} className="sx-card" style={{ ...cardN, padding: 18, display: "grid", gap: 8, textDecoration: "none", color: N.ink }}><span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><IconTile icon={i.icon} size={38} /><span style={{ fontSize: 12, color: N.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>{i.pillar} · {i.kind}</span></span><b style={{ fontWeight: 500, fontSize: 17 }}>{i.t}</b><span style={{ fontSize: 14, color: N.ink2, lineHeight: 1.5 }}>{i.d}</span></a>)}
        </div>
        {shown.length === 0 && <div style={{ display: "grid", gap: 12, justifyItems: "start", marginTop: 12 }}><p style={{ margin: 0, color: N.muted }}>Nothing matches “{q}”.</p><AskNeyu page="/explore" placeholder={`Ask Neyu about “${q}”`} /></div>}
      </section>
      <CtaBand title="Can't find it? Ask Neyu." text="Describe what you need in your own words — Neyu finds the right service." primary={{ label: "Start a referral", href: "/referral-centre" }} secondary={{ label: "Ask Neyu", alba: "" }} />
    </>
  );
}
