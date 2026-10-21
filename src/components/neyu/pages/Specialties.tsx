"use client";

// /specialties — every specialty in one calm, connected place (replaces the
// first-version "Every heart deserves…" page): hero with Ask Neyu and a live
// specialty network, a focused 3D marquee, specialty cards with their real
// physicians, partner clinics, the precision-care pathway and both clinics.
import React, { useState } from "react";
import { STUDIO } from "@/data/specialtyStudio";
import { physicians } from "@/data/physicians";
import { locations } from "@/data/content";
import { N, Section, PillarHero, NodeNet, StepRail, NeyuReads, CtaBand, IconTile, cardN, gradText, type NetNode } from "../kit";
import { NIcon } from "../icons";
import { Marquee3D } from "../fx";
import { doctorsFor, ALL_LANGS } from "../people";
import CityMap from "../CityMap";

const SPECS = Object.values(STUDIO);
const IN_HOUSE = SPECS.filter((s) => !s.partner && s.slug !== "nutrition");
const PARTNERS = [
  ...SPECS.filter((s) => s.partner || s.slug === "nutrition").map((s) => ({ href: `/specialties/${s.slug}`, icon: s.icon, label: s.label, by: s.partner?.name || "Nea Precision Nutrition", text: s.tagline })),
  { href: "/nea", icon: "skin", label: "Precision Skin Health", by: "Nea Precision Skin", text: "Medical aesthetics, Fotona laser and whole-body wellness, physician-managed." },
];
const PATH = [
  { t: "Consultation", d: "A full review of your history, symptoms and goals with a specialist.", icon: "stethoscope" },
  { t: "Diagnostics", d: "Onsite echo, stress echo, ECG, Holter, ambulatory BP and vascular imaging.", icon: "echo" },
  { t: "Genomics", d: "When useful, BioAro genomic and biomarker testing adds what makes you unique.", icon: "dna" },
  { t: "Neyu reads", d: "Neyu connects every result and explains it in plain language.", icon: "spark" },
  { t: "Your plan", d: "A personal plan shared with your care team and family doctor.", icon: "doc" },
  { t: "Follow-up", d: "Progress tracked over time in My Health Space.", icon: "trend" },
];

