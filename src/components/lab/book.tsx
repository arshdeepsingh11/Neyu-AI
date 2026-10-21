"use client";

// Research Library — the papers behind the Longevity Lab as a 3D page-turning
// book. Left page: the study. Right page: what it found and what it means.
// Arrows / keyboard / swipe to turn. One page at a time on phones.
import React, { useEffect, useRef, useState } from "react";
import { PAPERS, type Paper } from "@/data/longevityScience";
import { T } from "@/components/nea/ui";
import { NIcon } from "@/components/neyu/icons";
import { N } from "@/components/neyu/kit";

// Every page has the same fixed height, so the book never changes size between chapters;
// a long page scrolls inside itself.
const PAGE_H = "clamp(560px, 64vh, 640px)";
const paper: React.CSSProperties = { background: "linear-gradient(180deg,#FFFFFF,#F7FAF9)", padding: "clamp(20px,3vw,34px)", display: "grid", alignContent: "start", gap: 14, height: PAGE_H, boxSizing: "border-box", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(14,27,44,.18) transparent", fontSize: 15.5, lineHeight: 1.6, color: "#2B2F33", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" };
const kicker: React.CSSProperties = { fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: 11.5, letterSpacing: ".18em", textTransform: "uppercase", color: N.tealText };

function Left({ p, n }: { p: Paper; n: number }) {
  return (
    <div style={{ ...paper, borderRadius: "18px 0 0 18px", boxShadow: "inset -18px 0 30px -24px rgba(14,27,44,.28)" }}>
      <span style={kicker}>Chapter {n} · {p.short}</span>
      <h3 style={{ margin: 0, fontSize: "clamp(20px,2.2vw,26px)", lineHeight: 1.2, fontWeight: 500, color: "#14181B" }}>{p.title}</h3>
      <span style={{ fontSize: 13.5, color: T.muted, fontStyle: "italic" }}>{p.authors} · <b style={{ fontStyle: "normal", fontWeight: 600 }}>{p.journal}</b>, {p.year}</span>
      <div style={{ height: 1, background: "linear-gradient(90deg,rgba(31,167,180,.45),transparent)" }} />
      <span style={kicker}>The study</span>
      <p style={{ margin: 0 }}>{p.design}</p>
      <a href={p.url} target="_blank" rel="noopener" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: N.blue, textDecoration: "none", marginTop: 6 }}>Read the paper ↗</a>
    </div>
  );
}
function Right({ p, onFeature }: { p: Paper; onFeature?: (f: string) => void }) {
  return (
    <div style={{ ...paper, borderRadius: "0 18px 18px 0", boxShadow: "inset 18px 0 30px -24px rgba(14,27,44,.28)" }}>
      <span style={kicker}>What they found</span>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, listStyle: "disc" }}>{p.findings.map((f) => <li key={f.slice(0, 30)}>{f}</li>)}</ul>
      <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(47,191,148,.08)", borderLeft: "3px solid #2FBF94" }}><span style={{ ...kicker, color: "#1E9C78" }}>What it means</span><div>{p.means}</div></div>
      <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(178,106,18,.08)", borderLeft: "3px solid #B26A12" }}><span style={{ ...kicker, color: "#B26A12" }}>What it doesn’t mean</span><div>{p.notMeans}</div></div>
      {onFeature && <button onClick={() => onFeature(p.feature[0])} style={{ justifySelf: "start", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: N.blue }}>Explore this in the Lab →</button>}
    </div>
  );
}

export default function ResearchBook({ onFeature }: { onFeature?: (f: string) => void }) {
  const [i, setI] = useState(0);
  const [turn, setTurn] = useState<0 | 1 | -1>(0);
  const [narrow, setNarrow] = useState(false);
  const [side, setSide] = useState<"l" | "r">("l"); // phones: which page of the spread
  const sw = useRef<number | null>(null);
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 820); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const go = (d: 1 | -1) => {
    if (narrow) {
      if (d === 1 && side === "l") return setSide("r");
      if (d === -1 && side === "r") return setSide("l");
    }
    const n = i + d; if (n < 0 || n >= PAPERS.length || turn) return;
    setTurn(d);
    setTimeout(() => { setI(n); setSide(d === 1 ? "l" : "r"); setTurn(0); }, 520);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const p = PAPERS[i];
  const nextP = PAPERS[Math.min(i + 1, PAPERS.length - 1)], prevP = PAPERS[Math.max(i - 1, 0)];
  const atStart = i === 0 && (!narrow || side === "l"), atEnd = i === PAPERS.length - 1 && (!narrow || side === "r");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {PAPERS.map((x, k) => <button key={x.id} onClick={() => { setI(k); setSide("l"); }} aria-current={k === i} style={{ flex: "none", minHeight: 36, padding: "0 14px", borderRadius: 999, border: `1px solid ${k === i ? N.ink : N.line}`, background: k === i ? N.ink : "#fff", color: k === i ? "#fff" : T.ink2, fontSize: 13, cursor: "pointer" }}>{k + 1}. {x.short}</button>)}
      </div>
      <div
        onTouchStart={(e) => { sw.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (sw.current == null) return; const dx = e.changedTouches[0].clientX - sw.current; sw.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
        style={{ position: "relative", perspective: 2200, filter: "drop-shadow(0 40px 50px rgba(14,27,44,.18))", touchAction: "pan-y" }}>
        {narrow ? (
          <div key={i + side} style={{ animation: "fadeUp .35s ease" }}>{side === "l" ? <Left p={p} n={i + 1} /> : <Right p={p} onFeature={onFeature} />}</div>
        ) : (
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <Left p={turn === -1 ? prevP : p} n={(turn === -1 ? i - 1 : i) + 1} />
            <Right p={turn === 1 ? nextP : p} onFeature={onFeature} />
            <div aria-hidden style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, transform: "translateX(-1px)", background: "linear-gradient(180deg,transparent,rgba(14,27,44,.22),transparent)" }} />
            {turn !== 0 && (
              <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, width: "50%", left: turn === 1 ? "50%" : 0, transformOrigin: turn === 1 ? "left center" : "right center", transformStyle: "preserve-3d", animation: `${turn === 1 ? "bookNext" : "bookPrev"} .52s cubic-bezier(.45,.05,.3,1) forwards` }}>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>{turn === 1 ? <Right p={p} /> : <Left p={p} n={i + 1} />}</div>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>{turn === 1 ? <Left p={nextP} n={i + 2} /> : <Right p={prevP} />}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes bookNext{from{transform:rotateY(0)}to{transform:rotateY(-180deg)}}@keyframes bookPrev{from{transform:rotateY(0)}to{transform:rotateY(180deg)}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => go(-1)} disabled={atStart} aria-label="Previous page" style={{ width: 48, height: 48, borderRadius: 24, border: `1px solid ${T.line}`, background: "#fff", cursor: "pointer", opacity: atStart ? 0.35 : 1 }}><NIcon name="arrowLeft" size={18} tone={N.ink} style={{ margin: "auto" }} /></button>
        <span style={{ fontSize: 13, color: T.muted }}>{narrow ? `Page ${i * 2 + (side === "l" ? 1 : 2)} of ${PAPERS.length * 2}` : `Spread ${i + 1} of ${PAPERS.length}`} · swipe or use ← →</span>
        <button onClick={() => go(1)} disabled={atEnd} aria-label="Next page" style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: "linear-gradient(135deg,#2FBF94,#2273D6)", color: "#fff", cursor: "pointer", opacity: atEnd ? 0.35 : 1 }}><NIcon name="arrow" size={18} tone="light" style={{ margin: "auto" }} /></button>
      </div>
    </div>
  );
}
