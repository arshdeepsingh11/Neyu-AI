"use client";

import React, { useEffect, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { NEA, NEA_TREATMENTS, NEA_PACKAGES, NEA_DOWNTIME, NEA_OUTCOMES, NEA_SESSION_MIN, NEA_CATS, NEA_META, NEA_FAQ, neaOpenNow, type NeaCat, type NeaTreatment } from "@/data/nea";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { T, card, glass, btnInk, btnGhost, chip, eyebrow, h2, aiText, Book, Icon, CountUp, Stat, Segmented, ChartCard } from "./ui";
import { RangeBars, Rings, NeuroSlider, CategoryDonut, ConcernMap, PackageMix, Spectrum, HoursWeek } from "./charts";
import type { Tool } from "./studio";
import { NIcon } from "@/components/neyu/icons";

export type Tab = "overview" | "studio" | "treatments" | "results" | "packages" | "visit";

function useOpen() {
  const [s, setS] = useState<ReturnType<typeof neaOpenNow> | null>(null);
  useEffect(() => { const f = () => setS(neaOpenNow()); f(); const id = setInterval(f, 60_000); return () => clearInterval(id); }, []);
  return s;
}
export function OpenPill({ dark }: { dark?: boolean }) {
  const s = useOpen();
  if (!s) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, background: dark ? "rgba(255,255,255,.1)" : s.open ? "#EAF4EE" : T.line2, color: dark ? "#F7F5F1" : s.open ? T.good : T.muted, border: dark ? "1px solid rgba(255,255,255,.18)" : 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: s.open ? "#3CCB8A" : "#B9B2A6", animation: s.open ? "segLive 1.8s infinite" : "none" }} />
      {s.open ? "Open now" : "Closed"} · {s.next}
    </span>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────
