"use client";

// Neyu design kit — "Japanese-inspired minimalism + premium health technology":
// generous white space, a very limited palette (navy ink + the NEYU green→teal→blue),
// flowing connection lines, live nodes and charts, and Neyu (the AI) in every section.
import React, { useEffect, useId, useRef, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import AnraEl from "@/components/AnraEl";
import { useAlba } from "@/components/AlbaContext";
import { isEmergency } from "@/data/homeContent";
import { CountUp, useInView } from "@/components/nea/ui";
import { NIcon, SvgIcon } from "./icons";
import { NChart } from "./charts";

export const N = {
  ink: "#0E1B2C", ink2: "#33465A", muted: "#5E6B78", faint: "#66727E",
  paper: "#F7F6F2", card: "#FFFFFF", line: "#E2E6E8", line2: "#EEF1F2",
  mint: "#86E0A0", green: "#3CC79E", teal: "#28B8BE", tealText: "#0F7A80", blue: "#2A84E4", deep: "#1D5FA8", warn: "#B4472A",
  grad: "linear-gradient(120deg,#3CC79E 0%,#28B8BE 45%,#2A84E4 100%)",
  soft: "linear-gradient(160deg,#FFFFFF 0%,#F2FAF7 50%,#EEF6FB 100%)",
};
export const gradText: React.CSSProperties = { background: "linear-gradient(90deg,#3CC79E,#28B8BE,#2A84E4,#3CC79E)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "aiText 7s linear infinite" };
// Right padding grows only when the desktop nav rail would overlap the content (see --neyu-pr in anra.css).
export const wrapN: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", paddingLeft: "clamp(16px,4vw,40px)", paddingRight: "var(--neyu-pr, clamp(16px,4vw,40px))", boxSizing: "border-box", width: "100%" };
export const cardN: React.CSSProperties = { background: N.card, border: `1px solid ${N.line}`, borderRadius: 24, boxShadow: "0 1px 2px rgba(14,27,44,.04), 0 30px 60px -44px rgba(14,27,44,.35)" };
export const btn = (kind: "ink" | "grad" | "ghost" = "ink"): React.CSSProperties => ({
  height: 50, padding: "0 22px", borderRadius: 999, border: kind === "ghost" ? `1px solid ${N.ink}` : 0, cursor: "pointer", textDecoration: "none",
  background: kind === "ink" ? N.ink : kind === "grad" ? N.grad : "transparent", color: kind === "ghost" ? N.ink : "#FFFFFF",
  fontSize: 14, fontWeight: 500, letterSpacing: ".04em", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, whiteSpace: "nowrap",
  boxShadow: kind === "grad" ? "0 18px 36px -18px rgba(42,132,228,.7)" : "none",
});
export const eyebrowN: React.CSSProperties = { fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 };
export const h2N: React.CSSProperties = { margin: "12px 0 0", fontSize: "clamp(32px,4.4vw,56px)", lineHeight: 1.04, letterSpacing: "-.035em", fontWeight: 500, color: N.ink };
export const leadN: React.CSSProperties = { margin: "16px 0 0", fontSize: "clamp(16.5px,1.5vw,19px)", lineHeight: 1.6, color: N.ink2, maxWidth: 640 };

/** A full-width section with consistent rhythm. */
export function Section({ id, eyebrow, title, lead, children, center, tone = "paper", label }: { id?: string; eyebrow?: React.ReactNode; title?: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode; center?: boolean; tone?: "paper" | "white" | "dark" | "soft"; label?: string }) {
  const bg = tone === "dark" ? "radial-gradient(900px 500px at 85% 0%, rgba(42,132,228,.28), transparent 60%), radial-gradient(800px 500px at 0% 100%, rgba(60,199,158,.22), transparent 60%), #0B1624" : tone === "white" ? "#FFFFFF" : tone === "soft" ? N.soft : "transparent";
  const dark = tone === "dark";
  return (
    <section id={id} data-screen-label={label} style={{ position: "relative", background: bg, color: dark ? "#EAF2F6" : N.ink, padding: "clamp(64px,9vw,120px) 0", overflow: "hidden" }}>
      <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "clamp(28px,4vw,48px)" }}>
        {(eyebrow || title || lead) && (
          <header style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 0, justifyItems: center ? "center" : "start", textAlign: center ? "center" : "left" }}>
            {eyebrow && <div style={{ ...eyebrowN, color: dark ? "#7EE0C0" : N.tealText }}>{eyebrow}</div>}
            {title && <h2 style={{ ...h2N, color: dark ? "#FFFFFF" : N.ink, maxWidth: 900 }}>{title}</h2>}
            {lead && <p style={{ ...leadN, color: dark ? "rgba(234,242,246,.78)" : N.ink2, marginLeft: center ? "auto" : 0, marginRight: center ? "auto" : 0 }}>{lead}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** Eyebrow + "Neyu · AI" badge on one baseline (they never sit at different heights). */
export function Kicker({ label, badge = "Neyu · AI", dark }: { label: React.ReactNode; badge?: string; dark?: boolean }) {
  return <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", minHeight: 28 }}><span style={{ ...eyebrowN, color: dark ? "#7EE0C0" : N.tealText, lineHeight: 1 }}>{label}</span>{badge && <AiBadge label={badge} dark={dark} />}</div>;
}

/** "Neyu · AI" badge — marks every AI touchpoint. */
export function AiBadge({ label = "Neyu · AI", dark }: { label?: string; dark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 6px", borderRadius: 999, fontSize: 11.5, lineHeight: 1, verticalAlign: "middle", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600, color: dark ? "#BDEFE0" : N.deep, background: dark ? "rgba(255,255,255,.08)" : "rgba(42,132,228,.08)", border: `1px solid ${dark ? "rgba(255,255,255,.16)" : "rgba(42,132,228,.18)"}` }}>
      <AlbaOrb size={16} motion={false} />{label}
    </span>
  );
}

/** NEYU chart in a quiet card (ecg, bp, ldl, glucose, activity, trend, dna, echo, bars, aqhi, hr, timeline, signal, sleepbp, microbiome, hrv…). */
export function LiveChart({ mode, param, height = 220, label, dark }: { mode: string; param?: number; height?: number | string; label?: string; dark?: boolean }) {
  return (
    <div style={{ position: "relative", height, borderRadius: 16, background: dark ? "rgba(255,255,255,.03)" : "#FFFFFF", border: `1px solid ${dark ? "rgba(255,255,255,.1)" : N.line2}`, padding: "12px 14px", boxSizing: "border-box", minWidth: 0 }}>
      <NChart mode={mode} param={param} height="100%" dark={dark} label={label} />
    </div>
  );
}

/** Stat with count-up. */
export function StatN({ value, suffix = "", prefix = "", label, dark, decimals }: { value: number; suffix?: string; prefix?: string; label: string; dark?: boolean; decimals?: number }) {
  return (
    <div style={{ display: "grid", gap: 4, padding: "6px 0" }}>
      <b style={{ fontWeight: 400, fontSize: "clamp(34px,4vw,52px)", letterSpacing: "-.04em", lineHeight: 1, ...gradText }}>{decimals ? `${prefix}${value.toFixed(decimals)}${suffix}` : <CountUp to={value} prefix={prefix} suffix={suffix} />}</b>
      <span style={{ fontSize: 14, color: dark ? "rgba(234,242,246,.7)" : N.muted, lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

/** Flowing connection lines — the NEYU visual metaphor. Decorative. */
export function FlowLines({ opacity = 0.55, dark }: { opacity?: number; dark?: boolean }) {
  const id = useId().replace(/:/g, "");
  const paths = ["M-50 420 C 220 300, 420 520, 700 360 S 1100 220, 1300 300", "M-50 300 C 260 180, 480 420, 760 260 S 1120 120, 1300 180", "M-50 520 C 240 460, 520 600, 800 470 S 1100 380, 1300 440", "M-50 200 C 300 120, 520 260, 820 160 S 1120 60, 1300 100"];
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity }}>
      <defs><linearGradient id={`${id}f`} x1="0" x2="1"><stop offset="0" stopColor="#3CC79E" stopOpacity="0" /><stop offset=".3" stopColor="#3CC79E" /><stop offset=".7" stopColor="#2A84E4" /><stop offset="1" stopColor="#2A84E4" stopOpacity="0" /></linearGradient></defs>
      {paths.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={dark ? "rgba(255,255,255,.08)" : "rgba(14,27,44,.06)"} strokeWidth="1" />
          <path d={d} fill="none" stroke={`url(#${id}f)`} strokeWidth={1.4} strokeDasharray="120 1100" style={{ animation: `neyuFlow ${9 + i * 2}s linear ${i * 1.3}s infinite` }} />
        </g>
      ))}
    </svg>
  );
}

export type NetNode = { id: string; label: string; sub?: string; x: number; y: number; icon?: string; color?: string; r?: number };
/** Live node network (SVG, viewBox 1000×600): orbit rings round the centre, hairline links,
 *  signals travelling along the active links, and every node a button with a NEYU icon. */
export function NodeNet({ nodes, edges, active, onPick, height = 460, center, dark, ariaLabel, viewBox = "0 0 1000 600" }: { nodes: NetNode[]; edges: [string, string][]; active?: string | null; onPick?: (id: string) => void; height?: number | string; center?: string; dark?: boolean; ariaLabel: string; viewBox?: string }) {
  const id = useId().replace(/:/g, "");
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  // On narrow screens the 1000-unit viewBox shrinks everything — scale nodes and labels back up.
  const [k, setK] = useState(1);
  const [sy, setSy] = useState(1);
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
  useEffect(() => { const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => { const w = Math.max(1, e.contentRect.width), h = Math.max(1, e.contentRect.height); setK(Math.min(3, Math.max(1, (0.86 * vw) / w))); setSy(Math.min(1.7, Math.max(1, (h / w) / (vh / vw)))); }); ro.observe(el); return () => ro.disconnect(); }, [ref, vw, vh]);
  const narrow = k > 1.35;
  // When the card is taller than the drawing, spread the nodes vertically so the network fills it.
  const cy = vy + vh / 2;
  const nodesS = sy === 1 ? nodes : nodes.map((n) => ({ ...n, y: cy + (n.y - cy) * sy }));
  const at = (q: string) => nodesS.find((n) => n.id === q)!;
  const padB = narrow ? 30 * k : 10;
  const vbS = `${vx} ${cy - (vh * sy) / 2} ${vw} ${vh * sy + padB}`;
  const C0 = center ? at(center) : null;
  const ink = dark ? "#EAF2F6" : N.ink;
  return (
    <div ref={ref} style={{ position: "relative", height, width: "100%" }}>
      <svg viewBox={vbS} preserveAspectRatio="xMidYMid meet" role="group" aria-label={ariaLabel} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id={`${id}e`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#2FBF94" /><stop offset=".55" stopColor="#1FA7B4" /><stop offset="1" stopColor="#2273D6" /></linearGradient>
          <radialGradient id={`${id}g`}><stop offset="0" stopColor="#1FA7B4" stopOpacity=".28" /><stop offset="1" stopColor="#2273D6" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}s`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".55" /><stop offset=".35" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
          <pattern id={`${id}p`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill={dark ? "rgba(255,255,255,.07)" : "rgba(14,27,44,.06)"} /></pattern>
        </defs>
        <rect x={vx - 40} y={cy - (vh * sy) / 2 - 20} width={vw + 80} height={vh * sy + 40} fill={`url(#${id}p)`} />
        {C0 && [150, 250].map((r, i) => (
          <g key={r} transform={`translate(${C0.x} ${C0.y})`}>
            <circle r={r} fill="none" stroke={dark ? "rgba(255,255,255,.08)" : "rgba(14,27,44,.07)"} strokeDasharray={i ? "2 10" : "1 7"}>
              <animateTransform attributeName="transform" type="rotate" from="0" to={i ? "-360" : "360"} dur={i ? "90s" : "60s"} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        {edges.map(([a, b], i) => {
          const A = at(a), B = at(b); if (!A || !B) return null;
          const lit = !!active && (active === a || active === b);
          const mx = (A.x + B.x) / 2 + (A.y - B.y) * 0.1, my = (A.y + B.y) / 2 + (B.x - A.x) * 0.1;
          const d = `M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={lit ? `url(#${id}e)` : dark ? "rgba(255,255,255,.12)" : "rgba(14,27,44,.10)"} strokeWidth={lit ? 2.2 : 1} style={{ transition: "stroke .3s" }} />
              {seen && lit && <circle r={4 * Math.min(k, 1.6)} fill="#2273D6"><animateMotion dur={`${2.2 + (i % 4) * 0.5}s`} repeatCount="indefinite" path={d} /></circle>}
              {seen && !lit && i % 3 === 0 && <circle r={2.2 * Math.min(k, 1.6)} fill={dark ? "rgba(126,224,192,.7)" : "rgba(31,167,180,.55)"}><animateMotion dur={`${5 + (i % 5)}s`} repeatCount="indefinite" path={d} begin={`${(i % 7) * 0.6}s`} /></circle>}
            </g>
          );
        })}
        {nodesS.map((n) => {
          const on = active === n.id, isC = center === n.id, r = (n.r || (isC ? 58 : 34)) * (narrow ? Math.min(k, 1.75) : 1), ic = 24 * Math.min(k, 1.85);
          // Labels stay ~12–13px on screen at any card width; the hub label shrinks to fit inside its circle.
          const fs = isC ? Math.min(17 * Math.min(k, 1.6), (r * 1.62) / Math.max(4, n.label.length * 0.56)) : 15 * k;
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`} style={{ cursor: onPick ? "pointer" : "default", outline: "none" }} onClick={() => onPick?.(n.id)}
              role={onPick ? "button" : undefined} tabIndex={onPick ? 0 : undefined} aria-label={onPick ? `${n.label}${n.sub ? " — " + n.sub : ""}` : undefined} aria-pressed={onPick ? on : undefined}
              onKeyDown={(e) => { if (onPick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(n.id); } }}>
              {(on || isC) && <circle r={r * 1.8} fill={`url(#${id}g)`}><animate attributeName="r" values={`${r * 1.5};${r * 2};${r * 1.5}`} dur="3.2s" repeatCount="indefinite" /></circle>}
              {isC && <ellipse rx={r * 1.32} ry={r * 0.42} fill="none" stroke="rgba(31,167,180,.45)" strokeWidth={1.2}><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite" /></ellipse>}
              {isC && <ellipse rx={r * 1.25} ry={r * 0.5} fill="none" stroke="rgba(34,115,214,.3)" strokeWidth={1}><animateTransform attributeName="transform" type="rotate" from="70" to="-290" dur="20s" repeatCount="indefinite" /></ellipse>}
              <circle r={r} fill={isC ? `url(#${id}e)` : dark ? "rgba(13,27,40,.9)" : "#FFFFFF"} stroke={on ? `url(#${id}e)` : isC ? "none" : dark ? "rgba(255,255,255,.2)" : "rgba(14,27,44,.12)"} strokeWidth={on ? 2.4 : 1} style={{ transition: "all .3s", filter: dark ? "none" : "drop-shadow(0 10px 16px rgba(14,27,44,.10))" }} />
              {isC && <circle r={r} fill={`url(#${id}s)`} />}
              {on && !isC && <circle r={r + 7} fill="none" stroke="rgba(34,115,214,.35)" strokeWidth={1} strokeDasharray="3 5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" /></circle>}
              {n.icon && !isC && <SvgIcon name={n.icon} x={0} y={0} size={ic} color={on ? `url(#${id}e)` : dark ? "#BDEFE0" : "#14324A"} stroke={on ? 1.8 : 1.5} />}
              {(() => { // On narrow cards a long label breaks onto two lines instead of colliding with its neighbours.
                const two = !isC && narrow && n.label.length > 11 && n.label.includes(" ");
                const words = n.label.split(" "), mid = Math.ceil(words.length / 2), lines = two ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")] : [n.label];
                return <text y={isC ? fs * 0.36 : r + fs * 1.35} textAnchor="middle" fontSize={fs} fontWeight={on || isC ? 600 : 500} fill={isC ? "#FFFFFF" : ink} style={{ pointerEvents: "none", fontFamily: "inherit", letterSpacing: isC ? ".02em" : 0 }}>{lines.map((l, j) => <tspan key={j} x={0} dy={j ? fs * 1.12 : 0}>{l}</tspan>)}</text>;
              })()}
              {n.sub && !isC && !narrow && <text y={r + fs * 1.35 + 18} textAnchor="middle" fontSize={12} fill={dark ? "rgba(234,242,246,.62)" : N.muted} style={{ pointerEvents: "none", fontFamily: "inherit" }}>{n.sub}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Steps joined by a live line — e.g. Assess → Understand → Personalize → Improve. */
export function StepRail({ steps, active, onPick, dark }: { steps: { t: string; d: string; icon: string; more?: string[]; neyu?: string }[]; active: number; onPick?: (i: number) => void; dark?: boolean }) {
  // Hover (or focus) previews a step; steps with `more`/`neyu` open into a detail card with Neyu's role.
  const [hov, setHov] = useState<number | null>(null);
  const rich = steps.some((s) => s.more || s.neyu);
  const show = hov ?? active;
  const cur = steps[show];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${steps.length > 4 ? 170 : 210}px),1fr))`, gap: 12, position: "relative" }}>
        {rich && <div aria-hidden style={{ position: "absolute", left: 24, right: 24, top: -8, height: 3, borderRadius: 3, background: dark ? "rgba(255,255,255,.1)" : N.line2, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${((show + 1) / steps.length) * 100}%`, background: "linear-gradient(90deg,#2FBF94,#2273D6)", transition: "width .45s cubic-bezier(.2,.8,.2,1)" }} /></div>}
        {steps.map((s, i) => {
          const on = i === show, done = i < show;
          return (
            <button key={s.t} onClick={() => onPick?.(i)} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(i)} onBlur={() => setHov(null)} aria-pressed={i === active} style={{ textAlign: "left", cursor: onPick ? "pointer" : "default", padding: 18, borderRadius: 20, border: `1px solid ${on ? "rgba(42,132,228,.5)" : dark ? "rgba(255,255,255,.12)" : N.line}`, background: on ? (dark ? "rgba(42,132,228,.18)" : "linear-gradient(160deg,#FFFFFF,#EEF7FC)") : dark ? "rgba(255,255,255,.04)" : "#FFFFFF", color: dark ? "#EAF2F6" : N.ink, display: "grid", gap: 8, alignContent: "start", transition: "all .25s", transform: on && rich ? "translateY(-4px)" : "none", boxShadow: on ? "0 24px 40px -30px rgba(42,132,228,.8)" : "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconTile icon={s.icon} size={38} active={on || done} dark={dark} />
                <span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: dark ? "rgba(234,242,246,.6)" : N.faint }}>0{i + 1}</span>
                {done && rich && <NIcon name="check" size={16} tone="grad" style={{ marginLeft: "auto" }} />}
              </span>
              <b style={{ fontWeight: 500, fontSize: 19, letterSpacing: "-.01em" }}>{s.t}</b>
              <span style={{ fontSize: 14.5, lineHeight: 1.5, color: dark ? "rgba(234,242,246,.72)" : N.ink2 }}>{s.d}</span>
            </button>
          );
        })}
      </div>
      {rich && cur && (
        <div key={show} style={{ ...cardN, padding: "clamp(16px,2.4vw,24px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16, animation: "fadeUp .3s ease", background: dark ? "rgba(255,255,255,.05)" : "linear-gradient(160deg,#FFFFFF,#F2F9F7)" }}>
          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            <span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>Step {show + 1} · {cur.t}</span>
            {cur.more && <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>{cur.more.map((m) => <li key={m} style={{ display: "flex", gap: 8, fontSize: 15, lineHeight: 1.5, color: dark ? "#EAF2F6" : N.ink }}><NIcon name="check" size={16} tone="grad" style={{ marginTop: 3 }} />{m}</li>)}</ul>}
          </div>
          {cur.neyu && <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 16, background: dark ? "rgba(126,224,192,.08)" : "rgba(47,191,148,.07)", border: "1px solid rgba(47,191,148,.25)" }}><AlbaOrb size={26} /><div style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>Neyu in this step</span><TypeLine text={cur.neyu} dark={dark} /></div></div>}
        </div>
      )}
    </div>
  );
}

/** A line that types itself in (re-types when the text changes). */
function TypeLine({ text, dark }: { text: string; dark?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); const t = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(t), x) : x + 2)), 18); return () => clearInterval(t); }, [text]);
  return <span style={{ fontSize: 15, lineHeight: 1.5, color: dark ? "#EAF2F6" : N.ink }}>{text.slice(0, n)}{n < text.length && <span style={{ opacity: 0.5 }}>▍</span>}</span>;
}

