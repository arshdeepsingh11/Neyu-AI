"use client";

// /physicians — NEYU style: hero with Ask Neyu, a 3D scroll-rotating gallery of the
// team, an AI physician matcher, the full team with filters, and a precise
// "who speaks what" matrix. All facts come from src/data/physicians.ts.
import React, { useMemo, useState } from "react";
import { physicians, type Physician } from "@/data/physicians";
import { locations } from "@/data/content";
import { N, Section, PillarHero, NeyuReads, CtaBand, cardN, btn, gradText } from "../kit";
import { NIcon } from "../icons";
import { SphereGallery, PillNav } from "../fx";
import PhysicianIdGrid from "@/components/PhysicianIdGrid";
import { PhysicianCard, PhysicianSheet, LanguageMatrix, Avatar, ALL_LANGS } from "../people";

const CONCERNS = [
  { key: "general-cardiology", label: "Heart & cardiology", icon: "heart", exact: ["Cardiology"], related: ["Internal Medicine"] },
  { key: "arrhythmia", label: "Heart rhythm", icon: "pulse", exact: ["Cardiology"], related: ["Internal Medicine"] },
  { key: "stress-testing", label: "Chest pain & stress testing", icon: "heartPulse", exact: ["Cardiology"], related: ["Internal Medicine"] },
  { key: "internal-medicine", label: "Internal medicine", icon: "stethoscope", exact: ["Internal Medicine"], related: ["Cardiology"] },
  { key: "endocrinology", label: "Diabetes, thyroid & hormones", icon: "hormone", exact: ["Endocrinology"], related: ["Internal Medicine"] },
  { key: "rheumatology", label: "Rheumatology", icon: "joint", exact: ["Rheumatology"], related: [] },
  { key: "pediatrics", label: "Children (pediatrics)", icon: "child", exact: ["Pediatrics"], related: [] },
] as const;
type Concern = (typeof CONCERNS)[number];

function score(p: Physician, c: Concern | null, loc: string, lang: string) {
  let s = 0; const why: string[] = [];
  if (c) {
    if (c.exact.some((d) => p.disciplines.includes(d))) { s += 10; why.push(`practises ${c.exact.join(" & ").toLowerCase()}`); }
    else if ((c.related as readonly string[]).some((d) => p.disciplines.includes(d))) { s += 4; why.push(`related: ${p.disciplines.join(" & ").toLowerCase()}`); }
  }
  if (loc !== "Any" && p.location === loc) { s += 5; why.push(`sees patients at ${loc}`); }
  if (lang !== "Any" && p.languages.includes(lang)) { s += 3; why.push(`speaks ${lang}`); }
  return { s, why };
}

const DISCIPLINES = ["All", ...Array.from(new Set(physicians.flatMap((p) => p.disciplines))).sort()];

