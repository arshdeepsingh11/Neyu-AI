"use client";

// /services — the clinic's consultations and onsite diagnostics in the NEYU style:
// hero with a live diagnostic visual, a 3D coverflow of every service, each
// opening a detail sheet with Neyu; diagnostic categories; the CHARM heart-failure
// clinic and clinical research. Text from src/data/content.ts.
import React, { useEffect, useState } from "react";
import { services, charmClinic, clinicalTrials, type Service } from "@/data/content";
import { diagnosticContent } from "@/data/diagnosticContent";
import { useAlba } from "@/components/AlbaContext";
import { N, Section, PillarHero, LiveChart, CtaBand, IconTile, cardN, btn, gradText, NeyuReads } from "../kit";
import { NIcon } from "../icons";
import { Coverflow, PillNav } from "../fx";

export const SERVICE_ICON: Record<string, string> = { "cardiology-consultation": "stethoscope", "exercise-stress-echo": "steps", "internal-medicine": "doctor", endocrinology: "hormone", ecg: "pulse", "holter-monitoring": "watch", echocardiography: "echo", "carotid-ultrasound": "vessel", "myocardial-perfusion-imaging": "scan", "ambulatory-bp-monitoring": "gauge" };
const SERVICE_CHART: Record<string, string> = { "cardiology-consultation": "ecg", "exercise-stress-echo": "hr", "internal-medicine": "signal", endocrinology: "glucose", ecg: "ecg", "holter-monitoring": "ecg", echocardiography: "echo", "carotid-ultrasound": "flow", "myocardial-perfusion-imaging": "echo", "ambulatory-bp-monitoring": "bp" };
const DIAG_ICON: Record<string, string> = { "cardiac-imaging": "echo", "stress-testing": "steps", vascular: "vessel", monitoring: "watch", pulmonary: "lungs" };