/** Streams an answer from /api/chat (same engine as the Neyu panel). */
export function useNeyuStream(page: string) {
  const [q, setQ] = useState(""), [answer, setAnswer] = useState(""), [busy, setBusy] = useState(false), [alert, setAlert] = useState(false);
  const conv = useRef<string | null>(null);
  const ask = async (raw: string) => {
    const text = raw.trim(); if (text.length < 2 || busy) return;
    setQ(text); setAnswer(""); setAlert(false);
    if (isEmergency(text)) { setAlert(true); setAnswer("This may be a medical emergency. Call 911 or go to the nearest emergency department now."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: [], pageContext: page, conversationId: conv.current }) });
      const cid = res.headers.get("X-Conversation-Id"); if (cid) conv.current = cid;
      if ((res.headers.get("Content-Type") || "").includes("application/json")) { const j = await res.json(); setAlert(!!j.emergency); setAnswer(j.reply || j.error || "Please try again."); return; }
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader(), dec = new TextDecoder(); let full = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value, { stream: true }); setBusy(false); setAnswer(full.replace(/\*\*|__|^#+\s/gm, "")); }
      if (!full) setAnswer("I couldn’t answer that just now — please try again.");
    } catch { setAnswer("I couldn’t connect just now. Please try again, or call 403-475-4475."); }
    finally { setBusy(false); }
  };
  return { q, answer, busy, alert, ask, reset: () => { setQ(""); setAnswer(""); setAlert(false); } };
}