export default function SpecialtiesPage() {
  const [pick, setPick] = useState<string>("cardiology");
  const [step, setStep] = useState(0);
  const cur = STUDIO[pick];
  const pos = [[500, 70], [780, 150], [880, 360], [720, 540], [500, 560], [280, 540], [120, 360], [220, 150]];
  const ring = IN_HOUSE.slice(0, 8);
  const nodes: NetNode[] = [{ id: "you", label: "You", x: 500, y: 320, r: 56 }, ...ring.map((s, i) => ({ id: s.slug, label: s.label.replace(" Clinic", ""), x: pos[i][0], y: pos[i][1], icon: s.icon }))];
  const edges: [string, string][] = [...ring.map((s) => ["you", s.slug] as [string, string]), ["cardiology", "heart-failure-clinic"], ["cardiology", "internal-medicine"], ["internal-medicine", "endocrinology"], ["internal-medicine", "geriatric-medicine"], ["endocrinology", "precision-medicine"], ["cardiology", "precision-medicine"]];
  const docs = doctorsFor(cur.disciplines);
  return (
    <>
      <PillarHero kicker="Care · Specialties" title={<>Every specialty, <span style={gradText}>connected.</span></>}
        lead="Cardiology, heart failure, internal medicine, endocrinology, geriatric medicine and pediatric rheumatology under one roof — with partner care for breathing, sleep, nutrition and skin, and Neyu across all of it."
        page="/specialties" suggestions={["Which specialist should I see for palpitations?", "Do I need a referral?", "Which specialties are at Meadow Miles?"]}
        stats={[{ v: SPECS.length + 1, l: "specialties & partner clinics" }, { v: physicians.length, l: "physicians" }, { v: ALL_LANGS.length, l: "languages spoken" }]}
        visual={<div style={{ ...cardN, padding: 12 }}>
          <NodeNet ariaLabel="NEYU specialties connected around you — tap one" nodes={nodes} edges={edges} center="you" active={pick} onPick={(k) => k !== "you" && setPick(k)} height="clamp(300px,36vw,440px)" />
          <div style={{ padding: "0 8px 8px" }}><NeyuReads key={pick} title={`Neyu · ${cur.label}`} text={cur.tagline} ask={`What does ${cur.label.toLowerCase()} at NEYU help with?`} /></div>
        </div>} />

      <section aria-label="All specialties" style={{ padding: "8px 0 24px" }}>
        <Marquee3D items={[...SPECS.map((s) => ({ icon: s.icon, label: s.label, href: `/specialties/${s.slug}` })), { icon: "skin", label: "Precision Skin", href: "/nea" }]} height={210} />
      </section>

      <Section id="in-house" tone="white" label="Specialties" eyebrow="NEYU medical specialties" title={<>Specialist care, <span style={gradText}>under one roof.</span></>} lead="Each specialty page has Ask Neyu, screening tools, related tests with real prices, the physicians you'd see and how to visit.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 16 }}>
          {IN_HOUSE.map((s) => { const d = doctorsFor(s.disciplines); return (
            <a key={s.slug} href={`/specialties/${s.slug}`} className="sx-card" style={{ ...cardN, padding: 22, display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", color: N.ink, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}><IconTile icon={s.icon} /><b style={{ fontWeight: 500, fontSize: 20, letterSpacing: "-.015em" }}>{s.label}</b></span>
              <span style={{ fontSize: 15, lineHeight: 1.55, color: N.ink2 }}>{s.tagline}</span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{s.conditions.slice(0, 3).map((c) => <span key={c} style={{ padding: "4px 10px", borderRadius: 999, background: N.line2, fontSize: 12.5, color: N.ink2 }}>{c.split(" (")[0]}</span>)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: N.muted, marginTop: "auto" }}><NIcon name="doctor" size={16} tone="grad" />{d.length ? (s.slug === "geriatric-medicine" ? `Supported by ${d.length} internal medicine physicians` : s.slug === "heart-failure-clinic" ? `${d.length} cardiologists` : `${d.length} physician${d.length > 1 ? "s" : ""}`) : "Physicians on referral"}<span style={{ marginLeft: "auto", color: N.deep, fontWeight: 600, display: "inline-flex", gap: 6, alignItems: "center" }}>Open<NIcon name="arrow" size={15} tone={N.deep} /></span></span>
            </a>
          ); })}
        </div>
      </Section>

      <Section id="partners" label="Partner clinics" eyebrow="Partner care" title={<>Connected to <span style={gradText}>trusted partners.</span></>} lead="Breathing and sleep, nutrition and skin — delivered by partner clinics, connected to your NEYU record and to Neyu.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
          {PARTNERS.map((p) => (
            <a key={p.href} href={p.href} className="sx-card" style={{ ...cardN, padding: 22, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: N.ink }}>
              <IconTile icon={p.icon} />
              <b style={{ fontWeight: 500, fontSize: 19 }}>{p.label}</b>
              <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: N.tealText }}>{p.by}</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{p.text}</span>
            </a>
          ))}
        </div>
      </Section>

      <Section tone="white" label="Pathway" eyebrow="How precision care works here" title={<>From consultation <span style={gradText}>to lifelong follow-up.</span></>}>
        <StepRail steps={PATH} active={step} onPick={setStep} />
        <NeyuReads key={step} title={`Step ${step + 1} · ${PATH[step].t}`} text={PATH[step].d} />
      </Section>

      <Section id="visit" label="Visit" eyebrow="Two Calgary clinics" title={<>Find us, <span style={gradText}>the easy way.</span></>} lead={`Both clinics are open ${"7:30 AM – 5:00 PM"}, Monday to Friday. Add your postal code and Neyu shows the closer one.`}>
        <CityMap height={460} />
        {docs.length > 0 && <p style={{ margin: 0, fontSize: 14, color: N.muted }}>{cur.label} physicians see patients at: {Array.from(new Set(docs.map((d) => d.location))).join(" and ")}.</p>}
        <p style={{ margin: 0, fontSize: 13, color: N.faint }}>{locations.map((l) => `${l.name}: ${l.address}`).join(" · ")}</p>
      </Section>

      <CtaBand title="Not sure which specialist you need?" text="Describe what's going on and Neyu suggests the right specialty, test or program — then helps you prepare." primary={{ label: "Referral Centre", href: "/referral-centre" }} secondary={{ label: "Ask Neyu", alba: "Which NEYU specialist should I see?" }} />
    </>
  );
}
