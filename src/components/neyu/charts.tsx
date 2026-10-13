"use client";

// NEYU charts — clean, quiet, accurate. Every chart is drawn in real pixels
// (measured with ResizeObserver), so text stays crisp and never overlaps at any
// size: a header row (title + key value) sits above a plot area, and labels are
// laid out inside the plot's own margins. Values are illustrative but use real
// clinical ranges (Hypertension Canada, CCS lipid guideline, ASE echo, Canadian
// 24-Hour Movement Guidelines, CGM consensus, Health Canada AQHI).
import React, { useEffect, useId, useRef, useState } from "react";

const C = { ink: "#0E1B2C", ink2: "#33465A", muted: "#6B7885", faint: "#9AA6B1", grid: "#EDF1F3", line: "#E2E7EA", green: "#2FBF94", teal: "#1FA7B4", blue: "#2273D6", amber: "#D9902F", red: "#C7563C" };
const DK = { ink: "#F2F7FA", ink2: "rgba(234,242,246,.82)", muted: "rgba(234,242,246,.6)", faint: "rgba(234,242,246,.42)", grid: "rgba(255,255,255,.07)", line: "rgba(255,255,255,.14)" };

function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => setBox({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}
function useSeen<T extends HTMLElement>(ref: React.RefObject<T>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 }); io.observe(el); return () => io.disconnect();
  }, [ref]);
  return seen;
}
/** True only while on screen — used to pause live animation. */
function useOnScreen<T extends HTMLElement>(ref: React.RefObject<T>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting)); io.observe(el); return () => io.disconnect();
  }, [ref]);
  return on;
}
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

type P = { w: number; h: number; dark?: boolean; param?: number; seen: boolean; gid: string; compact: boolean; live?: boolean };