/** "Ask Neyu" bar with an inline streamed answer and a hand-off to the full Neyu panel. */
export function AskNeyu({ page, placeholder = "What would you like to understand about your health?", suggestions = [], dark, big }: { page: string; placeholder?: string; suggestions?: string[]; dark?: boolean; big?: boolean }) {
  const { openAlba } = useAlba();
  const s = useNeyuStream(page);
  const [v, setV] = useState("");
  const go = (t: string) => { setV(""); s.ask(t); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12, width: "100%", maxWidth: big ? 760 : 680 }}>
      <form onSubmit={(e) => { e.preventDefault(); go(v); }} style={{ position: "relative", borderRadius: 999 }}>
        <anra-electro radius="34" style={{ position: "absolute", inset: -6, pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: big ? "8px 8px 8px 16px" : "6px 6px 6px 14px", borderRadius: 999, background: "rgba(255,255,255,.97)", border: `1px solid ${N.line}`, boxShadow: "0 20px 50px -30px rgba(14,27,44,.45)" }}>
          <AlbaOrb size={big ? 30 : 24} />
          <input size={1} value={v} onChange={(e) => setV(e.target.value)} aria-label="Ask Neyu" placeholder={placeholder} style={{ flex: 1, minWidth: 0, width: 0, height: big ? 50 : 44, border: 0, outline: "none", background: "transparent", fontSize: big ? 17 : 16, color: N.ink }} />
          <button type="submit" aria-label="Ask Neyu" style={{ ...btn("grad"), height: big ? 50 : 44, padding: "0 18px" }}><span className="neyu-hide-xs">Ask Neyu</span><NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></button>
        </div>
      </form>
      {suggestions.length > 0 && !s.q && (big
        ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 10, textAlign: "left" }}>
            {suggestions.map((x) => <PromptCard key={x} text={x} dark={dark} onClick={() => go(x)} />)}
          </div>
        : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
            {suggestions.map((x) => <button key={x} onClick={() => go(x)} className="neyu-chip" style={{ minHeight: 38, padding: "0 14px 0 10px", borderRadius: 999, border: `1px solid ${dark ? "rgba(255,255,255,.2)" : N.line}`, background: dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.85)", color: dark ? "#EAF2F6" : N.ink2, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><NIcon name="spark" size={14} tone={dark ? "#7EE0C0" : "grad"} />{x}</button>)}
          </div>
      )}
      {s.q && (
        <div aria-live="polite" style={{ ...cardN, padding: 18, textAlign: "left", display: "grid", gap: 10, background: s.alert ? "#FBE9E4" : "rgba(255,255,255,.97)", animation: "fadeUp .3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <AiBadge label={s.alert ? "Safety first" : "Neyu"} />
            <button onClick={() => s.reset()} aria-label="Clear answer" style={{ border: 0, background: "none", color: N.muted, cursor: "pointer", fontSize: 18 }}><NIcon name="ph-x" size={18} tone={"currentColor"} /></button>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: N.muted }}>“{s.q}”</p>
          {s.busy ? <span style={{ display: "flex", gap: 8, alignItems: "center", color: N.muted, fontSize: 14.5 }}><AlbaOrb size={20} />Neyu is connecting the pieces…</span>
            : <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: s.alert ? "#8B2F1C" : N.ink, whiteSpace: "pre-wrap" }}>{s.answer}</p>}
          {!s.busy && !s.alert && s.answer && <button onClick={() => openAlba(s.q)} style={{ justifySelf: "start", border: 0, background: "none", padding: 0, color: N.deep, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Continue with Neyu →</button>}
          <span style={{ fontSize: 12, color: N.faint }}>Neyu explains and guides; it doesn’t diagnose. In an emergency, call 911.</span>
        </div>
      )}
    </div>
  );
}

