"use client";

// Home 08 (last): "Health, in motion" — a 3D scroll-trigger marquee.
// Two tilted rows glide in opposite directions; scrolling the page speeds
// them up (and flips direction when you scroll back up), and cards lean
// with the motion. Hover a row to pause it. Content is what NEYU actually
// has: words from medicine, BioAro Labs tests, Neyu prompts, clinic facts.
// Respects prefers-reduced-motion (rows become swipeable, no autoplay).

import React, { useEffect, useRef } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { NIcon } from "@/components/neyu/icons";

type Card =
  | { kind: "quote"; text: string; who: string; role: string }
  | { kind: "ai"; ask: string; note: string }
  | { kind: "test"; name: string; why: string; price: string; url: string }
  | { kind: "fact"; big: string; text: string; icon: string };

// Widely quoted lines from medicine (attributed as commonly cited).
const QUOTES: Card[] = [
  { kind: "quote", text: "The good physician treats the disease; the great physician treats the patient who has the disease.", who: "Sir William Osler", role: "Physician, co-founder of Johns Hopkins Hospital" },
  { kind: "quote", text: "Listen to your patient; he is telling you the diagnosis.", who: "Sir William Osler", role: "Father of modern medicine" },
  { kind: "quote", text: "A vigorous five-mile walk will do more good for an unhappy but otherwise healthy adult than all the medicine and psychology in the world.", who: "Paul Dudley White", role: "Pioneer of preventive cardiology" },
  { kind: "quote", text: "Walking is man's best medicine.", who: "Hippocrates", role: "Father of medicine" },
];

const FACTS: Card[] = [
  { kind: "fact", big: "100,000", text: "times a day your heart beats — quietly, for a lifetime.", icon: "ph-heartbeat" },
  { kind: "fact", big: "1st", text: "onsite Exercise Stress Echocardiogram program in Alberta — at NEYU.", icon: "ph-pulse" },
  { kind: "fact", big: "9", text: "specialties sharing one connected record, so nothing is seen in isolation.", icon: "ph-stethoscope" },
  { kind: "fact", big: "2", text: "Calgary clinics — North East and Meadow Miles.", icon: "ph-map-pin" },
];

const AI: Card[] = [
  { kind: "ai", ask: "What does a high LDL mean for my heart?", note: "Neyu explains results in plain language" },
  { kind: "ai", ask: "Is an exercise stress echo right for me?", note: "Neyu prepares you for your visit" },
  { kind: "ai", ask: "Which genetic test fits a family history of heart disease?", note: "Neyu guides — it never diagnoses" },
  { kind: "ai", ask: "How do I get a cardiology referral?", note: "Neyu finds your next step" },
];

const TEST_IDS = ["high-sensitive-crp-hs-crp", "core-inflammation-aging", "gdf-15", "pharmacogenomics-test", "whole-genome-sequencing-30x"];
const TESTS: Card[] = TEST_IDS.map((s) => LAB_TESTS.find((t) => t.id === "labs-" + s)).filter(Boolean).map((t) => ({
  kind: "test" as const, name: t!.name, why: t!.why, price: money(t!.price), url: t!.url("CA"),
}));

// Interleave so each row mixes kinds.
const ROW_A: Card[] = [QUOTES[0], FACTS[0], AI[0], QUOTES[2], FACTS[1], AI[1], FACTS[2]];
const ROW_B: Card[] = [TESTS[0], AI[2], QUOTES[1], TESTS[1], FACTS[3], AI[3], TESTS[2], QUOTES[3], TESTS[3]].filter(Boolean);

function CardView({ c, onAsk }: { c: Card; onAsk: (q: string) => void }) {
  const base: React.CSSProperties = { flex: "none", width: 340, minHeight: 190, borderRadius: 22, padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 12, border: "1px solid #E7E2DA", background: "rgba(253,252,250,.96)", boxShadow: "0 30px 60px -36px rgba(20,24,27,.45)", textAlign: "left" };
  if (c.kind === "quote")
    return (
      <figure style={{ ...base, margin: 0 }}>
        <NIcon name="ph-quotes" size={26} tone={"#6EA8B6"} />
        <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "#1D2327", flex: 1 }}>{c.text}</blockquote>
        <figcaption style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{c.who}</span>
          <span style={{ fontSize: 12, color: "#5A626A" }}>{c.role}</span>
        </figcaption>
      </figure>
    );
  if (c.kind === "ai")
    return (
      <button onClick={() => onAsk(c.ask)} className="anra-motion-ai" style={{ ...base, cursor: "pointer", border: "1px solid rgba(42,132,228,.35)", background: "linear-gradient(160deg,#F4F0FA 0%,#FDFCFA 60%)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlbaOrb size={30} />
          <span style={{ fontSize: 12, letterSpacing: ".14em", fontWeight: 700, color: "#163F6E" }}>ASK Neyu · AI</span>
        </span>
        <span style={{ fontSize: 18, lineHeight: 1.4, color: "#1D2327", flex: 1 }}>“{c.ask}”</span>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#5F4A8A" }}>{c.note}<NIcon name="ph-arrow-up-right" size={16} tone="currentColor" /></span>
      </button>
    );
  if (c.kind === "test")
    return (
      <a href={c.url} target="_blank" rel="noopener noreferrer" className="anra-motion-test" style={{ ...base, textDecoration: "none", color: "inherit" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: ".12em", fontWeight: 700, color: "#2F5A66" }}><NIcon name="ph-flask" size={16} tone="currentColor" />BIOARO LABS</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1D2327" }}>{c.price}</span>
        </span>
        <span style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 500, color: "#1D2327" }}>{c.name}</span>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "#454C52", flex: 1 }}>{c.why}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#3F6F7C", display: "flex", alignItems: "center", gap: 6 }}>View test<NIcon name="ph-arrow-right" size="1em" tone="currentColor" /></span>
      </a>
    );
  return (
    <div style={{ ...base, background: "linear-gradient(160deg,#E8F2F4 0%,#FDFCFA 65%)" }}>
      <i className={"ph-fill " + c.icon} style={{ fontSize: 24, color: "#3F6F7C" }} />
      <span style={{ fontSize: 44, lineHeight: 1, fontWeight: 300, letterSpacing: "-.03em", color: "#1D2327" }}>{c.big}</span>
      <span style={{ fontSize: 15, lineHeight: 1.5, color: "#3A4147" }}>{c.text}</span>
    </div>
  );
}