/** Header: title on the left, key value on the right. Always one line, never overlapping. */
function Head({ w, title, value, tone, dark }: { w: number; title: string; value?: string; tone?: string; dark?: boolean }) {
  const T = dark ? DK : C;
  const small = w < 260;
  const vw = value ? value.length * (small ? 6.9 : 7.4) + 12 : 0;
  const room = Math.max(4, Math.floor((w - vw) / (small ? 6.2 : 6.7)));
  return (
    <g>
      <text x={0} y={13} fontSize={small ? 11.5 : 12.5} fill={T.muted} style={{ letterSpacing: ".02em" }}>{fit(title, room)}</text>
      {value && <text x={w} y={13} textAnchor="end" fontSize={small ? 12 : 13} fontWeight={600} fill={tone || T.ink}>{value}</text>}
    </g>
  );
}
const fit = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(4, n - 1)) + "…" : s);
function Grad({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}l`} x1="0" x2="1"><stop offset="0" stopColor={C.green} /><stop offset=".55" stopColor={C.teal} /><stop offset="1" stopColor={C.blue} /></linearGradient>
      <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.teal} stopOpacity=".18" /><stop offset="1" stopColor={C.teal} stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}d`}><stop offset="0" stopColor={C.blue} stopOpacity=".45" /><stop offset="1" stopColor={C.blue} stopOpacity="0" /></radialGradient>
    </defs>
  );
}
const drawIn = (seen: boolean, ms = 1400, delay = 0): React.CSSProperties => ({ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transition: `stroke-dashoffset ${ms}ms cubic-bezier(.2,.8,.2,1) ${delay}ms` });
const smooth = (pts: [number, number][]) => pts.reduce((d, [x, y], i, a) => {
  if (!i) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
  const [px, py] = a[i - 1]; const cx = (px + x) / 2;
  return `${d} C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
}, "");

// ── ECG: Lead II, scrolling, at the given heart rate ──
function beat(t: number) { // t in 0..1 of one cardiac cycle → mV-ish
  const g = (m: number, s: number, a: number) => a * Math.exp(-((t - m) ** 2) / (2 * s * s));
  return g(0.16, 0.025, 0.14) - g(0.285, 0.008, 0.12) + g(0.3, 0.009, 1.0) - g(0.318, 0.009, 0.24) + g(0.52, 0.045, 0.28);
}
function Ecg({ w, h, dark, param, live, gid, compact }: P) {
  const T = dark ? DK : C;
  const bpm = Math.max(45, Math.min(130, param && param !== 50 ? param : 72));
  const top = compact ? 22 : 28, ph = h - top - (compact ? 4 : 18);
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (!live) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => { setOff((o) => (o + ((now - last) / 1000) * 90 * (reduced() ? 0.5 : 1)) % 100000); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [live]);
  const pxPerSec = 90, cyc = 60 / bpm, mid = top + ph * 0.62, amp = ph * 0.62;
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 2) { const tt = ((x + off) / pxPerSec) / cyc; const v = beat(tt - Math.floor(tt)); pts.push(`${x ? "L" : "M"}${x} ${(mid - v * amp).toFixed(1)}`); }
  const lastY = mid - beat(((w + off) / pxPerSec / cyc) % 1) * amp;
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "ECG · lead II" : "Heart rhythm · lead II"} value={`${bpm} bpm · sinus`} />
      {Array.from({ length: Math.floor(w / 24) + 1 }, (_, i) => <line key={i} x1={i * 24} x2={i * 24} y1={top} y2={top + ph} stroke={T.grid} />)}
      {[0, 1, 2, 3].map((i) => <line key={"h" + i} x1={0} x2={w} y1={top + (ph / 3) * i} y2={top + (ph / 3) * i} stroke={T.grid} />)}
      <path d={pts.join(" ")} fill="none" stroke={`url(#${gid}l)`} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={w - 1} cy={lastY} r={9} fill={`url(#${gid}d)`} /><circle cx={w - 1} cy={lastY} r={2.6} fill={C.blue} />
      {!compact && <text x={0} y={h - 3} fontSize={11} fill={T.faint}>25 mm/s · illustrative</text>}
    </>
  );
}

// ── Home blood pressure: 14 days, systolic/diastolic, Hypertension Canada home threshold 135/85 ──
const BP = [[138, 86], [134, 84], [141, 88], [136, 85], [132, 82], [129, 81], [135, 84], [131, 82], [128, 80], [133, 83], [127, 79], [130, 81], [126, 78], [128, 79]];
function Bp({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, bot = compact ? 6 : 20, left = compact ? 0 : 30, pw = w - left - 4, ph = h - top - bot;
  const lo = 70, hi = 148, y = (v: number) => top + ph - ((v - lo) / (hi - lo)) * ph, x = (i: number) => left + 6 + (i * (pw - 12)) / (BP.length - 1);
  const avg = BP.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]).map((v) => Math.round(v / BP.length));
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Home BP · 14 days" : "Home blood pressure · 14 days"} value={`avg ${avg[0]}/${avg[1]}`} tone={avg[0] < 135 && avg[1] < 85 ? C.teal : C.amber} />
      {!compact && [80, 100, 120, 140].map((v) => <g key={v}><line x1={left} x2={w} y1={y(v)} y2={y(v)} stroke={T.grid} /><text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill={T.faint}>{v}</text></g>)}
      <line x1={left} x2={w} y1={y(135)} y2={y(135)} stroke={C.amber} strokeDasharray="4 4" opacity={0.8} />
      <line x1={left} x2={w} y1={y(85)} y2={y(85)} stroke={C.amber} strokeDasharray="4 4" opacity={0.5} />
      {BP.map(([s, d], i) => (
        <g key={i} style={{ opacity: seen ? 1 : 0, transition: `opacity .4s ease ${i * 40}ms` }}>
          <line x1={x(i)} x2={x(i)} y1={y(s)} y2={y(d)} stroke={T.line} strokeWidth={compact ? 2 : 3} strokeLinecap="round" />
          <circle cx={x(i)} cy={y(s)} r={compact ? 2.6 : 3.4} fill={s >= 135 ? C.amber : C.blue} />
          <circle cx={x(i)} cy={y(d)} r={compact ? 2.2 : 3} fill="#fff" stroke={d >= 85 ? C.amber : C.teal} strokeWidth={1.6} />
        </g>
      ))}
      {!compact && <text x={left} y={h - 4} fontSize={10.5} fill={T.faint}>● systolic  ○ diastolic  — home target &lt;135/85</text>}
    </>
  );
}

// ── LDL: where a value sits on the CCS 2021 ranges, plus recent readings ──
function Ldl({ w, h, dark, param, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const v = Math.max(1.2, Math.min(6.4, (param && param !== 50 ? param : 39) / 10));
  const bands = [{ to: 1.8, c: C.green, l: "<1.8 high-risk target" }, { to: 3.5, c: C.teal, l: "1.8–3.4" }, { to: 5, c: C.amber, l: "3.5–4.9 treat if risk ↑" }, { to: 6.5, c: C.red, l: "≥5.0 check for FH" }];
  const top = compact ? 26 : 34, bw = w, bx = (n: number) => ((n - 1.2) / (6.5 - 1.2)) * bw;
  const by = top + (compact ? 6 : 10), bh = 8;
  const hist = [4.4, 4.2, v + 0.3, v];
  const sx = (i: number) => 4 + (i * (w - 8)) / (hist.length - 1), sy = (n: number) => h - 8 - ((n - 1.2) / (6.5 - 1.2)) * (h - by - 52);
  const band = bands.find((b) => v < b.to) || bands[3];
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title="LDL cholesterol · mmol/L" value={`${f1(v)} · ${band.l.split(" ")[0]}`} tone={band.c} />
      {bands.map((b, i) => { const x0 = bx(i ? bands[i - 1].to : 1.2), x1 = bx(b.to); return <rect key={i} x={x0 + 1} y={by} width={Math.max(0, x1 - x0 - 2)} height={bh} rx={4} fill={b.c} opacity={0.22} />; })}
      <g style={{ transform: `translateX(${bx(v)}px)`, transition: "transform .5s cubic-bezier(.2,.8,.2,1)" }}>
        <line x1={0} x2={0} y1={by - 6} y2={by + bh + 6} stroke={C.ink} strokeWidth={1.6} />
        <circle cx={0} cy={by + bh / 2} r={5} fill="#fff" stroke={band.c} strokeWidth={2.2} />
      </g>
      {!compact && w > 300 && bands.map((b, i) => { const x0 = bx(i ? bands[i - 1].to : 1.2), x1 = bx(b.to); return (x1 - x0) > 64 ? <text key={i} x={(x0 + x1) / 2} y={by + bh + 18} textAnchor="middle" fontSize={10.5} fill={T.faint}>{b.l}</text> : null; })}
      {h > 120 && <>
        <path d={smooth(hist.map((n, i) => [sx(i), sy(n)]))} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2.2} pathLength={1} style={drawIn(seen)} />
        {hist.map((n, i) => <g key={i}><circle cx={sx(i)} cy={sy(n)} r={i === hist.length - 1 ? 4.5 : 3} fill={i === hist.length - 1 ? C.blue : "#fff"} stroke={C.blue} strokeWidth={1.6} />{!compact && <text x={Math.min(Math.max(sx(i), 14), w - 14)} y={sy(n) - 9} textAnchor="middle" fontSize={10.5} fill={T.muted}>{f1(n)}</text>}</g>)}
      </>}
    </>
  );
}