/** Pick a fitting icon for a suggested question. */
export function iconFor(q: string) {
  const t = q.toLowerCase();
  if (/blood pressure|hypertension|bp\b|\d{3}\/\d{2}/.test(t)) return "gauge";
  if (/ldl|cholesterol|lipid/.test(t)) return "drop";
  if (/kidney/.test(t)) return "kidney";
  if (/heart|cardio|echo|ecg|palpitat/.test(t)) return "heartPulse";
  if (/virtual|video|online/.test(t)) return "video";
  if (/executive|package/.test(t)) return "briefcase";
  if (/member|plan|family/.test(t)) return "membership";
  if (/gene|dna|genom|pharmaco/.test(t)) return "dna";
  if (/sleep/.test(t)) return "moon";
  if (/test|lab|result|crp|a1c|biomarker/.test(t)) return "flask";
  if (/home|collect/.test(t)) return "homeDrop";
  if (/age|aging|longev/.test(t)) return "hourglass";
  if (/doctor|physician|specialist|referr/.test(t)) return "doctor";
  return "spark";
}

/** A suggested question as a calm prompt card: icon, question, arrow. */
export function PromptCard({ text, onClick, dark }: { text: string; onClick: () => void; dark?: boolean }) {
  return (
    <button onClick={onClick} className="neyu-prompt" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, cursor: "pointer", textAlign: "left", minWidth: 0,
      border: `1px solid ${dark ? "rgba(255,255,255,.16)" : "rgba(14,27,44,.09)"}`, background: dark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: dark ? "#EAF2F6" : N.ink }}>
      <IconTile icon={iconFor(text)} size={34} dark={dark} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.4 }}>{text}</span>
      <NIcon name="arrow" size={16} tone={dark ? "#7EE0C0" : N.teal} />
    </button>
  );
}