export default function PhysiciansPage() {
  const [concern, setConcern] = useState<Concern["key"] | "">("");
  const [loc, setLoc] = useState("Any");
  const [lang, setLang] = useState("Any");
  const [ran, setRan] = useState(false);
  const [open, setOpen] = useState<Physician | null>(null);
  const [disc, setDisc] = useState("All");
  const [fLang, setFLang] = useState("All");
  const c = CONCERNS.find((x) => x.key === concern) || null;
  const matches = useMemo(() => physicians.map((p) => ({ p, ...score(p, c, loc, lang) })).filter((r) => r.s >= (c ? 4 : 1)).sort((a, b) => b.s - a.s).slice(0, 3), [c, loc, lang]);
  const team = physicians.filter((p) => (disc === "All" || p.disciplines.includes(disc)) && (fLang === "All" || p.languages.includes(fLang)));
  const gallery = useMemo(() => physicians.map((p) => ({ kind: "doc" as const, p })), []);
  const sel: React.CSSProperties = { height: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${N.line}`, background: "#fff", fontSize: 16, color: N.ink, width: "100%" };

  return (
    <>
      <PillarHero kicker="Care · Physicians" title={<>Meet your <span style={gradText}>physicians.</span></>}
        lead={`${physicians.length} specialists in cardiology, internal medicine, endocrinology, pediatrics and rheumatology, across our two Calgary clinics — speaking ${ALL_LANGS.length} languages between them.`}
        page="/physicians" suggestions={["Which physician speaks Punjabi?", "Who treats thyroid problems?", "Which doctors work at Meadow Miles?"]}
        stats={[{ v: physicians.length, l: "physicians" }, { v: ALL_LANGS.length, l: "languages spoken" }, { v: locations.length, l: "Calgary clinics" }]}
        visual={<div style={{ ...cardN, padding: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: N.muted }}><span>Your NEYU team · drag to rotate</span><NIcon name="loop" size={16} tone="grad" /></div>
          <SphereGallery label="The NEYU physicians in a rotating 3D gallery" items={gallery} height={400} radius={250} flatten={0.32} cardW={150}
            render={(it) => <button onClick={() => setOpen(it.p)} style={{ width: 150, padding: 12, borderRadius: 18, background: "rgba(255,255,255,.96)", border: `1px solid ${N.line}`, boxShadow: "0 18px 30px -22px rgba(14,27,44,.5)", display: "grid", justifyItems: "center", gap: 6, cursor: "pointer", textAlign: "center" }}><Avatar p={it.p} size={44} /><b style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.2, color: N.ink }}>{it.p.name.replace("Dr. ", "Dr. ").split(" ").slice(0, 3).join(" ")}</b><span style={{ fontSize: 12, color: N.teal }}>{it.p.disciplines[0]}</span><span style={{ fontSize: 11, color: N.muted }}>{it.p.languages.length} languages</span></button>} />
        </div>} />

      <Section id="match" tone="white" label="Physician matcher" eyebrow="Neyu · AI matcher" title={<>Find the right physician, <span style={gradText}>in seconds.</span></>} lead="Tell Neyu what you need help with, where you'd like to be seen and the language you prefer. It ranks the team and explains why.">
        <div style={{ ...cardN, padding: "clamp(18px,3vw,30px)", display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: N.ink2 }}>1 · What do you need help with?</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CONCERNS.map((x) => { const on = concern === x.key; return <button key={x.key} aria-pressed={on} onClick={() => { setConcern(x.key); setRan(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 14, border: `1px solid ${on ? "transparent" : N.line}`, background: on ? N.ink : "#fff", color: on ? "#fff" : N.ink2, transition: "all .2s" }}><NIcon name={x.icon} size={17} tone={on ? "light" : "grad"} />{x.label}</button>; })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>2 · Preferred clinic<select style={sel} value={loc} onChange={(e) => { setLoc(e.target.value); setRan(true); }}><option>Any</option>{locations.map((l) => <option key={l.tag}>{l.tag}</option>)}</select></label>
            <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>3 · Preferred language<select style={sel} value={lang} onChange={(e) => { setLang(e.target.value); setRan(true); }}><option>Any</option>{ALL_LANGS.map((l) => <option key={l}>{l}</option>)}</select></label>
          </div>
          {ran && (matches.length ? (
            <div style={{ display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
              <NeyuReads title="Neyu matched" text={`${matches.length === 1 ? "One physician fits" : `${matches.length} physicians fit`}${c ? ` for ${c.label.toLowerCase()}` : ""}${loc !== "Any" ? ` at ${loc}` : ""}${lang !== "Any" ? ` in ${lang}` : ""}. ${matches[0].p.name} ${matches[0].why.join(", ")}.`} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: 14 }}>
                {matches.map((m, i) => <div key={m.p.slug} style={{ display: "grid", gap: 8 }}><span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: i === 0 ? N.deep : N.muted }}>{i === 0 ? "Best match" : `Match ${i + 1}`} · {m.why.join(" · ") || "on the NEYU team"}</span><PhysicianCard p={m.p} active={i === 0} onOpen={() => setOpen(m.p)} /></div>)}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: N.muted }}>Most specialist visits need a referral from your family doctor or a walk-in clinic. <a href="/referral-centre" style={{ color: N.deep, fontWeight: 600 }}>Referral Centre →</a></p>
            </div>
          ) : <p style={{ margin: 0, fontSize: 15, color: N.ink2 }}>No physician matches all three choices — try “Any” for the clinic or language.</p>)}
        </div>
      </Section>

      <Section id="team" label="All physicians" eyebrow="The NEYU team" title={<>Everyone, <span style={gradText}>at a glance.</span></>}>
        <div style={{ display: "grid", gap: 10 }}>
          <PillNav size="sm" label="Filter by discipline" tabs={DISCIPLINES.map((d) => ({ k: d, label: d === "All" ? "All disciplines" : d }))} value={disc} onChange={setDisc} />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }} className="neyu-noscroll">{["All", ...ALL_LANGS].map((l) => <button key={l} aria-pressed={fLang === l} onClick={() => setFLang(l)} style={{ flex: "none", minHeight: 36, padding: "0 14px", borderRadius: 999, border: `1px solid ${fLang === l ? N.blue : N.line}`, background: fLang === l ? "rgba(34,115,214,.08)" : "#fff", color: fLang === l ? N.deep : N.ink2, fontSize: 13.5, cursor: "pointer" }}>{l === "All" ? "Any language" : l}</button>)}</div>
        </div>
        <PhysicianIdGrid list={team} onOpen={setOpen} />
        {!team.length && <p style={{ color: N.muted }}>No physician matches both filters.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          <b style={{ fontWeight: 500, fontSize: 20 }}>Who speaks what</b>
          <LanguageMatrix highlight={fLang === "All" ? undefined : fLang} />
        </div>
      </Section>

      <CtaBand title="Ready to see a NEYU physician?" text="Ask your family doctor for a referral, or send one through our Referral Centre. Questions first? Neyu can help." primary={{ label: "Referral Centre", href: "/referral-centre" }} secondary={{ label: "Ask Neyu", alba: "Which NEYU physician is right for me?" }} />
      {open && <PhysicianSheet p={open} onClose={() => setOpen(null)} />}
    </>
  );
}