// ── Glucose: 24 h CGM curve, target 3.9–10.0 mmol/L ──
const GLU = [5.6, 5.4, 5.2, 5.1, 5.0, 5.2, 5.8, 8.6, 9.4, 7.6, 6.4, 6.0, 7.9, 10.6, 9.1, 7.0, 6.2, 6.0, 8.2, 9.8, 8.4, 6.9, 6.1, 5.7];
function Glucose({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, bot = compact ? 4 : 18, left = compact ? 0 : 26, ph = h - top - bot, pw = w - left;
  const y = (v: number) => top + ph - ((v - 3) / (12 - 3)) * ph, x = (i: number) => left + (i * pw) / (GLU.length - 1);
  const tir = Math.round((GLU.filter((g) => g >= 3.9 && g <= 10).length / GLU.length) * 100);
  const d = smooth(GLU.map((g, i) => [x(i), y(g)]));
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Glucose · 24 h" : "Glucose · 24 hours (CGM)"} value={`${tir}% in range`} tone={C.teal} />
      <rect x={left} y={y(10)} width={pw} height={y(3.9) - y(10)} fill={C.green} opacity={0.08} />
      <line x1={left} x2={w} y1={y(10)} y2={y(10)} stroke={C.green} strokeDasharray="3 4" opacity={0.6} /><line x1={left} x2={w} y1={y(3.9)} y2={y(3.9)} stroke={C.green} strokeDasharray="3 4" opacity={0.6} />
      {!compact && <><text x={left - 5} y={y(10) + 4} textAnchor="end" fontSize={10.5} fill={T.faint}>10</text><text x={left - 5} y={y(3.9) + 4} textAnchor="end" fontSize={10.5} fill={T.faint}>3.9</text></>}
      <path d={`${d} L${w} ${top + ph} L${left} ${top + ph} Z`} fill={`url(#${gid}a)`} style={{ opacity: seen ? 1 : 0, transition: "opacity 1s" }} />
      <path d={d} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2} pathLength={1} style={drawIn(seen, 1600)} />
      {!compact && [["Breakfast", 7], ["Lunch", 12], ["Dinner", 18]].map(([l, i]) => <text key={l} x={x(+i)} y={h - 3} textAnchor="middle" fontSize={10.5} fill={T.faint}>{l}</text>)}
    </>
  );
}

// ── Activity: active minutes per day vs 150 min/week ──
function Activity({ w, h, dark, param, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const total = param && param !== 50 ? param : 165;
  const shape = [0.12, 0.18, 0.1, 0.2, 0.08, 0.2, 0.12];
  const mins = shape.map((s) => Math.round(s * total));
  const top = compact ? 24 : 30, bot = compact ? 4 : 18, ph = h - top - bot, bwid = w / 7;
  const max = Math.max(60, ...mins);
  const ok = total >= 150;
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Active min · week" : "Active minutes · this week"} value={`${total} / 150`} tone={ok ? C.teal : C.amber} />
      {mins.map((m, i) => { const bh = (m / max) * ph; return <rect key={i} x={i * bwid + bwid * 0.22} width={bwid * 0.56} y={top + ph - (seen ? bh : 0)} height={seen ? bh : 0} rx={Math.min(6, bwid * 0.2)} fill={`url(#${gid}l)`} opacity={0.85} style={{ transition: `all .7s cubic-bezier(.2,.8,.2,1) ${i * 60}ms` }} />; })}
      {!compact && ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <text key={i} x={i * bwid + bwid / 2} y={h - 3} textAnchor="middle" fontSize={10.5} fill={T.faint}>{d}</text>)}
    </>
  );
}