/** "Neyu reads" — an AI interpretation card that types itself when it scrolls into view. */
export function NeyuReads({ title = "Neyu reads", text, ask, dark }: { title?: string; text: string; ask?: string; dark?: boolean }) {
  const { openAlba } = useAlba();
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const [n, setN] = useState(0);
  useEffect(() => { if (!seen) return; setN(0); let i = 0; const t = setInterval(() => { i += 3; setN(i); if (i >= text.length) clearInterval(t); }, 16); return () => clearInterval(t); }, [seen, text]);
  return (
    <div ref={ref} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 18, background: dark ? "rgba(255,255,255,.05)" : "linear-gradient(160deg,#FFFFFF,#F1F9F7)", border: `1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(60,199,158,.25)"}` }}>
      <AlbaOrb size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: dark ? "#7EE0C0" : N.tealText, fontWeight: 600 }}>{title}</div>
        <p style={{ margin: "5px 0 0", fontSize: 15.5, lineHeight: 1.55, color: dark ? "#EAF2F6" : N.ink, minHeight: "3em" }}>{text.slice(0, n)}{n < text.length && <span style={{ opacity: 0.5 }}>▍</span>}</p>
        {ask && <button onClick={() => openAlba(ask)} style={{ marginTop: 6, border: 0, background: "none", padding: 0, color: dark ? "#7EE0C0" : N.deep, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Ask Neyu a follow-up →</button>}
      </div>
    </div>
  );
}