function Sheet({ s, onClose }: { s: Service; onClose: () => void }) {
  const { openAlba } = useAlba();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="anra-chrome">
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(14,27,44,.36)", backdropFilter: "blur(6px)" }} />
      <div role="dialog" aria-modal="true" aria-label={s.name} style={{ position: "fixed", zIndex: 86, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(620px,calc(100% - 24px))", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: 28, padding: "clamp(20px,4vw,32px)", boxShadow: "0 50px 100px -40px rgba(14,27,44,.55)", animation: "fadeUp .25s", display: "grid", gap: 14, color: N.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}><IconTile icon={SERVICE_ICON[s.slug] || "heartPulse"} size={50} active /><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: "-.02em" }}>{s.name}</h2></span>
          <button onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 20, border: `1px solid ${N.line}`, background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flex: "none" }}><NIcon name="x" size={18} /></button>
        </div>
        <LiveChart mode={SERVICE_CHART[s.slug] || "ecg"} height={170} />
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: N.ink2 }}>{s.long}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { onClose(); openAlba(`Tell me about ${s.name} at NEYU — what it is, what to expect and how to prepare.`); }} style={btn("grad")}><NIcon name="spark" size={16} tone="light" />Ask Neyu</button>
          <a href="/referral-centre" style={btn("ghost")}>Start a referral<NIcon name="arrow" size={16} tone="currentColor" /></a>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [open, setOpen] = useState<Service | null>(null);
  const [more, setMore] = useState<"charm" | "trials">("charm");
  useEffect(() => { const o = new URLSearchParams(window.location.search).get("open"); if (o === "trials") setMore("trials"); if (o === "charm" || o === "trials") setTimeout(() => document.getElementById("more")?.scrollIntoView({ behavior: "smooth" }), 300); }, []);
  return (
    <>
      <PillarHero kicker="Care · Clinic services" title={<>A complete heart and <span style={gradText}>medicine team.</span></>}
        lead="Consultations and onsite diagnostics in one clinic — home of Alberta's first onsite exercise stress echocardiogram program. Testing and follow-up happen under one roof."
        page="/services" suggestions={["What is an exercise stress echo?", "How do I prepare for a Holter monitor?", "What does a carotid ultrasound show?"]}
        stats={[{ v: services.length, l: "clinic services" }, { v: Object.keys(diagnosticContent).length, l: "diagnostic areas" }, { v: 1, l: "regional first: onsite stress echo" }]}
        visual={<div style={{ ...cardN, padding: 16, display: "grid", gap: 12 }}><LiveChart mode="ecg" height={150} /><LiveChart mode="echo" height={150} /></div>} />

      <Section id="all" tone="white" label="All services" eyebrow="Every service" title={<>Swipe through <span style={gradText}>what we do.</span></>} lead="Tap any service for what it is, what to expect and how to prepare — or ask Neyu.">
        <Coverflow label="Clinic services" items={services} cardWidth={320} render={(s, i, on) => (
          <button onClick={() => setOpen(s)} style={{ width: "100%", minHeight: 300, textAlign: "left", cursor: "pointer", padding: 22, borderRadius: 26, display: "flex", flexDirection: "column", gap: 12, background: on ? "linear-gradient(160deg,#FFFFFF,#F1F9F7 60%,#EDF4FB)" : "#fff", border: `1px solid ${on ? "rgba(31,167,180,.45)" : N.line}`, boxShadow: on ? "0 30px 60px -36px rgba(34,115,214,.55)" : "0 20px 40px -34px rgba(14,27,44,.35)", color: N.ink }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><IconTile icon={SERVICE_ICON[s.slug] || "heartPulse"} active={on} /><span style={{ fontSize: 12, color: N.faint, letterSpacing: ".14em" }}>{String(i + 1).padStart(2, "0")}</span></span>
            <b style={{ fontWeight: 500, fontSize: 21, letterSpacing: "-.015em", lineHeight: 1.2 }}>{s.name}</b>
            <span style={{ fontSize: 15, lineHeight: 1.55, color: N.ink2 }}>{s.short}</span>
            <span style={{ marginTop: "auto", fontSize: 14, fontWeight: 600, color: N.deep, display: "inline-flex", gap: 6, alignItems: "center" }}>Learn more<NIcon name="arrow" size={15} tone={N.deep} /></span>
          </button>
        )} />
      </Section>

      <Section id="diagnostics" label="Diagnostic areas" eyebrow="Onsite diagnostics" title={<>Testing, <span style={gradText}>grouped clearly.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14 }}>
          {Object.values(diagnosticContent).map((d) => (
            <a key={d.slug} href={`/diagnostics/${d.slug}`} className="sx-card" style={{ ...cardN, padding: 20, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: N.ink }}>
              <IconTile icon={DIAG_ICON[d.slug] || "pulse"} />
              <b style={{ fontWeight: 500, fontSize: 18 }}>{d.label}</b>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: N.ink2 }}>{d.tagline}</span>
              <span style={{ marginTop: "auto", fontSize: 13.5, color: N.muted }}>{d.tests.length} test{d.tests.length > 1 ? "s" : ""} · prep guides</span>
            </a>
          ))}
        </div>
      </Section>

      <Section id="more" tone="white" label="CHARM and research" eyebrow="Community & research" title={<>Beyond the visit.</>}>
        <PillNav label="Programs" tabs={[{ k: "charm", label: "CHARM Clinic", icon: "heartPulse" }, { k: "trials", label: "Clinical trials", icon: "trial" }]} value={more} onChange={(k) => setMore(k as "charm" | "trials")} />
        {more === "charm" ? (
          <div key="c" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 18, animation: "fadeUp .3s ease" }}>
            <div style={{ ...cardN, padding: "clamp(20px,3vw,30px)", display: "grid", gap: 12, alignContent: "start" }}>
              <span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{charmClinic.fullName}</span>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: N.ink2 }}>{charmClinic.intro}</p>
              <NeyuReads title="How it works" text={charmClinic.howItWorks} ask="How does the CHARM heart-failure clinic work?" />
            </div>
            <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
              {[["care", "Self-care support", charmClinic.selfCare], ["trial", "Research at CHARM", charmClinic.research]].map(([ic, t, d]) => (
                <div key={t} style={{ ...cardN, padding: 20, display: "grid", gap: 10 }}><span style={{ display: "flex", gap: 10, alignItems: "center" }}><IconTile icon={ic} size={40} /><b style={{ fontWeight: 500, fontSize: 18 }}>{t}</b></span><p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: N.ink2 }}>{d}</p></div>
              ))}
              <a href="/referral-centre" style={{ ...btn("grad"), justifySelf: "start" }}>Refer to CHARM<NIcon name="arrow" size={16} tone="light" /></a>
            </div>
          </div>
        ) : (
          <div key="t" style={{ display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: N.ink2, maxWidth: 760 }}>NEYU physicians take part in national and international research. Participation is always voluntary — ask your physician whether a study fits you.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,240px),1fr))", gap: 10 }}>
              {clinicalTrials.map((t) => <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: "#fff", border: `1px solid ${N.line}`, fontSize: 14.5, color: N.ink2 }}><NIcon name="trial" size={18} tone="grad" />{t}</div>)}
            </div>
          </div>
        )}
      </Section>

      <CtaBand title="Most services start with a referral." text="Your family doctor or a walk-in physician can refer you — our Referral Centre makes it simple." primary={{ label: "Referral Centre", href: "/referral-centre" }} secondary={{ label: "Ask Neyu", alba: "Which NEYU service do I need?" }} />
      {open && <Sheet s={open} onClose={() => setOpen(null)} />}
    </>
  );
}