// ── Trend: risk factors in range (of 6) over 12 months ──
function Trend({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const v = [3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6];
  const top = compact ? 24 : 30, bot = compact ? 6 : 18, ph = h - top - bot;
  const x = (i: number) => 6 + (i * (w - 12)) / 11, y = (n: number) => top + ph - ((n - 2) / 4.4) * ph;
  const d = smooth(v.map((n, i) => [x(i), y(n)]));
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Risk factors in range" : "Risk factors in range · of 6"} value="3 → 6" tone={C.teal} />
      {[3, 4, 5, 6].map((n) => <line key={n} x1={0} x2={w} y1={y(n)} y2={y(n)} stroke={T.grid} />)}
      <path d={`${d} L${x(11)} ${top + ph} L${x(0)} ${top + ph} Z`} fill={`url(#${gid}a)`} style={{ opacity: seen ? 1 : 0, transition: "opacity 1s" }} />
      <path d={d} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2.2} pathLength={1} style={drawIn(seen)} />
      {[3, 7, 11].map((i) => <circle key={i} cx={x(i)} cy={y(v[i])} r={i === 11 ? 4.5 : 3} fill={i === 11 ? C.blue : "#fff"} stroke={C.blue} strokeWidth={1.6} />)}
      {!compact && <text x={0} y={h - 3} fontSize={10.5} fill={T.faint}>BP · LDL · HbA1c · weight · activity · smoke-free — 12 months</text>}
    </>
  );
}

// ── Genome: chromosome ideogram with clinically actionable genes ──
const CHR: [string, number, number][] = [["1", 248, 123], ["2", 242, 93], ["3", 198, 91], ["4", 190, 50], ["5", 181, 48], ["6", 171, 59], ["7", 159, 60], ["8", 145, 45], ["9", 138, 43], ["10", 134, 40], ["11", 135, 53], ["12", 133, 35], ["13", 114, 17], ["14", 107, 17], ["15", 102, 19], ["16", 90, 36], ["17", 83, 25], ["18", 80, 18], ["19", 59, 26], ["20", 64, 28], ["21", 47, 12], ["22", 51, 15], ["X", 156, 60]];
const GENES: { g: string; chr: string; mb: number; c: string; why: string }[] = [
  { g: "LPA", chr: "6", mb: 160.5, c: C.red, why: "Lp(a) — inherited heart risk" },
  { g: "CYP2C19", chr: "10", mb: 94.8, c: C.blue, why: "clopidogrel response" },
  { g: "SLCO1B1", chr: "12", mb: 21.2, c: C.teal, why: "statin muscle side-effects" },
  { g: "APOE", chr: "19", mb: 44.9, c: C.green, why: "lipids & brain aging" },
];
function Genome({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, legend = compact || h < 170 ? 0 : 22, ph = h - top - legend - (compact ? 4 : 14);
  const n = CHR.length, step = w / n, cw = Math.min(10, step * 0.5), scale = ph / 248;
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Genome · 23 chromosomes" : "Your genome · actionable genes"} value={`${GENES.length} genes flagged`} />
      {CHR.map(([name, len, cen], i) => {
        const cx = i * step + step / 2, y0 = top + ph - len * scale;
        const hits = GENES.filter((g) => g.chr === name);
        return (
          <g key={name} style={{ opacity: seen ? 1 : 0, transition: `opacity .5s ease ${i * 25}ms` }}>
            <rect x={cx - cw / 2} y={y0} width={cw} height={(cen - 1.5) * scale} rx={cw / 2} fill={dark ? "rgba(255,255,255,.14)" : "#E3EAEE"} />
            <rect x={cx - cw / 2} y={y0 + (cen + 1.5) * scale} width={cw} height={(len - cen - 1.5) * scale} rx={cw / 2} fill={dark ? "rgba(255,255,255,.14)" : "#E3EAEE"} />
            {hits.map((g) => <g key={g.g}><rect x={cx - cw / 2 - 1.5} y={y0 + g.mb * scale - 2.5} width={cw + 3} height={5} rx={2} fill={g.c} /><circle cx={cx} cy={y0 + g.mb * scale} r={8} fill={g.c} opacity={0.18}><animate attributeName="r" values="5;10;5" dur="2.6s" repeatCount="indefinite" /></circle></g>)}
            {!compact && step > 13 && <text x={cx} y={top + ph + 12} textAnchor="middle" fontSize={9.5} fill={T.faint}>{name}</text>}
          </g>
        );
      })}
      {legend > 0 && (() => { let x = 0; return GENES.map((g) => { const el = <g key={g.g}><circle cx={x + 4} cy={h - 6} r={4} fill={g.c} /><text x={x + 12} y={h - 2} fontSize={10.5} fill={T.muted}>{g.g}</text></g>; x += g.g.length * 7 + 26; return x > w ? null : el; }); })()}
    </>
  );
}