/** Icon tile: a quiet hairline square with a NEYU line icon (gradient when active). */
export function IconTile({ icon, size = 46, active, dark }: { icon: string; size?: number; active?: boolean; dark?: boolean }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), display: "grid", placeItems: "center", flex: "none", position: "relative",
      background: active ? "linear-gradient(150deg,#FFFFFF 0%,#EAF7F3 55%,#E6F0FB 100%)" : dark ? "rgba(255,255,255,.05)" : "linear-gradient(160deg,#FFFFFF,#F5F8F9)",
      border: `1px solid ${active ? "rgba(31,167,180,.45)" : dark ? "rgba(255,255,255,.14)" : "rgba(14,27,44,.09)"}`,
      boxShadow: active ? "0 10px 22px -14px rgba(34,115,214,.6), inset 0 1px 0 #fff" : dark ? "none" : "inset 0 1px 0 #fff, 0 6px 14px -12px rgba(14,27,44,.25)" }}>
      <NIcon name={icon} size={Math.round(size * 0.5)} tone={dark && !active ? "#BDEFE0" : "grad"} stroke={size > 40 ? 1.5 : 1.6} />
      <span style={{ position: "absolute", top: Math.round(size * 0.14), right: Math.round(size * 0.14), width: 4, height: 4, borderRadius: 2, background: active ? "#2273D6" : "rgba(31,167,180,.55)" }} />
    </span>
  );
}

