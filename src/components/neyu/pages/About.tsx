"use client";

// /about — the NEYU story: founder, a regional first, the multilingual team
// (physician languages straight from the physician data), and the brand
// philosophy Listen · Connect · Flourish.
import React from "react";
import { aboutStory, brand, languages as teamLanguages, whyChoose } from "@/data/content";
import { physicians } from "@/data/physicians";
import { N, Section, PillarHero, NeyuReads, CtaBand, IconTile, cardN, gradText } from "../kit";
import { NIcon } from "../icons";
import { EvervaultCard } from "../fx";
import { LanguageMatrix, ALL_LANGS } from "../people";
import { PHILOSOPHY } from "@/data/neyu";

const WHY_ICON: Record<string, string> = { "A Regional First": "flag", "Multilingual Care": "language", "Complete Diagnostics": "echo", "Coordinated Team": "network" };

export default function AboutPage() {
  const [p1, p2] = aboutStory.split("\n\n");
  const staffOnly = teamLanguages.filter((l) => !ALL_LANGS.includes(l));
  return (
    <>
      <PillarHero kicker="About NEYU" title={<>Advanced thinking, <span style={gradText}>applied to care.</span></>}
        lead={p1} page="/about" suggestions={["What makes NEYU different?", "Who founded NEYU Health?", "What is a stress echocardiogram?"]}
        visual={<div style={{ ...cardN, overflow: "hidden", position: "relative", aspectRatio: "4 / 4.6" }}>
          <img src="/dr-kapoor-physicians.webp" alt={`${brand.founder}, founder of NEYU Health`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", gap: 12, alignItems: "center" }}><NIcon name="award" size={22} tone="grad" /><span style={{ fontSize: 14.5, color: N.ink }}>Founded under the guidance of <b style={{ fontWeight: 600 }}>{brand.founder}</b></span></div>
        </div>} />

      <Section tone="white" label="Story" eyebrow="Our story" title={<>A regional first, <span style={gradText}>and many since.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 18, alignItems: "stretch" }}>
          <EvervaultCard height="100%" style={{ minHeight: 280 }}>
            <div style={{ padding: "clamp(22px,3vw,32px)", display: "grid", gap: 12, alignContent: "end", height: "100%", boxSizing: "border-box" }}>
              <span style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>First in Alberta</span>
              <b style={{ fontWeight: 500, fontSize: "clamp(24px,3vw,34px)", lineHeight: 1.15, letterSpacing: "-.02em" }}>Onsite exercise stress echocardiograms.</b>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: N.ink2 }}>{p2.split(" Our multilingual team")[0]}</p>
            </div>
          </EvervaultCard>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 12 }}>
            {whyChoose.map((w) => (
              <div key={w.title} style={{ ...cardN, padding: 20, display: "grid", gap: 10, alignContent: "start" }}>
                <IconTile icon={WHY_ICON[w.title] || "spark"} />
                <b style={{ fontWeight: 500, fontSize: 17 }}>{w.title}</b>
                <span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{w.title === "Multilingual Care" ? `Our physicians speak ${ALL_LANGS.join(", ")}.` : w.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section label="Languages" eyebrow="A multilingual team" title={<>Care in <span style={gradText}>your language.</span></>} lead={`Our ${physicians.length} physicians speak ${ALL_LANGS.length} languages between them${staffOnly.length ? `, and our wider clinic team also speaks ${staffOnly.join(", ")}` : ""}.`}>
        <LanguageMatrix />
      </Section>

      <Section tone="soft" label="Philosophy" center eyebrow="The NEYU philosophy" title={<>Listen. Connect. <span style={gradText}>Flourish.</span></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
          {PHILOSOPHY.map((p) => <div key={p.k} style={{ ...cardN, padding: 24, display: "grid", gap: 10, textAlign: "left" }}><NIcon name={p.icon} size={40} tone="grad" stroke={1.2} /><b style={{ fontWeight: 300, fontSize: 34, letterSpacing: "-.03em" }}>{p.k}</b><span style={{ fontSize: 15.5, lineHeight: 1.55, color: N.ink2 }}>{p.text} {p.more}</span></div>)}
        </div>
        <NeyuReads text="NEYU continues the work of Advanced Cardiology Consultants and Diagnostics — now with Neyu, our AI companion, connecting every part of your care." />
      </Section>
      <CtaBand title="Meet the team in person." text="Book a consultation at either Calgary clinic — most visits start with a referral from your family doctor." primary={{ label: "Meet our physicians", href: "/physicians" }} secondary={{ label: "Contact", href: "/contact" }} />
    </>
  );
}