// ── Echo: LV ejection fraction (ASE normal 52–74 %) + LV volume through one beat ──
function Echo({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const EDV = 120, ESV = 46, EF = Math.round(((EDV - ESV) / EDV) * 100);
  const top = compact ? 22 : 30, r = Math.max(16, Math.min((h - top - (compact ? 6 : 12)) / 2, w * 0.18)), cx = r + 4, cy = top + (h - top) / 2 - (compact ? 0 : 2);
  const circ = 2 * Math.PI * (r - 4);
  const vol = (t: number) => { const s = t < 0.35 ? 0.5 - 0.5 * Math.cos((t / 0.35) * Math.PI) : t < 0.5 ? 1 : t < 0.7 ? 1 - 0.85 * ((t - 0.5) / 0.2) : 0.15 - 0.15 * ((t - 0.7) / 0.3); return EDV - (EDV - ESV) * s; };
  const gx0 = cx + r + 16, gw = w - gx0, gy0 = top + 4, gh = h - top - (compact ? 8 : 22);
  const pts: [number, number][] = Array.from({ length: 41 }, (_, i) => [gx0 + (i / 40) * gw, gy0 + gh - ((vol(i / 40) - 30) / (EDV + 10 - 30)) * gh]);
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Echo · pumping function" : "Echocardiogram · pumping function"} value={`EF ${EF}% · normal`} tone={C.teal} />
      <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={T.grid} strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={`url(#${gid}l)`} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${circ * (seen ? EF / 100 : 0)} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)" }} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={Math.max(12, r * 0.5)} fontWeight={600} fill={T.ink}>{EF}%</text>
      {gw > 60 && <>
        <path d={smooth(pts)} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2} pathLength={1} style={drawIn(seen, 1600, 200)} />
        {!compact && <><text x={gx0} y={h - 6} fontSize={10.5} fill={T.faint}>LV volume through one beat · {EDV}→{ESV} mL</text></>}
      </>}
    </>
  );
}

// ── Biomarker panel: each value placed in its reference range ──
const MARKERS = [
  { n: "hs-CRP", v: 1.2, u: "mg/L", lo: 0, hi: 5, ok: [0, 1], mid: [1, 3] },
  { n: "ApoB", v: 0.92, u: "g/L", lo: 0.4, hi: 1.6, ok: [0.4, 0.8], mid: [0.8, 1.2] },
  { n: "Lp(a)", v: 42, u: "nmol/L", lo: 0, hi: 250, ok: [0, 100], mid: [100, 125] },
  { n: "HbA1c", v: 5.6, u: "%", lo: 4.5, hi: 7.5, ok: [4.5, 6.0], mid: [6.0, 6.5] },
  { n: "Vitamin D", v: 68, u: "nmol/L", lo: 20, hi: 160, ok: [50, 125], mid: [30, 50] },
];
function Bars({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 32, rows = MARKERS.slice(0, Math.max(2, Math.floor((h - top) / (compact ? 22 : 34)))), rh = (h - top) / rows.length;
  const lw = Math.min(86, w * 0.28), bx = lw, bw = w - lw - (compact ? 4 : 64);
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Biomarkers" : "Biomarker panel · in range"} value={`${rows.length} markers`} />
      {rows.map((m, i) => {
        const y = top + i * rh + rh / 2, sx = (v: number) => bx + ((v - m.lo) / (m.hi - m.lo)) * bw;
        const okX = sx(m.ok[0]), okW = sx(m.ok[1]) - okX;
        const flag = m.v >= m.ok[0] && m.v <= m.ok[1] ? C.teal : C.amber;
        return (
          <g key={m.n}>
            <text x={0} y={y + 4} fontSize={compact ? 11 : 12.5} fill={T.ink2}>{m.n}</text>
            <rect x={bx} y={y - 3} width={bw} height={6} rx={3} fill={T.grid} />
            <rect x={okX} y={y - 3} width={okW} height={6} rx={3} fill={C.green} opacity={0.3} />
            <circle cx={seen ? sx(m.v) : bx} cy={y} r={5} fill="#fff" stroke={flag} strokeWidth={2.2} style={{ transition: `cx .8s cubic-bezier(.2,.8,.2,1) ${i * 80}ms` }} />
            {!compact && <text x={w} y={y + 4} textAnchor="end" fontSize={12} fill={T.muted}>{m.v} {m.u}</text>}
          </g>
        );
      })}
    </>
  );
}