/** Linked capability card: icon, a small eyebrow, title, text — nothing overlaps at any width. */
export function CapCard({ icon, title, text, href, meta, chart, onClick }: { icon: string; title: string; text: string; href?: string; meta?: string; chart?: { mode: string; param?: number }; onClick?: () => void }) {
  const inner = (
    <>
      <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <IconTile icon={icon} />
        {meta && <span style={{ minWidth: 0, fontSize: 11.5, color: N.muted, letterSpacing: ".14em", textTransform: "uppercase", lineHeight: 1.35 }}>{meta}</span>}
      </span>
      <b style={{ fontWeight: 500, fontSize: 20, letterSpacing: "-.015em", color: N.ink }}>{title}</b>
      <span style={{ fontSize: 15, lineHeight: 1.55, color: N.ink2 }}>{text}</span>
      {chart && <LiveChart mode={chart.mode} param={chart.param} height={130} />}
      <span style={{ fontSize: 14, color: N.deep, fontWeight: 600, marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>Explore<NIcon name="arrow" size={16} tone={N.deep} /></span>
    </>
  );
  const st: React.CSSProperties = { ...cardN, padding: 22, display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", textAlign: "left", cursor: "pointer", minWidth: 0 };
  return href ? <a href={href} className="sx-card" style={st}>{inner}</a> : <button onClick={onClick} className="sx-card" style={st}>{inner}</button>;
}

/** Service request (virtual visit, package, membership, at-home collection…). Posts to /api/requests. */
export function RequestForm({ service, title = "Request", options, cta = "Send request", note, done }: { service: string; title?: string; options?: { label: string; values: string[] }; cta?: string; note?: string; done?: string }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", choice: options?.values[0] || "", message: "", postal: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (f.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(f.email)) { setErr("Please add your name and a valid email."); return; }
    setState("busy");
    try {
      const r = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service, ...f, page: typeof window !== "undefined" ? window.location.pathname : "" }) });
      const j = await r.json().catch(() => ({}));
      if (j.emergency) { setErr(j.emergency); setState("err"); return; }
      if (!r.ok) { setErr(j.error || "Something went wrong — please try again."); setState("err"); return; }
      setState("done");
    } catch { setErr("Couldn’t send — please check your connection."); setState("err"); }
  };
  const inp: React.CSSProperties = { width: "100%", height: 50, padding: "0 14px", borderRadius: 14, border: `1px solid ${N.line}`, background: "#fff", fontSize: 16, color: N.ink, boxSizing: "border-box" };
  if (state === "done") return (
    <div role="status" style={{ ...cardN, padding: 26, display: "grid", gap: 10, justifyItems: "start" }}>
      <IconTile icon="check" active />
      <b style={{ fontWeight: 500, fontSize: 22 }}>{done ? "Message received" : "Request received"}</b>
      <p style={{ margin: 0, color: N.ink2, fontSize: 15.5, lineHeight: 1.55 }}>{done || <>The NEYU team will contact you at {f.email}{f.phone ? ` or ${f.phone}` : ""} to confirm the details. Nothing is booked or charged until you confirm.</>}</p>
    </div>
  );
  return (
    <form onSubmit={submit} style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 12 }}>
      <b style={{ fontWeight: 500, fontSize: 21, letterSpacing: "-.01em" }}>{title}</b>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Full name<input style={inp} value={f.name} onChange={set("name")} autoComplete="name" required /></label>
        <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Email<input style={inp} type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
        <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Phone (optional)<input style={inp} type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></label>
        {options && <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>{options.label}<select style={inp} value={f.choice} onChange={set("choice")}>{options.values.map((o) => <option key={o}>{o}</option>)}</select></label>}
        {service === "at-home" && <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Postal code<input style={inp} value={f.postal} onChange={set("postal")} autoComplete="postal-code" placeholder="T2E" /></label>}
      </div>
      <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Anything we should know? (optional)<textarea value={f.message} onChange={set("message")} rows={3} maxLength={1000} style={{ ...inp, height: "auto", padding: 12, resize: "vertical" }} /></label>
      {err && <p role="alert" style={{ margin: 0, color: "#8B2F1C", fontSize: 14.5 }}>{err}</p>}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={state === "busy"} style={{ ...btn("grad"), opacity: state === "busy" ? 0.6 : 1 }}>{state === "busy" ? "Sending…" : cta}<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></button>
        <span style={{ fontSize: 12.5, color: N.faint }}>{note || "No payment is taken online. The team confirms everything with you first."}</span>
      </div>
    </form>
  );
}

