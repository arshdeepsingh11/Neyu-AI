"use client";

// Lightweight 3D (canvas + perspective projection, no WebGL library):
// Helix3D — rotating DNA double helix with clickable pathway nodes.
// Chromosome3D — an X chromosome whose telomere caps shorten with "stress",
// while GDF-15 signal particles stream out (illustrative, not data).
import React, { useEffect, useRef } from "react";

function useCanvas(draw: (g: CanvasRenderingContext2D, w: number, h: number, t: number, s: { rot: number; tilt: number }) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ rot: 0, tilt: 0.25, drag: false, x: 0, y: 0, vel: 0.35 });
  const drawRef = useRef(draw); drawRef.current = draw;
  useEffect(() => {
    const c = ref.current!; const g = c.getContext("2d")!;
    let raf = 0, last = performance.now(), visible = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const size = () => { const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(c);
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const s = state.current;
      if (!s.drag) s.rot += s.vel * dt * (reduce ? 0.45 : 1);
      if (!s.drag) s.vel += (0.35 - s.vel) * dt * 1.5;
      if (visible) { const r = c.getBoundingClientRect(); g.clearRect(0, 0, r.width, r.height); drawRef.current(g, r.width, r.height, t / 1000, s); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const down = (e: PointerEvent) => { const s = state.current; s.drag = true; s.x = e.clientX; s.y = e.clientY; c.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { const s = state.current; if (!s.drag) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; s.rot += dx * 0.01; s.vel = dx * 0.6; s.tilt = Math.max(-0.6, Math.min(0.9, s.tilt + dy * 0.004)); s.x = e.clientX; s.y = e.clientY; };
    const up = () => { state.current.drag = false; };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const proj = (x: number, y: number, z: number, w: number, h: number, tilt: number) => {
  const cy = Math.cos(tilt), sy = Math.sin(tilt);
  const y2 = y * cy - z * sy, z2 = y * sy + z * cy;
  const f = 520 / (520 + z2);
  return { x: w / 2 + x * f, y: h / 2 + y2 * f, z: z2, f };
};

export function Helix3D({ nodes, active, onPick, height = 420, label = "3D model of DNA with longevity pathways — drag to rotate" }: { nodes: { id: string; name: string; color: string }[]; active?: string | null; onPick?: (id: string) => void; height?: number; label?: string }) {
  const hits = useRef<{ id: string; x: number; y: number; r: number }[]>([]);
  const ref = useCanvas((g, w, h, t, s) => {
    const N = 64, STEP = 0.3, R = Math.min(w * 0.26, 110), H = h * 0.84;
    type P = { x: number; y: number; z: number; f: number; kind: "a" | "b" | "rung" | "seg" | "node"; i: number; x2?: number; y2?: number; id?: string; color?: string; col?: string };
    const items: P[] = [];
    let pa: ReturnType<typeof proj> | null = null, pb: ReturnType<typeof proj> | null = null;
    for (let i = 0; i < N; i++) {
      const a = i * STEP + s.rot, y = (i / (N - 1) - 0.5) * H;
      const p1 = proj(Math.cos(a) * R, y, Math.sin(a) * R, w, h, s.tilt);
      const p2 = proj(Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R, w, h, s.tilt);
      if (i % 2 === 0) items.push({ ...p1, kind: "a", i }, { ...p2, kind: "b", i });
      if (pa && pb) items.push({ x: pa.x, y: pa.y, x2: p1.x, y2: p1.y, z: (pa.z + p1.z) / 2, f: (pa.f + p1.f) / 2, kind: "seg", i, col: "110,168,182" }, { x: pb.x, y: pb.y, x2: p2.x, y2: p2.y, z: (pb.z + p2.z) / 2, f: (pb.f + p2.f) / 2, kind: "seg", i, col: "42,132,228" });
      if (i % 3 === 0) items.push({ x: p1.x, y: p1.y, z: (p1.z + p2.z) / 2, f: (p1.f + p2.f) / 2, kind: "rung", i, x2: p2.x, y2: p2.y });
      pa = p1; pb = p2;
    }
    nodes.forEach((n, k) => {
      const i = Math.round(((k + 0.5) / nodes.length) * (N - 1)), a = i * STEP + s.rot + Math.PI / 2, y = (i / (N - 1) - 0.5) * H;
      const p = proj(Math.cos(a) * (R + 46), y, Math.sin(a) * (R + 46), w, h, s.tilt);
      items.push({ ...p, kind: "node", i, id: n.id, color: n.color });
    });
    items.sort((a, b) => b.z - a.z);
    hits.current = [];
    for (const it of items) {
      const depth = Math.max(0.25, Math.min(1, (it.f - 0.7) * 2.4));
      if (it.kind === "seg") { g.strokeStyle = `rgba(${it.col},${0.2 + depth * 0.8})`; g.lineWidth = 3.2 * it.f; g.lineCap = "round"; g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.x2!, it.y2!); g.stroke(); continue; }
      if (it.kind === "rung") { g.strokeStyle = `rgba(42,132,228,${0.12 + depth * 0.25})`; g.lineWidth = 2 * it.f; g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.x2!, it.y2!); g.stroke(); continue; }
      if (it.kind === "node") {
        const on = active === it.id, r = (on ? 13 : 9) * it.f, pulse = 1 + Math.sin(t * 3 + it.i) * 0.15;
        const grd = g.createRadialGradient(it.x, it.y, 0, it.x, it.y, r * 3 * pulse); grd.addColorStop(0, it.color + "AA"); grd.addColorStop(1, it.color + "00");
        g.fillStyle = grd; g.beginPath(); g.arc(it.x, it.y, r * 3 * pulse, 0, 7); g.fill();
        g.fillStyle = it.color; g.globalAlpha = 0.35 + depth * 0.65; g.beginPath(); g.arc(it.x, it.y, r, 0, 7); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = "#fff"; g.lineWidth = on ? 3 : 1.5; g.stroke();
        hits.current.push({ id: it.id!, x: it.x, y: it.y, r: Math.max(18, r * 2) });
        continue;
      }
      const col = it.kind === "a" ? "110,168,182" : "42,132,228";
      g.fillStyle = `rgba(${col},${0.25 + depth * 0.75})`; g.beginPath(); g.arc(it.x, it.y, 3.4 * it.f, 0, 7); g.fill();
    }
  }, []);
  return (
    <canvas ref={ref} role="img" aria-label={label} style={{ width: "100%", height, display: "block", cursor: "grab", touchAction: "pan-y" }}
      onClick={(e) => { const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; const hit = hits.current.find((h) => Math.hypot(h.x - x, h.y - y) < h.r); if (hit) onPick?.(hit.id); }} />
  );
}

export function Chromosome3D({ telomere, stress, height = 380 }: { telomere: number; stress: number; height?: number }) {
  const parts = useRef(Array.from({ length: 90 }, () => ({ a: Math.random() * Math.PI * 2, b: Math.random() * Math.PI - Math.PI / 2, d: Math.random(), sp: 0.3 + Math.random() * 0.7 })));
  const ref = useCanvas((g, w, h, t, s) => {
    const L = Math.min(w, h) * 0.36, arms = [[0.55, 1], [-0.55, 1], [0.55, -1], [-0.55, -1]];
    type D = { x: number; y: number; z: number; f: number; r: number; cap: boolean; glow?: boolean; life?: number };
    const dots: D[] = [];
    arms.forEach(([dx, dy], k) => {
      for (let i = 0; i <= 22; i++) {
        const u = i / 22, x0 = dx * L * u * 0.9 + (k % 2 ? -6 : 6), y0 = dy * L * u, z0 = Math.sin(u * 6 + k) * 6;
        const rx = x0 * Math.cos(s.rot) - z0 * Math.sin(s.rot), rz = x0 * Math.sin(s.rot) + z0 * Math.cos(s.rot);
        const p = proj(rx, y0, rz, w, h, s.tilt * 0.4);
        const cap = u > 1 - 0.28 * telomere;
        dots.push({ ...p, r: (14 - u * 3) * p.f, cap });
      }
    });
    // GDF-15 signal particles radiating from the cell centre
    const n = Math.round(parts.current.length * stress);
    parts.current.slice(0, n).forEach((q) => {
      const life = ((t * q.sp * 0.35 + q.d) % 1), r = 40 + life * L * 1.35;
      const x0 = Math.cos(q.a) * Math.cos(q.b) * r, y0 = Math.sin(q.b) * r, z0 = Math.sin(q.a) * Math.cos(q.b) * r;
      const rx = x0 * Math.cos(s.rot * 0.5) - z0 * Math.sin(s.rot * 0.5), rz = x0 * Math.sin(s.rot * 0.5) + z0 * Math.cos(s.rot * 0.5);
      const p = proj(rx, y0, rz, w, h, s.tilt * 0.4);
      dots.push({ ...p, r: 2.6 * p.f, cap: false, glow: true, life });
    });
    // membrane
    g.strokeStyle = "rgba(42,132,228,.18)"; g.lineWidth = 1.5; g.setLineDash([4, 6]); g.beginPath(); g.ellipse(w / 2, h / 2, L * 1.35, L * 1.1, 0, 0, 7); g.stroke(); g.setLineDash([]);
    dots.sort((a, b) => b.z - a.z).forEach((d) => {
      const depth = Math.max(0.3, Math.min(1, (d.f - 0.7) * 2.4));
      if (d.glow) { const life = d.life ?? 0; g.fillStyle = `rgba(214,96,110,${(1 - life) * 0.85})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill(); return; }
      if (d.cap) { const grd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.8); grd.addColorStop(0, "rgba(46,196,160,.9)"); grd.addColorStop(1, "rgba(46,196,160,0)"); g.fillStyle = grd; g.beginPath(); g.arc(d.x, d.y, d.r * 1.8, 0, 7); g.fill(); }
      g.fillStyle = d.cap ? `rgba(27,175,122,${0.5 + depth * 0.5})` : `rgba(29,95,168,${0.35 + depth * 0.6})`;
      g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill();
    });
  }, []);
  return <canvas ref={ref} role="img" aria-label="3D chromosome: green telomere caps and red GDF-15 stress signals (illustrative) — drag to rotate" style={{ width: "100%", height, display: "block", cursor: "grab", touchAction: "pan-y" }} />;
}