// ── Air quality: Health Canada AQHI through the day ──
const AQ = [3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 5, 5, 4, 4, 4, 5, 5, 4, 4, 3, 3, 3];
function Aqhi({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, bot = compact ? 4 : 18, ph = h - top - bot, bw = w / AQ.length;
  const col = (v: number) => (v <= 3 ? C.green : v <= 6 ? C.amber : C.red);
  const now = AQ[10];
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Air quality · AQHI" : "Air quality today · AQHI (Calgary)"} value={`${now} · ${now <= 3 ? "low" : now <= 6 ? "moderate" : "high"} risk`} tone={col(now)} />
      {AQ.map((v, i) => { const bh = (v / 10) * ph; return <rect key={i} x={i * bw + 1} width={Math.max(1, bw - 2)} y={top + ph - (seen ? bh : 0)} height={seen ? bh : 0} rx={2} fill={col(v)} opacity={i === 10 ? 0.95 : 0.45} style={{ transition: `all .6s ease ${i * 20}ms` }} />; })}
      {!compact && ["00", "06", "12", "18", "24"].map((l, i) => <text key={l} x={Math.min(w - 8, Math.max(8, (i / 4) * w))} y={h - 3} textAnchor="middle" fontSize={10.5} fill={T.faint}>{l}</text>)}
    </>
  );
}

// ── Stress test: heart rate by Bruce stage vs 85 % of age-predicted max (age 50) ──
function Hr({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const hr = [72, 98, 118, 136, 151, 158, 132, 104, 88];
  const top = compact ? 24 : 30, bot = compact ? 4 : 18, ph = h - top - bot;
  const x = (i: number) => 6 + (i * (w - 12)) / (hr.length - 1), y = (v: number) => top + ph - ((v - 60) / (180 - 60)) * ph;
  const d = smooth(hr.map((v, i) => [x(i), y(v)]));
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Stress test · heart rate" : "Exercise stress test · heart rate"} value="peak 158 bpm" tone={C.teal} />
      <line x1={0} x2={w} y1={y(145)} y2={y(145)} stroke={C.amber} strokeDasharray="4 4" opacity={0.7} />
      {!compact && <text x={w} y={y(145) - 5} textAnchor="end" fontSize={10.5} fill={C.amber}>85% target · 145</text>}
      {[1, 2, 3, 4].map((s) => <rect key={s} x={x(s) - (w / 16)} y={top} width={w / 8} height={ph} fill={s % 2 ? (dark ? "rgba(255,255,255,.03)" : "#F6F9FA") : "transparent"} />)}
      <path d={d} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2.2} pathLength={1} style={drawIn(seen)} />
      {!compact && ["Rest", "Stage 1", "2", "3", "4", "", "Recovery", "", ""].map((l, i) => l && <text key={i} x={x(i)} y={h - 3} textAnchor="middle" fontSize={10.5} fill={T.faint}>{l}</text>)}
    </>
  );
}

// ── Record timeline: visits, tests and results over a year ──
const EVENTS: [number, string, string][] = [[0.04, "Referral", "doc"], [0.16, "Cardiology visit", "visit"], [0.3, "Echo", "test"], [0.44, "Lipid panel", "lab"], [0.6, "Follow-up", "visit"], [0.78, "Home BP log", "data"], [0.94, "Repeat lipids due", "due"]];
function Timeline({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, y = top + (h - top) * 0.45;
  const col: Record<string, string> = { doc: C.muted, visit: C.blue, test: C.teal, lab: C.green, data: C.teal, due: C.amber };
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Your record · 12 months" : "Your record · last 12 months"} value="7 entries" />
      <line x1={4} x2={w - 4} y1={y} y2={y} stroke={T.line} strokeWidth={2} />
      <line x1={4} x2={w - 4} y1={y} y2={y} stroke={C.teal} strokeWidth={2} pathLength={1} style={drawIn(seen, 1800)} />
      {EVENTS.map(([t, l, k], i) => {
        const x = 6 + t * (w - 12), up = i % 2 === 0, show = !compact && w / EVENTS.length > 52;
        return (
          <g key={l} style={{ opacity: seen ? 1 : 0, transition: `opacity .4s ease ${300 + i * 160}ms` }}>
            <circle cx={x} cy={y} r={k === "due" ? 6 : 4.5} fill={k === "due" ? "#fff" : col[k]} stroke={col[k]} strokeWidth={2} />
            {k === "due" && <circle cx={x} cy={y} r={10} fill="none" stroke={C.amber} opacity={0.5}><animate attributeName="r" values="7;13;7" dur="2.4s" repeatCount="indefinite" /></circle>}
            {show && <text x={Math.min(Math.max(x, 26), w - 26)} y={up ? y - 14 : y + 22} textAnchor="middle" fontSize={10.5} fill={k === "due" ? C.amber : T.muted}>{l}</text>}
          </g>
        );
      })}
    </>
  );
}

