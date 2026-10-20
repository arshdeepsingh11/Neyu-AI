"use client";

// /cardiac-symptoms — what each symptom can mean, when it's an emergency, and an
// AI symptom check with Neyu (emergency patterns are checked first, always).
import React, { useState } from "react";
import { cardiacSymptoms, faqs } from "@/data/content";
import SymptomChecker from "@/components/SymptomChecker";
import { N, Section, PillarHero, NeyuReads, CtaBand, IconTile, cardN, gradText, LiveChart } from "../kit";
import { NIcon } from "../icons";

const ICON: Record<string, string> = { "Chest Pain": "heart", "Shortness of Breath": "lungs", Palpitations: "pulse", "Dizziness / Lightheadedness": "compass", Fatigue: "moon", "Swelling (Edema)": "drop" };
const RED_FLAGS = ["Chest pain or pressure that spreads to the arm, jaw or back", "Sudden, severe shortness of breath", "Fainting or loss of consciousness", "Sudden weakness, numbness or slurred speech", "A racing heartbeat with chest pain or fainting"];


// What each symptom can mean and when to act — general education, reviewed against common cardiology guidance.
const INFO: Record<string, { can: string[]; see: string; now: string }> = {
  "Chest Pain": { can: ["Reduced blood flow to the heart (angina)", "Inflammation around the heart", "Muscle, lung or stomach causes"], see: "Chest discomfort with activity that settles with rest, or that keeps coming back.", now: "Pain or pressure that spreads to the arm, jaw or back, or comes with sweating, nausea or breathlessness." },
  "Shortness of Breath": { can: ["A heart that isn't pumping as well as it should", "Valve problems or rhythm problems", "Lung causes such as asthma or COPD"], see: "Breathlessness with less effort than before, or needing more pillows to sleep.", now: "Sudden, severe breathlessness, or breathlessness with chest pain or fainting." },
  "Palpitations": { can: ["Extra beats, often harmless", "Atrial fibrillation or other rhythm problems", "Caffeine, stress, thyroid or medicines"], see: "Palpitations that are frequent, last minutes, or come with dizziness.", now: "A racing heartbeat with chest pain, fainting or severe breathlessness." },
  "Dizziness / Lightheadedness": { can: ["Low blood pressure or dehydration", "A slow or fast heart rhythm", "Medicine side effects"], see: "Repeated dizziness, especially on standing or with exertion.", now: "Fainting, or dizziness with chest pain, a racing heart or new weakness." },
  "Fatigue": { can: ["Reduced heart pumping", "Anemia, thyroid or sleep problems", "Medicine side effects"], see: "Tiredness that is new, lasts weeks, or limits what you can do.", now: "Fatigue with chest pain, fainting or sudden breathlessness." },
  "Swelling (Edema)": { can: ["Fluid build-up from heart failure", "Kidney or liver causes", "Vein problems or some medicines"], see: "Swelling in both ankles that is new or growing, or quick weight gain.", now: "Swelling with sudden breathlessness, or one painful, swollen leg." },
};