const STEPS = [
  { icon: "ph-chats-circle", t: "Free consultation", d: "15 minutes with Nea’s team to understand your goals." },
  { icon: "ph-dna", t: "Personal plan", d: "Treatments, skincare and — when it helps — microbiome testing." },
  { icon: "ph-lightning", t: "Treatment", d: "Fotona laser, injectables, facials or body devices." },
  { icon: "ph-arrows-clockwise", t: "Maintain", d: "Follow-ups and a plan that adjusts as your skin changes." },
];
export function Overview({ go, openTool, askSeed, pickCat }: { go: (t: Tab) => void; openTool: (t: Tool) => void; askSeed: (q: string) => void; pickCat: (c: NeaCat) => void }) {
  const [q, setQ] = useState("");
  const [step, setStep] = useState(0);
  useEffect(() => { const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2600); return () => clearInterval(id); }, []);
  const noDown = NEA_DOWNTIME.filter((d) => d.max === 0).length;
  return (
    <div style={{ display: "grid", gap: "clamp(22px,3vw,34px)" }}>
      {/* Futuristic hero */}
      <section style={{ position: "relative", overflow: "hidden", borderRadius: 30, padding: "clamp(26px,5vw,56px)", color: "#F7F5F1", background: "radial-gradient(120% 90% at 85% 10%, #5A3A52 0%, transparent 55%), radial-gradient(90% 80% at 10% 100%, #5B3328 0%, transparent 60%), linear-gradient(150deg,#1A1413 0%,#261B1A 50%,#1C1822 100%)" }}>
        <anra-particles tone="dark" density="7000" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.8 }} />
        <anra-meteors color="233,190,176" count="6" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "clamp(24px,4vw,48px)", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "6px 12px", borderRadius: 999, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)" }}>NEYU partner clinic</span>
              <OpenPill dark />
            </div>
            <h2 style={{ margin: "20px 0 0", fontSize: "clamp(38px,5.6vw,72px)", lineHeight: 1.02, letterSpacing: "-.045em", fontWeight: 500 }}>
              Precision care for<br /><anra-morph words="your skin.|your glow.|your confidence.|your microbiome.|you." gradient="linear-gradient(90deg,#F3C3B2,#E8A08C 45%,#A9D8F0)" />
            </h2>
            <p style={{ margin: "18px 0 0", fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.55, color: "rgba(247,245,241,.78)", maxWidth: 520 }}>Medical aesthetics, Fotona laser and whole-body wellness, physician-managed — with Neyu to help you find the right treatment.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length > 1) askSeed(q.trim()); }} style={{ position: "relative", marginTop: 26, maxWidth: 560, borderRadius: 999 }}>
              <anra-electro radius="30" style={{ position: "absolute", inset: -6, pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 16px", borderRadius: 999, background: "rgba(255,255,255,.96)" }}>
                <AlbaOrb size={24} />
                <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask Neyu about Nea" placeholder="Ask Neyu — “what helps with melasma?”" style={{ flex: 1, minWidth: 0, height: 44, border: 0, outline: "none", background: "transparent", fontSize: 16, color: T.ink }} />
                <button type="submit" aria-label="Ask Neyu" style={{ ...btnInk, height: 44, borderRadius: 999, padding: "0 16px" }}>Ask<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></button>
              </div>
            </form>
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={NEA.book} target="_blank" rel="noopener" style={{ ...btnInk, background: "#F7F5F1", color: T.ink }}>Book at Nea<NIcon name="ph-arrow-up-right" size={18} tone={"currentColor"} /></a>
              <a href={NEA.consult} target="_blank" rel="noopener" style={{ ...btnGhost, color: "#F7F5F1", borderColor: "rgba(247,245,241,.5)" }}>Free 15-min consult<NIcon name="ph-arrow-up-right" size={18} tone={"currentColor"} /></a>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { icon: "ph-magic-wand", t: "Skin Match", d: "Describe your concern — Neyu picks from 24 treatments", tool: "match" as Tool },
              { icon: "ph-chart-polar", t: "Skin Profile", d: "Live fit scores across 8 concerns", tool: "profile" as Tool },
              { icon: "ph-calendar-dots", t: "Timeline Planner", d: "Book-by dates for your big day", tool: "planner" as Tool },
            ].map((x, i) => (
              <button key={x.t} onClick={() => openTool(x.tool)} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", textAlign: "left", padding: "16px 18px", borderRadius: 20, cursor: "pointer", color: "#F7F5F1", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", animation: `fadeUp .5s ${0.15 + i * 0.1}s both`, transition: "background .2s" }} className="nea-glassbtn">
                <span style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(140deg,#2A84E4,#3CC79E)", boxShadow: "0 8px 24px -8px rgba(185,120,106,.8)" }}><NIcon name={x.icon} size={20} tone={"currentColor"} /></span>
                <span><b style={{ display: "block", fontWeight: 500, fontSize: 16 }}>{x.t}</b><span style={{ fontSize: 13.5, color: "rgba(247,245,241,.7)" }}>{x.d}</span></span>
                <NIcon name="ph-arrow-right" size={18} tone={"currentColor"} style={{ opacity: 0.7 }} />
              </button>
            ))}
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(247,245,241,.55)", display: "flex", gap: 8, alignItems: "center" }}><NIcon name="ph-shield-check" size={18} tone={"currentColor"} />Uses only Nea’s published information · not medical advice</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,170px),1fr))", gap: 12 }}>
        <Stat icon="ph-first-aid-kit" value={<CountUp to={NEA_TREATMENTS.length} />} label="treatments, all bookable online" />
        <Stat icon="ph-squares-four" tone={T.teal} value={<CountUp to={NEA_CATS.length} />} label="care categories" />
        <Stat icon="ph-package" tone={T.ai} value={<CountUp to={NEA_PACKAGES.length} />} label="beauty & wellness packages" />
        <Stat icon="ph-smiley" tone={T.good} value={<CountUp to={95} suffix="%" />} label="IntimaLase satisfaction (Nea, up to)" />
        <Stat icon="ph-timer" tone="#B26A12" value={<CountUp to={noDown} />} label="options with no downtime" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 16 }}>
        <ChartCard title="Explore by category" sub="Tap a slice to see those treatments">
          <CategoryDonut onPick={pickCat} />
        </ChartCard>
        <div style={{ ...card, padding: "clamp(18px,2.4vw,24px)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>How a visit works</h3>
          <p style={{ margin: "4px 0 16px", fontSize: 13.5, color: T.muted }}>Every plan starts free</p>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {STEPS.map((s, i) => {
              const on = step === i;
              return (
                <li key={s.t} onMouseEnter={() => setStep(i)} style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: on ? "linear-gradient(150deg,#fff,#FBF1ED)" : T.paper, border: `1px solid ${on ? "#EBCFC6" : T.line2}`, transition: "all .3s" }}>
                  {on && <anra-electro radius="16" style={{ position: "absolute", inset: -5, pointerEvents: "none" }} />}
                  <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: on ? T.ink : T.soft, color: on ? "#fff" : T.deep, transition: "all .3s" }}><NIcon name={s.icon} size={19} tone={"currentColor"} /></span>
                  <span><b style={{ fontWeight: 500, fontSize: 15 }}>{i + 1}. {s.t}</b><span style={{ display: "block", fontSize: 13.5, color: T.muted }}>{s.d}</span></span>
                </li>
              );
            })}
          </ol>
          <div style={{ marginTop: 14 }}><Book small label="Book free consult" href={NEA.consult} /></div>
        </div>
      </section>

      <section style={{ ...card, padding: "clamp(20px,3vw,32px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: "clamp(20px,3vw,40px)", alignItems: "center", background: "linear-gradient(160deg,#FFFFFF,#F7F3EF)" }}>
        <div>
          <div style={eyebrow}>Technology</div>
          <h2 style={{ ...h2, fontSize: "clamp(26px,3vw,38px)" }}>Two wavelengths.<br /><span style={{ color: T.muted }}>Every Fotona application.</span></h2>
          <p style={{ margin: "12px 0 0", color: T.ink2, fontSize: 15.5, lineHeight: 1.55 }}>Nea was one of the first centres to offer Fotona and all of its applications. Er:YAG works at the surface; Nd:YAG reaches deeper. Fotona 4D combines four modes in one visit — including intra-oral tightening with no downtime.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Intra-oral tightening", "Resurfacing", "Skin tightening", "Microlaser peel"].map((m) => <span key={m} style={{ ...chip(false), minHeight: 32, fontSize: 13, cursor: "default" }}><NIcon name="ph-lightning" size={18} tone={T.nea} />{m}</span>)}
          </div>
          <button onClick={() => go("treatments")} style={{ ...btnGhost, marginTop: 18, height: 44 }}>See laser treatments<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></button>
        </div>
        <div style={{ ...glass, borderRadius: 20, padding: "18px 18px 14px" }}>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>Hover a wavelength</div>
          <Spectrum />
        </div>
      </section>

      <section aria-label="All Nea treatments" style={{ overflow: "hidden", borderRadius: 18, background: T.ink, padding: "14px 0", maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)" }}>
        <div className="nea-marquee" style={{ display: "flex", width: "max-content", gap: 28 }}>
          {[0, 1].map((k) => <span key={k} aria-hidden={k === 1} style={{ display: "flex", gap: 28, whiteSpace: "nowrap", color: "#F3E6E1", fontSize: 15 }}>{NEA_TREATMENTS.map((t) => <span key={t.id} style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><NIcon name={t.icon} size={18} tone={"#E8A08C"} />{t.name}</span>)}</span>)}
        </div>
      </section>
    </div>
  );
}

// ── Results & data ───────────────────────────────────────────────────────
export function Results({ open }: { open: (t: NeaTreatment) => void }) {
  const [sortDown, setSortDown] = useState(false);
  const down = sortDown ? [...NEA_DOWNTIME].sort((a, b) => b.max - a.max) : NEA_DOWNTIME;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, color: T.muted, fontSize: 15 }}>Only figures Nea publishes. Your own results depend on your skin and plan.</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,160px),1fr))", gap: 12 }}>
        <Stat icon="ph-smiley" tone={T.good} value={<CountUp to={95} suffix="%" />} label="IntimaLase satisfaction (up to)" />
        <Stat icon="ph-trend-up" tone="#2A78D6" value={<CountUp to={94} suffix="%" />} label="IncontiLase: significant improvement at 120 days" />
        <Stat icon="ph-barbell" tone={T.ai} value={<CountUp to={30} prefix="+" suffix="%" />} label="truSculpt flex: average muscle mass" />
        <Stat icon="ph-hourglass" tone={T.deep} value={<><CountUp to={3} />–6 mo</>} label="neuromodulators last" />
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,460px),1fr))", gap: 16 }}>
        <ChartCard title="Downtime" sub="Days before you’re back to normal" right={<button onClick={() => setSortDown((s) => !s)} aria-pressed={sortDown} title="Sort by longest" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.line}`, background: sortDown ? T.ink : "#fff", color: sortDown ? "#fff" : T.muted, cursor: "pointer", display: "grid", placeItems: "center" }}><NIcon name="ph-sort-descending" size={18} tone={"currentColor"} /></button>}
          table={{ head: ["Treatment", "Downtime"], rows: NEA_DOWNTIME.map((d) => [d.name, d.max === 0 ? "None" : `${d.min}–${d.max} days`]) }}>
          <RangeBars rows={down} unit="days" max={6} color="linear-gradient(90deg,#B4583F,#E08A73)" />
        </ChartCard>
        <ChartCard title="Time in the chair" sub="Minutes per session" table={{ head: ["Treatment", "Minutes"], rows: NEA_SESSION_MIN.map((d) => [d.name, d.min === d.max ? d.max : `${d.min}–${d.max}`]) }}>
          <RangeBars fromZero rows={NEA_SESSION_MIN} unit="min" max={50} color="linear-gradient(90deg,#1C5CAB,#2A78D6)" />
        </ChartCard>
        <ChartCard title="Published outcomes" sub="As reported by Nea" table={{ head: ["Outcome", "Value", "Note"], rows: NEA_OUTCOMES.map((o) => [o.label, `${/muscle/i.test(o.label) ? "+" : ""}${o.value}%`, o.note]) }}>
          <Rings items={NEA_OUTCOMES} />
        </ChartCard>
        <ChartCard title="Anti-wrinkle neuromodulators" sub="Drag to see where you’d be — visible in 24 h, full at 3 days, lasts 3–6 months">
          <NeuroSlider />
        </ChartCard>
      </div>
      <ChartCard title="Concern map" sub="Which treatment focuses on what — tap a row to open it" table={{ head: ["Treatment", "Primary focus"], rows: NEA_TREATMENTS.map((t) => [t.name, t.concerns.slice(0, 3).join(", ")]) }}>
        <ConcernMap onOpen={open} />
      </ChartCard>
      <ChartCard title="Timings Nea publishes" sub="Per treatment, where available" table={{ head: ["Treatment", "Downtime", "Session", "Sessions", "Full effect"], rows: NEA_TREATMENTS.filter((t) => NEA_META[t.id]).map((t) => { const m = NEA_META[t.id]; return [t.name, m.downtime ? (m.downtime[1] ? `${m.downtime[0]}–${m.downtime[1]} d` : "None") : "—", m.sessionMin ? `${m.sessionMin[0]}–${m.sessionMin[1]} min` : "—", m.sessions ? `${m.sessions[0]}–${m.sessions[1]}` : "—", m.onsetDays != null ? (m.onsetDays ? `${m.onsetDays} d` : "Immediate") : "—"]; }) }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 10 }}>
          {NEA_TREATMENTS.filter((t) => NEA_META[t.id]).map((t) => { const m = NEA_META[t.id]; return (
            <button key={t.id} onClick={() => open(t)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 14, border: `1px solid ${T.line2}`, background: T.paper, cursor: "pointer", display: "grid", gap: 6, alignContent: "start" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14.5 }}><NIcon name={t.icon} size={18} tone={T.deep} />{t.name}</span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                {m.downtime && <Tag>{m.downtime[1] ? `${m.downtime[0]}–${m.downtime[1]} days down` : "No downtime"}</Tag>}
                {m.sessionMin && <Tag>{m.sessionMin[0] === m.sessionMin[1] ? m.sessionMin[0] : `${m.sessionMin[0]}–${m.sessionMin[1]}`} min</Tag>}
                {m.sessions && <Tag>{m.sessions[0] === m.sessions[1] ? m.sessions[0] : `${m.sessions[0]}–${m.sessions[1]}`} sessions</Tag>}
                {m.courseWeeks && <Tag>over {m.courseWeeks} weeks</Tag>}
                {m.onsetDays != null && <Tag>{m.onsetDays ? `full in ${m.onsetDays} days` : "immediate"}</Tag>}
                {m.lastsMonths && <Tag>lasts {m.lastsMonths[0] ? `${m.lastsMonths[0]}–` : "up to "}{m.lastsMonths[1]} mo</Tag>}
              </span>
            </button>
          ); })}
        </div>
      </ChartCard>
    </div>
  );
}
const Tag = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 8, background: "#fff", border: `1px solid ${T.line}`, color: T.ink2 }}>{children}</span>;

// ── Packages ─────────────────────────────────────────────────────────────
const GOALS: { l: string; ids: string[] }[] = [
  { l: "Look younger", ids: ["anti-aging", "rejuvenation"] }, { l: "Glowing skin", ids: ["glow", "facial"] }, { l: "Acne scars", ids: ["scarring"] },
  { l: "Hair", ids: ["hair", "laser-hair"] }, { l: "Weight & nutrition", ids: ["nutrition"] }, { l: "Sport & strength", ids: ["sports"] },
  { l: "Joint pain", ids: ["arthritis"] }, { l: "Women’s health", ids: ["feminine"] }, { l: "Heart", ids: ["heart"] }, { l: "Sleep & snoring", ids: ["sleep"] },
];
export function Packages() {
  const [group, setGroup] = useState<"all" | "Beauty" | "Wellness">("all");
  const [goal, setGoal] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const hit = GOALS.find((g) => g.l === goal)?.ids || [];
  const packs = NEA_PACKAGES.filter((p) => group === "all" || p.group === group).sort((a, b) => Number(hit.includes(b.id)) - Number(hit.includes(a.id)));
  const pick = (id: string) => { setOpenId(id); setTimeout(() => document.getElementById("pk-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const microTests = ["the-bioskin-test", "the-biogut-test", "the-biofemme-test"].map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean) as typeof LAB_TESTS;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...card, padding: "clamp(18px,2.6vw,26px)", background: "linear-gradient(150deg,#fff,#F7F2FB 60%,#FBEFEA)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><AlbaOrb size={26} /><b style={{ fontWeight: 500, fontSize: 17 }}>Package finder</b></div>
        <p style={{ margin: "6px 0 12px", fontSize: 14, color: T.muted }}>What’s your goal? Neyu brings the best-fitting packages to the top.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{GOALS.map((g) => <button key={g.l} onClick={() => { setGoal(goal === g.l ? null : g.l); setGroup("all"); }} aria-pressed={goal === g.l} style={{ ...chip(goal === g.l), minHeight: 36, fontSize: 13.5 }}>{g.l}</button>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,460px),1fr))", gap: 16, alignItems: "start" }}>
        <ChartCard title="What’s inside each package" sub="Tap a row to open it" table={{ head: ["Package", "Group", "Includes"], rows: NEA_PACKAGES.map((p) => [p.name, p.group, p.tiers.map((t) => t.items.join(", ")).join(" | ")]) }}>
          <PackageMix onPick={pick} />
        </ChartCard>
        <div style={{ display: "grid", gap: 12 }}>
          <Segmented label="Package group" value={group} onChange={setGroup} options={[{ v: "all", label: `All · ${NEA_PACKAGES.length}` }, { v: "Beauty", label: "Beauty", icon: "ph-sparkle" }, { v: "Wellness", label: "Wellness", icon: "ph-heartbeat" }]} />
          {packs.map((p) => {
            const isOpen = openId === p.id, rec = hit.includes(p.id), beauty = p.group === "Beauty";
            const count = p.tiers[p.tiers.length - 1].items.length;
            return (
              <article key={p.id} id={"pk-" + p.id} style={{ ...card, position: "relative", padding: 0, overflow: "visible", borderColor: rec ? "#D9C8EE" : T.line }}>
                {rec && <anra-electro radius="22" style={{ position: "absolute", inset: -5, pointerEvents: "none" }} />}
                <button onClick={() => setOpenId(isOpen ? null : p.id)} aria-expanded={isOpen} style={{ width: "100%", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "16px 18px", border: 0, background: "none", cursor: "pointer", textAlign: "left" }}>
                  <Icon name={p.icon} bg={beauty ? T.soft : "#E8F2F4"} color={beauty ? T.deep : T.teal} />
                  <span><b style={{ fontWeight: 500, fontSize: 17, display: "flex", gap: 8, alignItems: "center" }}>{p.name}{rec && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#F1EAFA", color: T.violet, fontWeight: 500 }}>Neyu pick</span>}</b><span style={{ fontSize: 13, color: T.muted }}>{p.group} · {p.tiers.length > 1 ? `${p.tiers.length} options` : `${count} components`}</span></span>
                  <NIcon name="ph-caret-down" size={18} tone={T.muted} style={{ transition: "transform .25s", transform: isOpen ? "rotate(180deg)" : "none", }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 18px", display: "grid", gap: 10, animation: "fadeUp .25s" }}>
                    {p.tiers.map((tier, i) => (
                      <div key={i} style={{ padding: tier.name ? "12px 14px" : 0, borderRadius: 14, background: tier.name ? T.paper : "transparent", border: tier.name ? `1px solid ${T.line2}` : "none" }}>
                        {tier.name && <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{tier.name}</div>}
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>{tier.items.map((it) => <li key={it} style={{ display: "flex", gap: 8, fontSize: 14, color: T.ink2, lineHeight: 1.4 }}><NIcon name="ph-check-circle" size={18} tone={beauty ? T.nea : T.teal} style={{ marginTop: 2 }} />{it}</li>)}</ul>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}><Book small label="Book consult" href={NEA.consult} /><Book small ghost label="Book online" /></div>
                  </div>
                )}
              </article>
            );
          })}
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>Package pricing is shared at consultation. <a href={NEA.booklet} target="_blank" rel="noopener" style={{ color: T.deep }}>Nea’s package booklet (PDF)</a> · <a href={NEA.packagesPage} target="_blank" rel="noopener" style={{ color: T.deep }}>Packages on Nea’s site</a></p>
        </div>
      </div>
      <div style={{ ...card, padding: "clamp(20px,3vw,32px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 22, alignItems: "center", background: "linear-gradient(160deg,#FFFFFF,#EEF5F6)" }}>
        <div>
          <div style={eyebrow}>The inside-out approach</div>
          <h2 style={{ ...h2, fontSize: "clamp(24px,3vw,34px)" }}>Your skin starts with your microbiome.</h2>
          <p style={{ margin: "10px 0 0", color: T.ink2, fontSize: 15.5 }}>Many Nea packages include microbiome testing with a dietitian consultation. These tests are run by BioAro Labs.</p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {microTests.map((t) => (
            <a key={t.id} href={t.url("CA")} target="_blank" rel="noopener" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: "#fff", border: `1px solid ${T.line}`, color: T.ink, textDecoration: "none" }}>
              <span><b style={{ fontWeight: 500 }}>{t.name}</b><br /><span style={{ fontSize: 13, color: T.muted }}>{t.why}</span></span>
              <span style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{money(t.price)} <NIcon name="ph-arrow-up-right" size={18} tone={"currentColor"} /></span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Visit ────────────────────────────────────────────────────────────────
export function Visit({ askSeed }: { askSeed: (q: string) => void }) {
  const s = useOpen();
  const [faq, setFaq] = useState<number | null>(0);
  const row = (icon: string, content: React.ReactNode, href?: string) => {
    const inner = <><Icon name={icon} box={36} size={18} /><span>{content}</span></>;
    const st: React.CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", color: T.ink2, textDecoration: "none", fontSize: 15.5 };
    return href ? <a href={href} style={st}>{inner}</a> : <div style={st}>{inner}</div>;
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 16 }}>
        <div style={{ ...card, padding: "clamp(20px,3vw,28px)", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div style={eyebrow}>Visit Nea</div><OpenPill /></div>
          <h2 style={{ ...h2, fontSize: "clamp(24px,3vw,32px)", margin: 0 }}>{NEA.legal}</h2>
          {row("ph-map-pin", NEA.address, "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent("3151 27 St NE, Calgary, AB"))}
          {row("ph-phone", NEA.phone, NEA.tel)}
          {row("ph-envelope-simple", NEA.email, "mailto:" + NEA.email)}
          {row("ph-user-circle", NEA.founder)}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Book /><a href={NEA.site} target="_blank" rel="noopener" style={btnGhost}>neaprecisionskin.com<NIcon name="ph-arrow-up-right" size={18} tone={"currentColor"} /></a></div>
        </div>
        <div style={{ ...card, padding: "clamp(20px,3vw,28px)" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>Opening hours</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13.5, color: T.muted }}>Calgary time{s ? ` · ${s.open ? "open now" : "closed now"}` : ""}</p>
          <HoursWeek today={s?.day ?? -1} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.faint, marginTop: 8, paddingLeft: 48, paddingRight: 102 }}><span>6 AM</span><span>1 PM</span><span>8 PM</span></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ ...card, padding: "clamp(18px,2.6vw,26px)" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 500 }}>Common questions</h3>
          {NEA_FAQ.map((f, i) => (
            <div key={f.q} style={{ borderTop: i ? `1px solid ${T.line2}` : 0 }}>
              <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "14px 0", border: 0, background: "none", cursor: "pointer", textAlign: "left", fontSize: 15.5, color: T.ink }}>{f.q}<NIcon name="ph-plus" size={18} tone={T.deep} style={{ transition: "transform .25s", transform: faq === i ? "rotate(45deg)" : "none", }} /></button>
              {faq === i && <p style={{ margin: "0 0 14px", fontSize: 14.5, color: T.ink2, lineHeight: 1.55, animation: "fadeUp .2s" }}>{f.a}</p>}
            </div>
          ))}
          <button onClick={() => askSeed("")} style={{ ...btnGhost, border: 0, color: T.violet, padding: 0, height: 40 }}><NIcon name="ph-sparkle" size={18} tone={"currentColor"} />Ask Neyu something else</button>
        </div>
        <iframe title="Nea Precision Skin map" loading="lazy" src="https://www.google.com/maps?q=3151%2027%20St%20NE%2C%20Calgary%2C%20AB&output=embed" style={{ width: "100%", minHeight: 380, border: 0, borderRadius: 22 }} />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: T.muted, display: "flex", gap: 8 }}><NIcon name="ph-info" size={18} tone={"currentColor"} />Treatments are provided and booked by Nea Precision Skin, a separate clinic partnered with NEYU Health. Information from neaprecisionskin.com; not medical advice. In an emergency call 911.</p>
    </div>
  );
}
