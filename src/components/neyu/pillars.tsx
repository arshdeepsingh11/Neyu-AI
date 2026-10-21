"use client";

// The four Neyu pillar hubs: Care · Diagnostics · Prevention · Longevity.
// Each one: minimal hero + live network + Ask Neyu, an AI tool, live charts,
// and every service that sits underneath it.
import React, { useMemo, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import Assessment from "@/components/lab/assess";
import { BpTool, BmiTool, A1cTool } from "@/components/specialty/tools";
import { SPECS, DIAGS, routeFor, routeForHref, isEmergency, type ConciergeRoute } from "@/data/homeContent";
import { physicians } from "@/data/physicians";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { LAB_STATS } from "@/data/longevityScience";
import { PACKAGES, pkgLabTotal, SERVICES } from "@/data/neyu";
import NutritionPlan from "./NutritionPlan";
import { N, Section, PillarHero, NodeNet, LiveChart, NeyuReads, CapCard, CtaBand, StepRail, AiBadge, btn, cardN, gradText, IconTile, useNeyuStream, type NetNode } from "./kit";
import { NIcon } from "./icons";
import { ALL_LANGS } from "./people";

const ring = (labels: { id: string; label: string; icon: string; sub?: string }[], cx = 500, cy = 300, rx = 380, ry = 230): NetNode[] =>
  labels.map((l, i) => { const a = -Math.PI / 2 + (i / labels.length) * Math.PI * 2; return { ...l, x: Math.round(cx + Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry) }; });
const hub = (center: NetNode, around: NetNode[]): [NetNode[], [string, string][]] => [[center, ...around], around.map((n) => [center.id, n.id] as [string, string]).concat(around.map((n, i) => [n.id, around[(i + 1) % around.length].id] as [string, string]))];

// ── AI care navigator (concierge + streamed Neyu explanation) ──
function CareNavigator() {
  const { triggerEmergency } = useAlba();
  const s = useNeyuStream("/care");
  const [v, setV] = useState("");
  const [route, setRoute] = useState<ConciergeRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (text: string) => {
    const t = text.trim(); if (!t) return;
    if (isEmergency(t)) { triggerEmergency(); return; }
    setBusy(true); setRoute(null);
    try {
      const r = await fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t }) });
      const j = await r.json(); if (j.emergency) { triggerEmergency(); return; }
      setRoute(routeForHref(j.destination?.href, t));
    } catch { setRoute(routeFor(t)); } finally { setBusy(false); }
    s.ask(`In 3 short sentences, explain what kind of care fits this and what happens next: ${t}`);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "start" }}>
      <form onSubmit={(e) => { e.preventDefault(); go(v); }} style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 12 }}>
        <AiBadge label="Neyu care navigator" />
        <b style={{ fontWeight: 500, fontSize: 21 }}>Describe what’s going on</b>
        <textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} placeholder="e.g. My home blood pressure has been around 150/95 and I get headaches in the morning." style={{ width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 16, border: `1px solid ${N.line}`, fontSize: 16, resize: "vertical", fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["Short of breath when climbing stairs", "I want a full health check", "My thyroid results are off", "Can I see someone virtually?"].map((x) => <button type="button" key={x} onClick={() => { setV(x); go(x); }} style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: `1px solid ${N.line}`, background: "#fff", fontSize: 13.5, color: N.ink2, cursor: "pointer" }}>{x}</button>)}</div>
        <button type="submit" style={{ ...btn("grad"), justifySelf: "start" }}>{busy ? "Finding your pathway…" : "Find my care pathway"}<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></button>
      </form>
      <div style={{ display: "grid", gap: 12 }} aria-live="polite">
        {!route && !busy && <NeyuReads text="Tell Neyu what's going on in your own words. It suggests where to start — a specialist, a test, a virtual visit or a program — and explains why." />}
        {busy && <div style={{ ...cardN, padding: 18, display: "flex", gap: 10, alignItems: "center", color: N.muted }}><AlbaOrb size={24} />Neyu is mapping your pathway…</div>}
        {route && (
          <div style={{ ...cardN, padding: 20, display: "grid", gap: 12, animation: "fadeUp .3s ease" }}>
            <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{route.concern}</div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{s.answer || route.summary}</p>
            {route.safety && <p style={{ margin: 0, fontSize: 14, color: "#8B2F1C" }}>{route.safety}</p>}
            <div style={{ display: "grid", gap: 8 }}>{route.steps.map((st, i) => <a key={st.label} href={st.href || "#"} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 14, border: `1px solid ${N.line}`, textDecoration: "none", color: N.ink }}><span style={{ width: 28, height: 28, borderRadius: 9, background: N.grad, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 }}>{i + 1}</span><span style={{ flex: 1 }}><b style={{ fontWeight: 500 }}>{st.label}</b>{st.desc && <span style={{ display: "block", fontSize: 13.5, color: N.muted }}>{st.desc}</span>}</span><NIcon name="ph-arrow-right" size={18} tone={N.deep} /></a>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════ CARE ═════════════════════
export function CareHub() {
  const [pick, setPick] = useState<string | null>("s0");
  const specNodes = ring(SPECS.map((s, i) => ({ id: "s" + i, label: s.name.replace(" Medicine", "").replace(" Clinic", ""), icon: ["ph-heart", "ph-heartbeat", "ph-stethoscope", "ph-flask", "ph-person-simple-walk", "ph-baby", "ph-wind", "ph-bowl-food", "ph-hand"][i] || "ph-stethoscope" })));
  const [nodes, edges] = hub({ id: "you", label: "You", x: 500, y: 300, r: 56 }, specNodes);
  const cur = pick && pick.startsWith("s") ? SPECS[+pick.slice(1)] : null;
  const langs = useMemo(() => { const m = new Map<string, number>(); physicians.forEach((p) => p.languages.forEach((l) => m.set(l, (m.get(l) || 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); }, []);
  return (
    <>
      <PillarHero kicker="Care" title={<>Connected care,<br /><span style={gradText}>around you.</span></>} lead="From everyday health to complex medical needs, NEYU brings the right care, expertise and information together around you — in clinic, virtually, or at home." page="/care"
        suggestions={["Which specialist should I see for palpitations?", "Can I see a doctor virtually?", "How do referrals work?"]}
        stats={[{ v: SPECS.length, l: "specialties, one record" }, { v: physicians.length, l: "physicians" }, { v: 2, l: "Calgary clinics" }]}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="NEYU specialties connected around you" nodes={nodes} edges={edges} center="you" active={pick} onPick={setPick} height="clamp(300px,36vw,440px)" />
          {cur && <div key={pick} style={{ padding: "4px 12px 12px", display: "grid", gap: 6, animation: "fadeUp .3s ease" }}><b style={{ fontWeight: 500, fontSize: 18 }}>{cur.name}</b><span style={{ fontSize: 14.5, color: N.ink2 }}>{cur.addresses}</span><a href={cur.href} style={{ fontSize: 14, fontWeight: 600, color: N.deep }}>Open {cur.name} →</a></div>}</div>} />
      <Section label="Care navigator" tone="white" eyebrow="Neyu · AI" title={<>Not sure where to start? <span style={gradText}>Ask Neyu.</span></>} lead="Neyu turns what you describe into a clear pathway — the right specialty, test, virtual visit or program — and explains the next step.">
        <CareNavigator />
      </Section>
      <Section label="Ways to receive care" eyebrow="Ways to receive care" title="In clinic. Virtually. At home." lead="Every option is connected to the same NEYU record, so nothing gets lost between visits.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          <CapCard icon="ph-buildings" title="In-clinic specialists" text="Nine specialties across two Calgary clinics, with onsite diagnostics including Alberta's first onsite exercise stress echo." href="/specialties" meta="2 clinics" chart={{ mode: "ecg" }} />
          {SERVICES.filter((s) => s.pillar === "care").map((s) => <CapCard key={s.k} icon={s.icon} title={s.title} text={s.text} href={s.href} meta="New" chart={{ mode: s.k === "hypertension-clinic" ? "bp" : "hr" }} />)}
          <CapCard icon="ph-paper-plane-tilt" title="Referral Centre" text="Scan or upload a referral and the fields fill themselves. Track it from intake to booking." href="/referral-centre" meta="AI scan" />
          <CapCard icon="ph-identification-badge" title="Find a physician" text={`Match by need, language and location — ${physicians.length} physicians, ${ALL_LANGS.length} languages between them.`} href="/physicians" meta="Matcher" />
        </div>
      </Section>
      <Section tone="white" label="Specialists" eyebrow="Doctors & specialists" title={<>Nine specialties. <span style={gradText}>One connected record.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
          {SPECS.map((s, i) => <CapCard key={s.name} icon={["ph-heart", "ph-heartbeat", "ph-stethoscope", "ph-flask", "ph-person-simple-walk", "ph-baby", "ph-wind", "ph-bowl-food", "ph-hand"][i] || "ph-stethoscope"} title={s.name} text={s.addresses} href={s.href} meta={s.tests[0]} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "center" }}>
          <div style={{ ...cardN, padding: 22, display: "grid", gap: 10 }}>
            <b style={{ fontWeight: 500, fontSize: 19 }}>Languages spoken by our physicians</b>
            {langs.map(([l, n]) => <div key={l} style={{ display: "grid", gridTemplateColumns: "110px 1fr 24px", gap: 10, alignItems: "center", fontSize: 14 }}><span>{l}</span><span style={{ height: 10, borderRadius: 5, background: N.line2 }}><span style={{ display: "block", height: "100%", width: `${(n / physicians.length) * 100}%`, borderRadius: 5, background: N.grad }} /></span><span style={{ textAlign: "right", color: N.muted }}>{n}</span></div>)}
          </div>
          <NeyuReads text="Neyu can match you to a physician who speaks your language, at the clinic closest to you, in the specialty that fits." ask="Which NEYU physician speaks my language and fits my needs?" />
        </div>
      </Section>
      <CtaBand title="Care that knows your whole story." text="Every visit, test and message lives in one record — so every clinician sees the full picture." primary={{ label: "Start a referral", href: "/referral-centre" }} secondary={{ label: "Ask Neyu", alba: "" }} />
    </>
  );
}

// ═════════════════════ DIAGNOSTICS ═════════════════════
const DIAG_ICON = ["ph-heart", "ph-person-simple-run", "ph-git-branch", "ph-wave-sine", "ph-wind"];
const DIAG_CHART = ["echo", "hr", "flow", "ecg", "resp"];
export function DiagnosticsHub() {
  const [pick, setPick] = useState<string | null>("imaging");
  const caps: NetNode[] = [
    { id: "lab", label: "Lab testing", sub: "Biomarkers", x: 180, y: 160, icon: "ph-flask" },
    { id: "imaging", label: "Imaging", sub: "Structure & function", x: 820, y: 160, icon: "ph-heart" },
    { id: "monitor", label: "Monitoring", sub: "Days, not minutes", x: 820, y: 460, icon: "ph-wave-sine" },
    { id: "genomics", label: "Genomics", sub: "What makes you unique", x: 180, y: 460, icon: "ph-dna" },
  ];
  const [nodes, edges] = hub({ id: "pic", label: "Your picture", x: 500, y: 310, r: 62 }, caps);
  const capText: Record<string, string> = { lab: "Over 40 advanced tests — inflammation, hormones, nutrients, brain and vascular markers — through BioAro Labs, in clinic or at home.", imaging: "Echocardiography and exercise stress echo show the heart's structure and how it responds to effort.", monitor: "Holter and 24-hour ambulatory blood pressure catch rhythms and pressures a single visit misses.", genomics: "Whole-genome sequencing and pharmacogenomics: your DNA, read once and used for life." };
  const featured = ["core-inflammation-aging", "gdf-15", "hormone-health", "essential-vitamin-health", "brain-health", "the-biogut-test"].map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean);
  return (
    <>
      <PillarHero kicker="Diagnostics" title={<>Diagnostics that<br /><span style={gradText}>connect the dots.</span></>} lead="From laboratory testing and imaging to continuous monitoring, NEYU brings your health information together to create a clearer picture of your health." page="/diagnostics"
        suggestions={["What does a stress echo show?", "Which blood test checks inflammation?", "Holter vs ambulatory BP?"]}
        stats={[{ v: DIAGS.length, l: "onsite diagnostic services" }, { v: 40, s: "+", l: "advanced lab tests" }, { v: 1, s: "st", l: "onsite exercise stress echo in Alberta" }]}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="Diagnostic capabilities connecting into one picture" nodes={nodes} edges={edges.concat([["lab", "genomics"], ["imaging", "monitor"]])} center="pic" active={pick} onPick={setPick} height="clamp(300px,34vw,420px)" />
          {pick && capText[pick] && <p key={pick} style={{ margin: 0, padding: "0 14px 14px", fontSize: 15, color: N.ink2, animation: "fadeUp .3s ease" }}>{capText[pick]}</p>}</div>} />
      <Section tone="white" label="Capabilities" eyebrow="Three capabilities" title={<>See it. Measure it. <span style={gradText}>Understand it.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>
          <CapCard icon="ph-flask" title="Lab Testing" text="Biomarkers and advanced testing — inflammation, hormones, nutrients, brain and vascular health." href="/genomics" meta="BioAro Labs" chart={{ mode: "bars" }} />
          <CapCard icon="ph-heartbeat" title="Imaging & Monitoring" text="See what is happening: echo, stress echo, vascular ultrasound, Holter and ambulatory blood pressure." href="#imaging" meta="Onsite" chart={{ mode: "echo" }} />
          <CapCard icon="ph-dna" title="Genomics & Precision Health" text="Understand what makes you unique — genome sequencing, pharmacogenomics and longevity science." href="/longevity-lab" meta="Precision" chart={{ mode: "dna" }} />
        </div>
      </Section>
      <Section id="imaging" label="Imaging" eyebrow="Imaging & monitoring" title="Five ways to see what's happening.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 14 }}>
          {DIAGS.map((d, i) => <CapCard key={d.name} icon={DIAG_ICON[i]} title={d.name} text={d.desc} href={d.href} meta={d.signal} chart={{ mode: DIAG_CHART[i] }} />)}
        </div>
      </Section>
      <Section tone="white" label="Lab tests" eyebrow="Advanced lab testing" title={<>Biomarkers that add <span style={gradText}>what a standard panel misses.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,250px),1fr))", gap: 12 }}>
          {featured.map((t) => <a key={t!.id} href="/genomics" className="sx-card" style={{ ...cardN, padding: 18, display: "grid", gap: 6, textDecoration: "none", color: N.ink }}><span style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{t!.cat}</span><b style={{ fontWeight: 500, fontSize: 17 }}>{t!.name}</b><span style={{ fontSize: 14, color: N.ink2 }}>{t!.why}</span><span style={{ fontSize: 16, marginTop: 4 }}>{money(t!.price)}</span></a>)}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/genomics" style={btn("ink")}>See all tests</a><a href="/at-home" style={btn("ghost")}><NIcon name="ph-house-line" size={18} tone={"currentColor"} />At-home collection</a></div>
      </Section>
      <Section label="Find my test" eyebrow="Neyu · AI" title={<>Which test fits <span style={gradText}>your question?</span></>} lead="Answer a few questions — age, family history, medicines, goals. Neyu ranks the tests that fit, with real prices.">
        <Assessment kind="genomics" accent={N.blue} />
      </Section>
      <Section tone="white" label="Results" eyebrow="Results that connect" title="A result only means something in context.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "center" }}>
          <div style={{ ...cardN, padding: 14 }}><LiveChart mode="ldl" param={39} height={260} label="LDL in context — illustrative" /></div>
          <div style={{ display: "grid", gap: 12 }}>
            <NeyuReads text="An LDL of 3.9 means something different with diabetes, a family history of early heart disease, or a high Lp(a). Neyu reads your results together, then explains them in plain language." ask="How do my lab results relate to each other?" />
            <a href="/lab-results" style={{ ...btn("grad"), justifySelf: "start" }}>Explain my results<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a>
          </div>
        </div>
      </Section>
      <CtaBand title="Testing without the trip." text="A trained collector comes to your home or office. Results flow straight into your NEYU record, and Neyu explains them." primary={{ label: "Book at-home collection", href: "/at-home" }} secondary={{ label: "Ask Neyu", alba: "Which diagnostic test fits me?" }} />
    </>
  );
}

// ═════════════════════ PREVENTION ═════════════════════
export function PreventionHub() {
  const { openAlba } = useAlba();
  const [pick, setPick] = useState<string | null>("bp");
  const risk = ring([{ id: "bp", label: "Blood pressure", icon: "ph-gauge" }, { id: "chol", label: "Cholesterol", icon: "ph-drop" }, { id: "glu", label: "Blood sugar", icon: "ph-cube" }, { id: "weight", label: "Weight", icon: "ph-scales" }, { id: "smoke", label: "Smoking", icon: "ph-cigarette-slash" }, { id: "family", label: "Family history", icon: "ph-users-three" }, { id: "sleep", label: "Sleep", icon: "ph-moon" }, { id: "move", label: "Activity", icon: "ph-person-simple-run" }]);
  const [nodes, edges] = hub({ id: "risk", label: "Your risk", x: 500, y: 300, r: 56 }, risk);
  const riskText: Record<string, string> = { bp: "Home readings at or above 135/85 are above target (Hypertension Canada).", chol: "LDL targets depend on your overall risk — sometimes lower than 3.5.", glu: "An HbA1c of 6.0–6.4 % is the prediabetes range (Diabetes Canada).", weight: "Waist size often says more about metabolic risk than weight alone.", smoke: "Stopping smoking is one of the strongest single changes for heart health.", family: "Early heart disease in a parent or sibling changes your targets.", sleep: "7–9 hours is the adult guideline; short sleep raises blood pressure.", move: "150 minutes a week of moderate activity is the Canadian guideline." };
  return (
    <>
      <PillarHero kicker="Prevention" title={<>Find risk early.<br /><span style={gradText}>Act earlier.</span></>} lead="Risk assessment, private health packages and executive health — personalized by your biology, guided by Canadian guidelines, and explained by Neyu." page="/prevention"
        suggestions={["Is 135/85 high at home?", "What's in an executive health assessment?", "What raises my heart risk most?"]}
        stats={[{ v: 8, l: "risk factors read together" }, { v: PACKAGES.length, l: "private health packages" }, { v: 3, l: "minute AI risk check" }]}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="Risk factors connected to your overall risk" nodes={nodes} edges={edges} center="risk" active={pick} onPick={setPick} height="clamp(300px,36vw,440px)" />
          {pick && riskText[pick] && <p key={pick} style={{ margin: 0, padding: "0 14px 14px", fontSize: 15, color: N.ink2, animation: "fadeUp .3s ease" }}>{riskText[pick]}</p>}</div>} />
      <Section id="risk" tone="white" label="Risk assessment" eyebrow="Neyu · AI risk assessment" title={<>Your healthy-aging check, <span style={gradText}>scored and explained.</span></>} lead="About three minutes. Scored against Canadian guidelines, then explained by Neyu with the tests that fit you.">
        <Assessment kind="longevity" accent={N.green} />
      </Section>
      <Section label="Quick checks" eyebrow="Quick checks" title="Know your numbers." lead="Enter a value and Neyu explains where it sits against guidelines.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16 }}>
          <BpTool accent={N.blue} onAsk={(q) => openAlba(q)} />
          <BmiTool accent={N.teal} onAsk={(q) => openAlba(q)} />
          <A1cTool accent={N.green} onAsk={(q) => openAlba(q)} />
        </div>
        <a href="/cardiac-symptoms" style={{ ...btn("ghost"), justifySelf: "start" }}><NIcon name="ph-heartbeat" size={18} tone={"currentColor"} />Check a symptom</a>
      </Section>
      <Section tone="dark" label="Biology" eyebrow="Precision prevention" title={<>Your biology is personal.<br /><span style={gradText}>Your health should be too.</span></>} lead="Genomics • Biomarkers • Microbiome • Lifestyle • Wearables — brought together for a more personal understanding of your risk.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 12 }}>
          {[["Genomics", "ph-dna", "Inherited risks and medicine response."], ["Biomarkers", "ph-flask", "Inflammation, vascular and aging markers."], ["Microbiome", "ph-circles-three", "Gut health and metabolism."], ["Lifestyle", "ph-heartbeat", "Sleep, food, stress and movement."], ["Wearables", "ph-watch", "Heart rate, HRV, steps and sleep."]].map(([t, ic, d]) => (
            <div key={t} style={{ padding: 18, borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", display: "grid", gap: 8 }}><IconTile icon={ic} size={40} /><b style={{ fontWeight: 500, fontSize: 18, color: "#fff" }}>{t}</b><span style={{ fontSize: 14, color: "rgba(234,242,246,.72)" }}>{d}</span></div>
          ))}
        </div>
        <NeyuReads dark text="Prevention works best when it's personal: the same cholesterol value can mean low risk for one person and high risk for another. Neyu reads your whole picture." ask="How personal can prevention get for me?" />
      </Section>
      <Section tone="white" label="Packages" eyebrow="Private health packages" title={<>Packages built around <span style={gradText}>a real question.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
          {PACKAGES.map((p) => <CapCard key={p.id} icon={p.icon} title={p.title} text={`${p.tag}. ${p.for}`} href={`/packages#${p.id}`} meta={pkgLabTotal(p) ? `Labs ${money(pkgLabTotal(p))}` : undefined} chart={{ mode: p.chart }} />)}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/packages" style={btn("ink")}>Compare packages</a><a href="/packages#executive" style={btn("ghost")}><NIcon name="ph-briefcase" size={18} tone={"currentColor"} />Executive Health</a></div>
      </Section>
      <CtaBand title="Prevention, every year — not once." text="NEYU Membership brings annual assessments, at-home collection and Neyu together in one plan." primary={{ label: "See membership", href: "/membership" }} secondary={{ label: "Ask Neyu", alba: "What preventive checks should I do at my age?" }} />
    </>
  );
}

// ═════════════════════ LONGEVITY ═════════════════════
const LSTEPS = [
  { t: "Assess", d: "Where you are today — habits, numbers and goals.", icon: "ph-clipboard-text" },
  { t: "Understand", d: "What the science says, and what it means for you.", icon: "ph-brain" },
  { t: "Personalize", d: "A plan built around how you already live.", icon: "ph-user-focus" },
  { t: "Improve", d: "Track your trend and re-test what matters.", icon: "ph-trend-up" },
];
function LongevityScore() {
  const [bp, setBp] = useState(128), [ldl, setLdl] = useState(3.4), [act, setAct] = useState(120), [sleep, setSleep] = useState(6.8), [smoke, setSmoke] = useState(false);
  const pts = (v: number, good: number, bad: number) => Math.max(0, Math.min(1, (bad - v) / (bad - good)));
  const score = Math.round(100 * (0.24 * pts(bp, 115, 160) + 0.22 * pts(ldl, 2, 5.5) + 0.2 * (Math.min(act, 300) / 300 >= 0.5 ? 1 : Math.min(act, 150) / 150) + 0.16 * pts(Math.abs(sleep - 7.8), 0, 3) + 0.18 * (smoke ? 0 : 1)));
  const C = 2 * Math.PI * 70;
  const sl = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label style={{ display: "grid", gap: 4 }}><span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>{label}<b style={{ fontWeight: 600 }}>{v}{unit}</b></span><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} style={{ accentColor: N.blue }} /></label>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 20, alignItems: "center" }}>
      <div style={{ ...cardN, padding: 22, display: "grid", gap: 12 }}>
        {sl("Systolic blood pressure", bp, setBp, 100, 180, 1, " mmHg")}
        {sl("LDL cholesterol", ldl, setLdl, 1.5, 6, 0.1, " mmol/L")}
        {sl("Active minutes a week", act, setAct, 0, 320, 10, "")}
        {sl("Sleep a night", sleep, setSleep, 4, 10, 0.1, " h")}
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={smoke} onChange={(e) => setSmoke(e.target.checked)} style={{ width: 18, height: 18, accentColor: N.blue }} />I smoke or vape</label>
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
        <svg viewBox="0 0 180 180" width={220} height={220} role="img" aria-label={`Illustrative longevity score ${score} out of 100`}>
          <defs><linearGradient id="lsg" x1="0" x2="1"><stop offset="0" stopColor="#3CC79E" /><stop offset="1" stopColor="#2A84E4" /></linearGradient></defs>
          <circle cx="90" cy="90" r="70" fill="none" stroke={N.line2} strokeWidth="14" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="url(#lsg)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(score / 100) * C} ${C}`} transform="rotate(-90 90 90)" style={{ transition: "stroke-dasharray .5s" }} />
          <text x="90" y="92" textAnchor="middle" fontSize="44" fontWeight="500" fill={N.ink}>{score}</text>
          <text x="90" y="116" textAnchor="middle" fontSize="12" fill={N.muted}>illustrative score</text>
        </svg>
        <NeyuReads key={score > 75 ? "a" : score > 55 ? "b" : "c"} text={score > 75 ? "A strong direction. Keep the habits, and re-check your numbers yearly." : score > 55 ? "A good base with room to improve — the slider that moves this most is your biggest lever." : "Several factors are pulling this down. Small, steady changes to the biggest one usually help most — talk it through with your care team."} ask="Which of my numbers should I improve first for a longer, healthier life?" />
        <span style={{ fontSize: 12.5, color: N.faint, textAlign: "center", maxWidth: 360 }}>A direction, not a verdict — an educational illustration, not a medical score. Your clinician reviews your real trend.</span>
      </div>
    </div>
  );
}
export function LongevityHub() {
  const [step, setStep] = useState(0);
  const helixLabels = ring([{ id: "move", label: "Movement", icon: "ph-person-simple-run" }, { id: "sleep", label: "Sleep", icon: "ph-moon" }, { id: "food", label: "Nutrition", icon: "ph-bowl-food" }, { id: "mind", label: "Stress", icon: "ph-brain" }, { id: "bio", label: "Biomarkers", icon: "ph-flask" }, { id: "genes", label: "Genes", icon: "ph-dna" }], 500, 300, 360, 220);
  const [nodes, edges] = hub({ id: "span", label: "Healthspan", x: 500, y: 300, r: 60 }, helixLabels);
  return (
    <>
      <PillarHero kicker="Longevity" title={<>Move from healthcare<br /><span style={gradText}>to healthspan.</span></>} lead="NEYU helps you understand where you are today and identify opportunities to improve your health over time." page="/longevity"
        suggestions={["What actually slows biological aging?", "What is a longevity baseline?", "How much sleep do I need?"]}
        stats={LAB_STATS.slice(0, 3).map((s) => ({ v: s.v, s: s.s, l: s.l.split(" — ")[0].split(" in ")[0], d: (s as { d?: number }).d }))}
        visual={<div style={{ ...cardN, padding: 12 }}><NodeNet ariaLabel="Levers of healthspan" nodes={nodes} edges={edges} center="span" height="clamp(300px,36vw,440px)" /></div>} />
      <Section tone="white" label="Journey" eyebrow="Your longevity journey" title={<>Assess → Understand → <span style={gradText}>Personalize → Improve.</span></>}>
        <StepRail steps={LSTEPS} active={step} onPick={setStep} />
        <div key={step} style={{ animation: "fadeUp .3s ease" }}>
          {step === 0 && <Assessment kind="lab" accent={N.green} />}
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
              {[["ph-arrows-down-up", "What actually works", "Which habits and treatments shifted aging clocks in 51 studies.", "#respond"], ["ph-atom", "Cell stress", "GDF-15 and telomeres on a 3D chromosome.", "#stress"], ["ph-gauge", "Pace of aging", "Odometer vs speedometer for your biology.", "#pace"], ["ph-pill", "Medicine safety", "Which of your genes shape your medicines.", "#pgx"], ["ph-dna", "Longevity genes", "What centenarians' genomes share.", "#genes"], ["ph-book-open-text", "Research library", "The studies, as a page-turning book.", "#library"]].map(([ic, t, d, h]) => <CapCard key={t} icon={ic} title={t} text={d} href={`/longevity-lab${h}`} meta="Longevity Lab" />)}
            </div>
          )}
          {step === 2 && <NutritionPlan />}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20, alignItems: "center" }}>
              <div style={{ ...cardN, padding: 14 }}><LiveChart mode="trend" height={260} label="Risk factors in range over time — illustrative" /></div>
              <div style={{ display: "grid", gap: 12 }}>
                <NeyuReads text="Improvement is a trend, not a single result. Re-test the markers that matter on a schedule, and let Neyu show what changed and why." ask="Which markers should I re-test, and how often?" />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/my-health" style={btn("grad")}>Track in My Health Space<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a><a href="#score" style={btn("ghost")}>Try the longevity score</a></div>
              </div>
            </div>
          )}
        </div>
      </Section>
      <Section id="score" label="Score" eyebrow="Longevity score · a feature, not the proposition" title={<>A direction, <span style={gradText}>not a verdict.</span></>} lead="Move the sliders to see how everyday numbers shape the direction of your healthspan. Your real trend is reviewed with your clinician.">
        <LongevityScore />
      </Section>
      <Section tone="dark" label="Longevity Lab" eyebrow="NEYU Longevity Lab" title={<>The science of aging, <span style={gradText}>made visual.</span></>} lead="Five interactive explainers built from peer-reviewed studies (2022–2026), with 3D models, live charts and Neyu.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/longevity-lab" style={btn("grad")}>Open the Longevity Lab<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a>
          <a href="/packages#longevity" style={{ ...btn("ghost"), color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>Longevity Baseline package</a>
        </div>
      </Section>
      <CtaBand title="Healthspan is a long game." text="NEYU Membership re-tests what matters every year and keeps your trend in one place." primary={{ label: "See membership", href: "/membership" }} secondary={{ label: "Ask Neyu", alba: "How do I start a longevity plan?" }} />
    </>
  );
}