export default function SymptomsPage() {
  const [pick, setPick] = useState(cardiacSymptoms[0].name);
  const [faq, setFaq] = useState<number | null>(0);
  const cur = cardiacSymptoms.find((s) => s.name === pick)!;
  return (
    <>
      <div role="alert" style={{ background: "#B8433A", color: "#fff", padding: "12px clamp(16px,4vw,40px)", display: "flex", gap: 10, alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 500, textAlign: "center" }}>
        <NIcon name="alert" size={18} tone="light" />Chest pain, trouble breathing or another emergency? <a href="tel:911" style={{ color: "#fff", fontWeight: 700 }}>Call 911 now.</a>
      </div>
      <PillarHero kicker="Prevention · Know the signs" title={<>Heart symptoms, <span style={gradText}>understood.</span></>}
        lead="What each symptom can mean, when it can wait for a referral and when it can't — explained by Neyu, reviewed against our cardiology team's guidance."
        page="/cardiac-symptoms" suggestions={["Is a fluttering heartbeat dangerous?", "Why do my ankles swell?", "When is chest pain an emergency?"]}
        visual={<div style={{ ...cardN, padding: 16, display: "grid", gap: 12 }}><LiveChart mode="ecg" height={170} /><NeyuReads key={pick} title={`Neyu · ${cur.name}`} text={cur.desc} ask={`What can ${cur.name.toLowerCase()} mean, and when should I see a cardiologist?`} /></div>} />

      <Section tone="white" label="Symptoms" eyebrow="Six symptoms we assess" title={<>Tap a symptom <span style={gradText}>to learn more.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 14 }}>
          {cardiacSymptoms.map((s) => { const on = s.name === pick; return (
            <button key={s.name} onClick={() => { setPick(s.name); setTimeout(() => document.getElementById("sym-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60); }} aria-pressed={on} className="sx-card" style={{ ...cardN, padding: 20, textAlign: "left", cursor: "pointer", display: "grid", gap: 10, alignContent: "start", borderColor: on ? "rgba(31,167,180,.5)" : N.line, background: on ? "linear-gradient(160deg,#FFFFFF,#F1F9F7)" : "#fff", color: N.ink }}>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}><IconTile icon={ICON[s.name] || "heartPulse"} active={on} /><b style={{ fontWeight: 500, fontSize: 18 }}>{s.name}</b></span>
              <span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{s.desc}</span>
            </button>
          ); })}
        </div>
        {INFO[cur.name] && (
          <div id="sym-detail" key={cur.name} style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 18, animation: "fadeUp .35s ease", scrollMarginBottom: 24 }}>
            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}><IconTile icon={ICON[cur.name] || "heartPulse"} active /><b style={{ fontWeight: 500, fontSize: 22 }}>{cur.name}</b></span>
              <span style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>What it can mean</span>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 15, color: N.ink2, lineHeight: 1.5 }}>{INFO[cur.name].can.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(34,115,214,.06)", border: "1px solid rgba(34,115,214,.18)" }}><b style={{ fontWeight: 600, fontSize: 14, color: N.deep }}>See your doctor if</b><div style={{ fontSize: 15, color: N.ink, lineHeight: 1.5, marginTop: 4 }}>{INFO[cur.name].see}</div></div>
              <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(184,67,58,.06)", border: "1px solid rgba(184,67,58,.22)" }}><b style={{ fontWeight: 600, fontSize: 14, color: "#A93A2C" }}>Call 911 if</b><div style={{ fontSize: 15, color: N.ink, lineHeight: 1.5, marginTop: 4 }}>{INFO[cur.name].now}</div></div>
            </div>
            <NeyuReads title={`Neyu · ${cur.name}`} text={cur.desc} ask={`What can ${cur.name.toLowerCase()} mean, and when should I see a cardiologist?`} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 18, alignItems: "start" }}>
          <div style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 12, borderColor: "#F0B9AC", background: "linear-gradient(160deg,#FFFFFF,#FDF3F0)" }}>
            <span style={{ display: "flex", gap: 10, alignItems: "center", color: "#A93A2C", fontWeight: 600 }}><NIcon name="alert" size={20} tone="#A93A2C" />Call 911 — don't wait — if you have:</span>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>{RED_FLAGS.map((r) => <li key={r} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.5, color: N.ink }}><span style={{ width: 6, height: 6, borderRadius: 3, background: "#B8433A", marginTop: 9, flex: "none" }} />{r}</li>)}</ul>
            <a href="tel:911" style={{ justifySelf: "start", display: "inline-flex", gap: 8, alignItems: "center", height: 46, padding: "0 20px", borderRadius: 999, background: "#B8433A", color: "#fff", textDecoration: "none", fontWeight: 600 }}><NIcon name="phone" size={17} tone="light" />Call 911</a>
          </div>
          <SymptomChecker specialty="cardiology" />
        </div>
      </Section>

      <Section label="FAQ" eyebrow="Before your visit" title={<>Common <span style={gradText}>questions.</span></>}>
        <div style={{ display: "grid", gap: 10, maxWidth: 860 }}>
          {faqs.map((f, i) => { const on = faq === i; return (
            <div key={f.q} style={{ ...cardN, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setFaq(on ? null : i)} aria-expanded={on} style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "18px 20px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontSize: 16.5, fontWeight: 500, color: N.ink }}>{f.q}<NIcon name={on ? "minus" : "plus"} size={18} tone="grad" /></button>
              {on && <p style={{ margin: 0, padding: "0 20px 18px", fontSize: 15.5, lineHeight: 1.65, color: N.ink2, animation: "fadeUp .25s ease" }}>{f.a}</p>}
            </div>
          ); })}
        </div>
      </Section>
      <CtaBand title="Experiencing symptoms?" text="Ask your family doctor for a cardiology referral — or send one through our Referral Centre. In an emergency, call 911." primary={{ label: "Referral Centre", href: "/referral-centre" }} secondary={{ label: "Cardiology", href: "/specialties/cardiology" }} />
    </>
  );
}