/** Pillar-page hero: minimal, airy, flowing lines, live network visual and Ask Neyu. */
export function PillarHero({ kicker, title, lead, page, suggestions, visual, stats }: { kicker: string; title: React.ReactNode; lead: string; page: string; suggestions: string[]; visual: React.ReactNode; stats?: { v: number; s?: string; l: string; d?: number }[] }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", padding: "clamp(40px,7vw,96px) 0 clamp(40px,6vw,72px)", background: "radial-gradient(900px 480px at 90% 0%, rgba(42,132,228,.10), transparent 60%), radial-gradient(800px 500px at 0% 30%, rgba(60,199,158,.10), transparent 60%)" }}>
      <FlowLines />
      <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(28px,4vw,56px)", alignItems: "center" }}>
        <div style={{ display: "grid", gap: 18, minWidth: 0, gridTemplateColumns: "minmax(0,1fr)" }}>
          <Kicker label={kicker} />
          <h1 style={{ margin: 0, fontSize: "clamp(40px,6vw,76px)", lineHeight: 1, letterSpacing: "-.045em", fontWeight: 500, color: N.ink }}>{title}</h1>
          <p style={{ ...leadN, margin: 0 }}>{lead}</p>
          <AskNeyu page={page} suggestions={suggestions} />
          {stats && <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 3)},minmax(0,1fr))`, gap: 12, marginTop: 6 }}>{stats.map((s) => <StatN key={s.l} value={s.v} suffix={s.s} label={s.l} decimals={s.d} />)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>{visual}</div>
      </div>
    </section>
  );
}

/** Small CTA band used at the end of every Neyu page. */
export function CtaBand({ title, text, primary, secondary }: { title: string; text: string; primary: { label: string; href: string }; secondary?: { label: string; href?: string; alba?: string } }) {
  const { openAlba } = useAlba();
  return (
    <section style={{ ...wrapN, paddingTop: "clamp(40px,6vw,80px)", paddingBottom: "clamp(40px,6vw,80px)" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 30, padding: "clamp(28px,5vw,56px)", background: "radial-gradient(700px 300px at 90% 0%, rgba(42,132,228,.35), transparent 60%), radial-gradient(600px 300px at 0% 100%, rgba(60,199,158,.3), transparent 60%), #0B1624", color: "#EAF2F6", display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <FlowLines dark opacity={0.8} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.08, color: "#fff" }}>{title}</h2>
          <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: 1.6, color: "rgba(234,242,246,.78)" }}>{text}</p>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={primary.href} style={{ ...btn("grad") }}>{primary.label}<NIcon name="ph-arrow-right" size={18} tone={"currentColor"} /></a>
          {secondary && (secondary.alba !== undefined
            ? <button onClick={() => openAlba(secondary.alba || undefined)} style={{ ...btn("ghost"), color: "#fff", borderColor: "rgba(255,255,255,.5)" }}><AlbaOrb size={20} motion={false} />{secondary.label}</button>
            : <a href={secondary.href} style={{ ...btn("ghost"), color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>{secondary.label}</a>)}
        </div>
      </div>
    </section>
  );
}

/** Page shell for Neyu pages: right padding clears the desktop nav rail. */
export function NeyuPage({ children }: { children: React.ReactNode }) {
  return <div className="anra-root neyu-page" style={{ minHeight: "100vh", overflowX: "clip", background: N.paper, color: N.ink }}><main id="main" className="neyu-main">{children}</main></div>;
}