// ── Sleep vs morning blood pressure (each dot one night) ──
const SB: [number, number][] = [[5.2, 139], [5.6, 137], [5.8, 138], [6.0, 134], [6.2, 135], [6.4, 132], [6.6, 133], [6.8, 130], [7.0, 129], [7.2, 128], [7.4, 129], [7.6, 126], [5.4, 140], [6.9, 131], [7.8, 127], [6.1, 136]];
function SleepBp({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, bot = compact ? 6 : 20, left = compact ? 2 : 30, ph = h - top - bot, pw = w - left - 6;
  const x = (s: number) => left + ((s - 5) / 3) * pw, y = (b: number) => top + ph - ((b - 122) / 22) * ph;
  return (
    <>
      <Head w={w} dark={dark} title={compact ? "Sleep vs morning BP" : "Sleep vs next-morning systolic"} value="−6 mmHg / +1.5 h" tone={C.teal} />
      {!compact && [125, 135].map((v) => <g key={v}><line x1={left} x2={w} y1={y(v)} y2={y(v)} stroke={T.grid} /><text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill={T.faint}>{v}</text></g>)}
      <line x1={x(5.1)} y1={y(139.6)} x2={x(7.9)} y2={y(126.4)} stroke={C.blue} strokeWidth={1.6} strokeDasharray="5 5" opacity={0.7} />
      {SB.map(([s, b], i) => <circle key={i} cx={x(s)} cy={y(b)} r={seen ? 4 : 0} fill={C.teal} opacity={0.75} style={{ transition: `r .4s ease ${i * 40}ms` }} />)}
      {!compact && <text x={left} y={h - 4} fontSize={10.5} fill={T.faint}>sleep 5 h → 8 h · illustrative</text>}
    </>
  );
}

// ── Signal: many streams converging on one reading (Neyu at work) ──
function Signal({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 22 : 30, cy = top + (h - top) / 2, hx = w * 0.78;
  const labels = ["Results", "Imaging", "Wearables", "History", "Genes"];
  const ys = labels.map((_, i) => top + 8 + (i * (h - top - 16)) / (labels.length - 1));
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Signals → one reading" : "Five signals, read together"} value="Neyu" tone={C.blue} />
      {ys.map((yy, i) => { const d = `M${compact ? 4 : 64} ${yy} C${w * 0.45} ${yy}, ${w * 0.5} ${cy}, ${hx} ${cy}`; return (
        <g key={i}>
          <path d={d} fill="none" stroke={T.line} strokeWidth={1.2} />
          <path d={d} fill="none" stroke={`url(#${gid}l)`} strokeWidth={1.6} pathLength={1} style={drawIn(seen, 1200, i * 120)} />
          {seen && <circle r={2.6} fill={C.blue}><animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" path={d} /></circle>}
          {!compact && <text x={0} y={yy + 4} fontSize={11} fill={T.muted}>{labels[i]}</text>}
        </g>
      ); })}
      <circle cx={hx} cy={cy} r={16} fill={`url(#${gid}d)`} /><circle cx={hx} cy={cy} r={7} fill={`url(#${gid}l)`} />
      {w - hx > 40 && <text x={hx + 14} y={cy + 4} fontSize={11.5} fontWeight={600} fill={T.ink}>Insight</text>}
    </>
  );
}

// ── Flow: a diagnostic pathway ──
function Flow({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const st = ["Referral", "Test", "Report", "Review", "Plan"], top = compact ? 24 : 30, y = top + (h - top) / 2;
  return (
    <>
      <Head w={w} dark={dark} title="Diagnostic pathway" value="onsite" />
      <line x1={10} x2={w - 10} y1={y} y2={y} stroke={T.line} strokeWidth={2} />
      {st.map((s, i) => { const x = 10 + (i * (w - 20)) / (st.length - 1); return <g key={s} style={{ opacity: seen ? 1 : 0, transition: `opacity .4s ease ${i * 150}ms` }}><circle cx={x} cy={y} r={6} fill="#fff" stroke={C.teal} strokeWidth={2} />{!compact && w > 260 && <text x={Math.min(Math.max(x, 24), w - 24)} y={y + 22} textAnchor="middle" fontSize={10.5} fill={T.muted}>{s}</text>}</g>; })}
    </>
  );
}

// ── Breathing: respiratory rate and SpO2 ──
function Resp({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, ph = h - top - (compact ? 4 : 16), mid = top + ph / 2;
  const pts: [number, number][] = Array.from({ length: 61 }, (_, i) => [(i / 60) * w, mid - Math.sin((i / 60) * Math.PI * 2 * 4) * ph * 0.36]);
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "Breathing" : "Breathing · overnight"} value="14 /min · SpO₂ 96%" tone={C.teal} />
      <path d={smooth(pts)} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2} pathLength={1} style={drawIn(seen, 1600)} />
      {!compact && <text x={0} y={h - 3} fontSize={10.5} fill={T.faint}>illustrative</text>}
    </>
  );
}

// ── Microbiome: phylum composition + diversity ──
const PHYLA: [string, number, string][] = [["Firmicutes", 0.48, "#2FBF94"], ["Bacteroidetes", 0.34, "#1FA7B4"], ["Actinobacteria", 0.08, "#2273D6"], ["Proteobacteria", 0.05, "#7AA9D8"], ["Verrucomicrobia", 0.03, "#86D9B6"], ["Other", 0.02, "#C9D3DA"]];
function Microbiome({ w, h, dark, seen, compact }: P) {
  const T = dark ? DK : C;
  const top = compact ? 24 : 30, bh = 14; let x = 0;
  return (
    <>
      <Head w={w} dark={dark} title="Gut microbiome · composition" value="diversity: high" tone={C.teal} />
      {PHYLA.map(([n, p, c]) => { const el = <rect key={n} x={x} y={top + 6} width={seen ? Math.max(0, p * w - 2) : 0} height={bh} rx={4} fill={c} style={{ transition: "width .9s cubic-bezier(.2,.8,.2,1)" }} />; x += p * w; return el; })}
      {!compact && PHYLA.slice(0, Math.max(1, Math.floor((h - top - 34) / 18))).map(([n, p, c], i) => <g key={n}><circle cx={5} cy={top + 40 + i * 18} r={4} fill={c} /><text x={14} y={top + 44 + i * 18} fontSize={11.5} fill={T.ink2}>{n}</text><text x={w} y={top + 44 + i * 18} textAnchor="end" fontSize={11.5} fill={T.muted}>{Math.round(p * 100)}%</text></g>)}
    </>
  );
}

// ── Wearables: resting heart rate and HRV over 7 days ──
function Hrv({ w, h, dark, seen, gid, compact }: P) {
  const T = dark ? DK : C;
  const hrv = [42, 45, 39, 48, 51, 47, 53], rhr = [64, 63, 66, 61, 60, 61, 59];
  const top = compact ? 24 : 30, bot = compact ? 4 : 18, ph = h - top - bot;
  const x = (i: number) => 8 + (i * (w - 16)) / 6, y1 = (v: number) => top + ph - ((v - 30) / 30) * ph, y2 = (v: number) => top + ph - ((v - 55) / 15) * ph;
  return (
    <>
      <Grad id={gid} />
      <Head w={w} dark={dark} title={compact ? "HRV · resting HR" : "Watch · HRV and resting heart rate"} value="HRV 53 ms ↑" tone={C.teal} />
      <path d={smooth(hrv.map((v, i) => [x(i), y1(v)]))} fill="none" stroke={`url(#${gid}l)`} strokeWidth={2.2} pathLength={1} style={drawIn(seen)} />
      <path d={smooth(rhr.map((v, i) => [x(i), y2(v)]))} fill="none" stroke={T.faint} strokeWidth={1.6} strokeDasharray="4 4" />
      {hrv.map((v, i) => <circle key={i} cx={x(i)} cy={y1(v)} r={3} fill="#fff" stroke={C.blue} strokeWidth={1.6} />)}
      {!compact && <text x={0} y={h - 3} fontSize={10.5} fill={T.faint}>— HRV (ms)  - - resting HR (bpm) · 7 days</text>}
    </>
  );
}

const MODES: Record<string, (p: P) => React.ReactElement> = {
  ecg: Ecg, bp: Bp, ldl: Ldl, glucose: Glucose, activity: Activity, trend: Trend, dna: Genome, genome: Genome, echo: Echo, bars: Bars, biomarkers: Bars,
  aqhi: Aqhi, hr: Hr, stress: Hr, timeline: Timeline, signal: Signal, sleepbp: SleepBp, flow: Flow, resp: Resp, microbiome: Microbiome, hrv: Hrv,
};
export const CHART_LABEL: Record<string, string> = {
  ecg: "Heart rhythm, ECG lead II", bp: "Home blood pressure, 14 days", ldl: "LDL cholesterol on the CCS ranges", glucose: "Glucose over 24 hours", activity: "Active minutes this week",
  trend: "Risk factors in range over 12 months", dna: "Genome ideogram with actionable genes", echo: "Echocardiogram ejection fraction", bars: "Biomarker panel", aqhi: "Air quality index today",
  hr: "Exercise stress test heart rate", timeline: "Health record timeline", signal: "Five signals converging", sleepbp: "Sleep versus morning blood pressure", flow: "Diagnostic pathway", resp: "Breathing overnight",
  microbiome: "Gut microbiome composition", hrv: "Heart rate variability and resting heart rate",
};

/** One NEYU chart. `mode` picks the chart; `param` tunes it (bpm, LDL×10, active minutes). */
export function NChart({ mode, param, height = 200, dark, label }: { mode: string; param?: number; height?: number | string; dark?: boolean; label?: string }) {
  const [ref, box] = useBox<HTMLDivElement>();
  const seen = useSeen(ref);
  const live = useOnScreen(ref);
  const gid = useId().replace(/:/g, "");
  const Comp = MODES[mode] || Trend;
  const compact = box.h > 0 && box.h < 150;
  return (
    <div ref={ref} role="img" aria-label={(label || CHART_LABEL[mode] || mode) + " — illustrative"} style={{ position: "relative", width: "100%", height, minWidth: 0 }}>
      {box.w > 20 && box.h > 20 && (
        <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{ position: "absolute", inset: 0, overflow: "visible", fontFamily: "inherit" }}>
          <Comp w={box.w} h={box.h} dark={dark} param={param} seen={seen} live={live} gid={gid} compact={compact} />
        </svg>
      )}
    </div>
  );
}