function Row({ cards, dir, vel, onAsk }: { cards: Card[]; dir: 1 | -1; vel: React.MutableRefObject<number>; onAsk: (q: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const hover = useRef(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.45 : 1;
    let x = 0, raf = 0, last = 0, visible = true, skew = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "200px" });
    io.observe(el);
    const step = (t: number) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      if (visible) {
        const half = el.scrollWidth / 2;
        const v = vel.current; // page scroll velocity (px/frame, smoothed)
        const boost = Math.max(-6, Math.min(6, v * 0.35));
        const base = hover.current ? 0 : 38 * calm; // px/sec
        const speed = (base + Math.abs(boost) * 60) * dir * (boost < -0.2 ? -1 : 1);
        x -= speed * dt;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        skew += (Math.max(-7, Math.min(7, -boost * 1.4 * dir)) - skew) * 0.12;
        el.style.transform = `translate3d(${x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [dir, vel]);

  return (
    <div className="anra-motion-row" onMouseEnter={() => (hover.current = true)} onMouseLeave={() => (hover.current = false)}>
      <div ref={track} style={{ display: "flex", gap: 20, width: "max-content", willChange: "transform" }}>
        {[...cards, ...cards].map((c, i) => <div key={i} aria-hidden={i >= cards.length ? true : undefined}><CardView c={c} onAsk={onAsk} /></div>)}
      </div>
    </div>
  );
}

export default function HealthInMotion() {
  const { openAlba } = useAlba();
  const vel = useRef(0);

  // Smoothed page-scroll velocity shared by both rows.
  useEffect(() => {
    let lastY = window.scrollY, raf = 0;
    const tick = () => {
      const y = window.scrollY;
      vel.current += ((y - lastY) - vel.current) * 0.15;
      lastY = y;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section data-screen-label="Home 08 Health in motion" aria-labelledby="motion-title" style={{ position: "relative", overflow: "hidden", padding: "clamp(64px,9vw,120px) 0 clamp(72px,10vw,130px)", background: "radial-gradient(900px 420px at 50% 0%, rgba(42,132,228,.14), transparent 70%), radial-gradient(800px 400px at 50% 100%, rgba(110,168,182,.14), transparent 70%)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)", textAlign: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px 0 6px", borderRadius: 999, background: "rgba(253,252,250,.9)", border: "1px solid #D6EEF6", fontSize: 12, letterSpacing: ".14em", fontWeight: 700, color: "#163F6E" }}>
          <AlbaOrb size={22} />AI · MEDICINE · SCIENCE
        </span>
        <h2 id="motion-title" style={{ margin: "18px 0 0", fontSize: "clamp(34px,5.4vw,64px)", lineHeight: 1.04, letterSpacing: "-.04em", fontWeight: 500 }}>
          Health, <span className="anra-ai-text">in motion.</span>
        </h2>
        <p style={{ margin: "14px auto 0", maxWidth: 620, fontSize: 18, lineHeight: 1.55, color: "#3A4147" }}>
          Timeless medicine, precise BioAro testing and Neyu’s AI — moving together. Scroll to speed it up; tap an Neyu card to ask.
        </p>
      </div>

      <div className="anra-motion-stage" style={{ marginTop: "clamp(36px,5vw,64px)" }}>
        <div className="anra-motion-tilt">
          <Row cards={ROW_A} dir={1} vel={vel} onAsk={openAlba} />
          <Row cards={ROW_B} dir={-1} vel={vel} onAsk={openAlba} />
        </div>
      </div>

      <div style={{ marginTop: "clamp(28px,4vw,48px)", display: "flex", justifyContent: "center", padding: "0 20px" }}>
        <button onClick={() => openAlba()} className="anra-action" style={{ minHeight: 52, padding: "0 20px 0 10px" }}>
          <span className="ic" style={{ background: "#F0ECF7" }}><AlbaOrb size={22} /></span>Ask Neyu anything<i className="ph ph-arrow-right ar" />
        </button>
      </div>
    </section>
  );
}
