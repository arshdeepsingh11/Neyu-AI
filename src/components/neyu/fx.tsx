"use client";

// NEYU futuristic components — built without extra libraries (CSS 3D, canvas and
// raw WebGL), so nothing new to install. Every effect pauses off-screen, respects
// "reduce motion", and falls back to a calm static layout.
//   Marquee3D · SphereGallery · PlanetSystem · SignalConvergence · Coverflow ·
//   BeamFlow · EvervaultCard · PillNav · useDock (proximity magnification)
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NIcon } from "./icons";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// Motion never stops completely: with the phone's "Reduce Motion" setting on,
// effects keep moving at a calmer speed (the owner wants them alive everywhere).
const pace = () => (prefersReduced() ? 0.45 : 1);
function useVisible<T extends Element>(ref: React.RefObject<T>, margin = "100px") {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setV(true); return; }
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: margin }); io.observe(el); return () => io.disconnect();
  }, [ref, margin]);
  return v;
}

// ─────────────────────────────────────────────────────────────
// Focused 3D Marquee — physical 3D tiles glide past a central lens; the tile in
// the lens scales up and sharpens; hover slows the whole strip.
export type MarqueeItem = { icon: string; label: string; sub?: string; href?: string };
export function Marquee3D({ items, speed = 38, dark, height = 210 }: { items: MarqueeItem[]; speed?: number; dark?: boolean; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLElement | null)[]>([]);
  const vis = useVisible(wrap);
  const slow = useRef(false);
  // Swipe / drag state: the strip follows the finger, then glides on with the
  // flick's momentum (either direction) and eases back to its own drift.
  const drag = useRef({ on: false, id: -1, x: 0, t: 0, vel: 0, moved: 0, push: 0 });
  const offRef = useRef(0);
  const list = [...items, ...items, ...items];
  const GAP = 150;
  useIso(() => {
    const el = wrap.current; if (!el) return;
    let v = speed * pace(), raf = 0, last = performance.now();
    const place = () => {
      const off = offRef.current;
      const W = el.clientWidth, total = list.length * GAP, mid = W / 2;
      tiles.current.forEach((t, i) => {
        if (!t) return;
        let x = ((i * GAP - off) % total + total) % total - total / 3 + mid - GAP / 2;
        if (x < -GAP * 2) x += total; if (x > W + GAP) x -= total;
        const d = (x + GAP / 2 - mid) / (W / 2); const ad = Math.min(1.4, Math.abs(d));
        const s = 1.32 - ad * 0.5, ry = Math.max(-48, Math.min(48, -d * 42)), z = -ad * 160;
        t.style.transform = `translate3d(${x.toFixed(1)}px,-50%,${z.toFixed(0)}px) rotateY(${ry.toFixed(1)}deg) scale(${s.toFixed(3)})`;
        t.style.opacity = String(Math.max(0, 1 - ad * 0.55));
        t.style.filter = ad < 0.18 ? "none" : `blur(${Math.min(2.4, (ad - 0.18) * 2.2).toFixed(2)}px)`;
        t.style.zIndex = String(100 - Math.round(ad * 50));
        t.dataset.focus = ad < 0.18 ? "1" : "0";
      });
    };
    place();
    if (!vis) return;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const D = drag.current;
      if (D.on) v = 0;
      else {
        if (D.push) { v = D.push; D.push = 0; }
        const target = (slow.current ? speed * 0.15 : speed) * pace();
        v += (target - v) * (Math.abs(v) > speed * 2 ? 0.035 : 0.06);
        offRef.current += v * dt;
      }
      place(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [vis, speed, list.length]);
  const down = (e: React.PointerEvent) => { const D = drag.current; D.on = true; D.id = e.pointerId; D.x = e.clientX; D.t = performance.now(); D.vel = 0; D.moved = 0; };
  const move = (e: React.PointerEvent) => {
    const D = drag.current; if (!D.on || e.pointerId !== D.id) return;
    const dx = e.clientX - D.x, now = performance.now(), dt = Math.max(1, now - D.t);
    if (D.moved < 6 && Math.abs(dx) + D.moved >= 6) { try { wrap.current?.setPointerCapture(e.pointerId); } catch {} }
    D.moved += Math.abs(dx); offRef.current -= dx; D.vel = D.vel * 0.6 + (-dx / dt) * 1000 * 0.4; D.x = e.clientX; D.t = now;
  };
  const up = (e: React.PointerEvent) => { const D = drag.current; if (!D.on || e.pointerId !== D.id) return; D.on = false; D.push = Math.max(-1800, Math.min(1800, D.vel)); };
  return (
    <div ref={wrap} onMouseEnter={() => (slow.current = true)} onMouseLeave={() => (slow.current = false)} onFocus={() => (slow.current = true)} onBlur={() => (slow.current = false)}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={(e) => { if (drag.current.moved > 6) { e.preventDefault(); e.stopPropagation(); } }}
      style={{ position: "relative", height, perspective: 900, overflow: "hidden", touchAction: "pan-y", cursor: "grab", userSelect: "none", WebkitUserSelect: "none", maskImage: "linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 168, height: 168, transform: "translate(-50%,-50%)", borderRadius: 40, border: `1px solid ${dark ? "rgba(126,224,192,.35)" : "rgba(31,167,180,.35)"}`, boxShadow: dark ? "0 0 60px rgba(31,167,180,.25)" : "0 0 60px rgba(31,167,180,.18)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
        {list.map((it, i) => {
          const Tag = (it.href ? "a" : "div") as "a";
          return (
            <Tag key={i} ref={(n: HTMLElement | null) => { tiles.current[i] = n; }} href={it.href} draggable={false} aria-hidden={i < items.length || i >= items.length * 2 ? true : undefined} tabIndex={i < items.length || i >= items.length * 2 ? -1 : undefined}
              style={{ position: "absolute", top: "50%", left: 0, width: GAP - 22, display: "grid", justifyItems: "center", gap: 10, textDecoration: "none", willChange: "transform", transformStyle: "preserve-3d" }}>
              <span style={{ width: 86, height: 86, borderRadius: 24, display: "grid", placeItems: "center", position: "relative",
                background: dark ? "linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.03))" : "linear-gradient(150deg,#FFFFFF 0%,#EEF6F4 60%,#E4EEF8 100%)",
                border: `1px solid ${dark ? "rgba(255,255,255,.18)" : "rgba(14,27,44,.08)"}`,
                boxShadow: dark ? "0 18px 30px -16px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.2)" : "0 1px 0 #fff inset, 0 -3px 0 rgba(14,27,44,.04) inset, 0 22px 34px -20px rgba(14,27,44,.45), 0 6px 0 -2px #E3ECEF" }}>
                <NIcon name={it.icon} size={38} tone={dark ? "#BDEFE0" : "grad"} stroke={1.4} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: dark ? "#EAF2F6" : "#0E1B2C", textAlign: "center", lineHeight: 1.25 }}>{it.label}</span>
              {it.sub && <span style={{ fontSize: 11.5, color: dark ? "rgba(234,242,246,.6)" : "#6B7885", textAlign: "center", marginTop: -6 }}>{it.sub}</span>}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scroll Rotate Gallery — cards on the surface of a 3D sphere; the sphere turns
// as the page scrolls (and can be dragged). Cards facing away fade back.
export function SphereGallery<T>({ items, render, radius = 340, height = 560, label, flatten = 0.62, cardW = 168 }: { items: T[]; render: (item: T, i: number, front: boolean) => React.ReactNode; radius?: number; height?: number; label: string; /** under 0.4: an orbit of cards that always face you; otherwise a sphere (1 = full) */ flatten?: number; /** card width, so the orbit stays inside its container */ cardW?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [R, setR] = useState(radius);
  const drag = useRef({ on: false, x: 0, y: 0, ax: 0, ay: 0 });
  const rot = useRef({ x: -8, y: 0, dx: 0, dy: 0 });
  const vis = useVisible(host);
  const ring = flatten < 0.4;
  const pts = React.useMemo(() => items.map((_, i) => { // Fibonacci sphere, flattened a little so the band reads well
    const n = items.length;
    if (flatten < 0.4) return { lat: (i % 2 ? 1 : -1) * 10, lon: (i * 360) / n }; // orbit: lat is a small vertical stagger in px
    const k = i + 0.5, phi = Math.acos(1 - (2 * k) / n), th = Math.PI * (1 + Math.sqrt(5)) * k;
    const lat = (90 - (phi * 180) / Math.PI) * flatten, lon = ((th * 180) / Math.PI) % 360;
    return { lat, lon };
  }), [items, flatten]);
  const [sc, setSc] = useState(1);
  const [narrowG, setNarrowG] = useState(false);
  useEffect(() => { const el = host.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => { const w = e.contentRect.width; setNarrowG(w < 480); setR(w < 480 ? w * 0.5 : Math.max(120, Math.min(radius, w * 0.36))); setSc(w < 480 ? 0.78 : Math.min(1, w / 520)); }); ro.observe(el); return () => ro.disconnect(); }, [radius]);
  useEffect(() => {
    if (!vis) return;
    let raf = 0;
    const apply = () => {
      const el = host.current; if (!el) return;
      const rect = el.getBoundingClientRect(); const p = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const scrollY = (p - 0.5) * 260;
      const ry = scrollY + rot.current.dy + rot.current.dx, rx = rot.current.x;
      if (ring) {
        // Orbit mode: every card faces the viewer and travels a tilted ellipse, so the whole team stays readable.
        if (ball.current) ball.current.style.transform = `scale(${sc})`;
        pts.forEach((pt, i) => {
          const c = cards.current[i]; if (!c) return;
          const hw = host.current?.clientWidth || 400, amp = Math.max(60, (hw / 2 - (cardW * sc) / 2 - 12) / sc);
          const a = ((pt.lon + ry) * Math.PI) / 180, x = Math.sin(a) * amp, z = (Math.cos(a) - 1) * R * 0.9, y = (Math.cos(a) * 0.5 + Math.sin(rx * Math.PI / 180) * 0.3) * R * 0.85 + pt.lat;
          const front = (Math.cos(a) + 1) / 2;
          c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) translate(-50%,-50%)`;
          c.style.opacity = String(0.3 + 0.7 * Math.pow(front, 1.4));
          c.style.zIndex = String(Math.round(front * 100));
          c.style.pointerEvents = front > 0.6 ? "auto" : "none";
          c.style.filter = front < 0.45 ? `blur(${((0.45 - front) * 3).toFixed(1)}px)` : "none";
        });
        if (!drag.current.on) rot.current.dy += 0.05 * pace();
        raf = requestAnimationFrame(apply);
        return;
      }
      if (ball.current) ball.current.style.transform = `scale(${sc}) translateZ(${-R}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      pts.forEach((pt, i) => {
        const c = cards.current[i]; if (!c) return;
        const a = ((pt.lon + ry) * Math.PI) / 180, b = ((pt.lat + rx) * Math.PI) / 180;
        const facing = Math.cos(a) * Math.cos(b);
        c.style.opacity = String(0.14 + 0.86 * Math.pow((facing + 1) / 2, 1.6));
        c.style.zIndex = String(Math.round((facing + 1) * 50));
        c.style.pointerEvents = facing > 0.55 ? "auto" : "none";
        c.dataset.front = facing > 0.75 ? "1" : "0";
      });
      if (!drag.current.on) rot.current.dy += 0.04 * pace();
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [vis, R, pts, sc, ring, cardW]);
  const down = (e: React.PointerEvent) => { drag.current = { on: true, x: e.clientX, y: e.clientY, ax: rot.current.dx, ay: rot.current.x }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (!drag.current.on) return; rot.current.dx = drag.current.ax + (e.clientX - drag.current.x) * 0.25; rot.current.x = Math.max(-30, Math.min(30, drag.current.ay - (e.clientY - drag.current.y) * 0.15)); };
  const up = () => { drag.current.on = false; };
  return (
    <div ref={host} role="region" aria-label={label} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ position: "relative", height: narrowG ? Math.min(height, 320) : height, perspective: 1400, touchAction: "pan-y", cursor: "grab", userSelect: "none" }}>
      <div ref={ball} style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transformStyle: "preserve-3d", transform: ring ? "none" : `translateZ(${-R}px)` }}>
        {items.map((it, i) => (
          <div key={i} ref={(n) => { cards.current[i] = n; }} style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", backfaceVisibility: "hidden", transform: ring ? "translate(-50%,-50%)" : `rotateY(${pts[i].lon}deg) rotateX(${-pts[i].lat}deg) translateZ(${R}px) translate(-50%,-50%)`, transition: ring ? "none" : "opacity .3s" }}>
            {render(it, i, false)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Planet System — a procedural planet with atmosphere, specular light that
// follows the cursor, and labelled moons in orbit (canvas, low-res shading).
function hash(x: number, y: number, z: number) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x: number, y: number, z: number) => noise3(x, y, z) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.15;
export type Moon = { label: string; color?: string; r?: number; orbit?: number; speed?: number; tilt?: number };
export function PlanetSystem({ type = "verdant", moons = [], height = 420, label, onMoon }: { type?: "verdant" | "ocean" | "dusk"; moons?: Moon[]; height?: number; label: string; onMoon?: (i: number) => void }) {
  const host = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const vis = useVisible(host);
  const light = useRef({ x: -0.55, y: -0.45 });
  const [hot, setHot] = useState<number | null>(null);
  const moonPos = useRef<{ x: number; y: number; r: number; front: boolean }[]>([]);
  const pal = type === "ocean" ? [[14, 60, 110], [31, 140, 190], [120, 220, 200], [230, 248, 244]] : type === "dusk" ? [[30, 30, 70], [70, 80, 160], [150, 120, 200], [240, 220, 250]] : [[16, 74, 92], [31, 167, 180], [60, 199, 158], [210, 246, 228]];
  useEffect(() => {
    const c = cv.current, el = host.current; if (!c || !el) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const N = 150; const buf = document.createElement("canvas"); buf.width = N; buf.height = N; const bctx = buf.getContext("2d")!; const img = bctx.createImageData(N, N);
    let raf = 0, t0 = performance.now(), last = 0;
    const draw = (now: number) => {
      const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const t = (now - t0) / 1000, rot = t * 0.12 * pace();
      const R = Math.min(W * 0.22, H * 0.3), cx = W / 2, cy = H / 2;
      // planet surface — re-shade at ~30 fps
      if (now - last > 33) {
        last = now; const L = light.current; const lz = Math.sqrt(Math.max(0.05, 1 - L.x * L.x - L.y * L.y));
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const nx = (i / N) * 2 - 1, ny = (j / N) * 2 - 1, d2 = nx * nx + ny * ny, o = (j * N + i) * 4;
          if (d2 > 1) { img.data[o + 3] = 0; continue; }
          const nz = Math.sqrt(1 - d2);
          const sx = nx * Math.cos(rot) + nz * Math.sin(rot), sz = -nx * Math.sin(rot) + nz * Math.cos(rot);
          const h = fbm(sx * 1.8 + 3, ny * 1.8 + 1, sz * 1.8 + 7) + ny * 0.06;
          const band = Math.max(0, Math.min(3, (h - 0.28) * 7)); const k = Math.floor(Math.min(2, band)), f = band - k;
          const a = pal[k], b = pal[k + 1];
          const diff = Math.max(0, nx * L.x + ny * L.y + nz * lz) * 0.95 + 0.08;
          const hv = [L.x, L.y, lz + 1]; const hl = Math.hypot(hv[0], hv[1], hv[2]); const spec = Math.pow(Math.max(0, (nx * hv[0] + ny * hv[1] + nz * hv[2]) / hl), 40) * (h < 0.45 ? 0.9 : 0.25);
          for (let q = 0; q < 3; q++) img.data[o + q] = Math.min(255, (a[q] + (b[q] - a[q]) * f) * diff + spec * 255);
          img.data[o + 3] = 255;
        }
        bctx.putImageData(img, 0, 0);
      }
      // moons behind the planet
      const mp: { x: number; y: number; r: number; front: boolean }[] = [];
      const moonAt = (m: Moon, i: number) => { const orb = R * (m.orbit || 1.55 + i * 0.32), sp = m.speed || 0.35 - i * 0.05, a = t * sp * pace() + i * 1.9, tilt = m.tilt ?? 0.32; const x = cx + Math.cos(a) * orb, y = cy + Math.sin(a) * orb * tilt, front = Math.sin(a) > 0; return { x, y, r: (m.r || 9) * (front ? 1.1 : 0.85), front }; };
      moons.forEach((m, i) => { mp[i] = moonAt(m, i); });
      // orbits
      ctx.lineWidth = 1;
      moons.forEach((m, i) => { const orb = R * (m.orbit || 1.55 + i * 0.32); ctx.strokeStyle = "rgba(31,167,180,.18)"; ctx.beginPath(); ctx.ellipse(cx, cy, orb, orb * (m.tilt ?? 0.32), 0, 0, Math.PI * 2); ctx.stroke(); });
      const drawMoon = (m: Moon, i: number) => { const p = mp[i]; const g = ctx.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.4, p.r * 0.1, p.x, p.y, p.r); g.addColorStop(0, "#fff"); g.addColorStop(1, m.color || "#1FA7B4"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (hot === i ? 1.35 : 1), 0, Math.PI * 2); ctx.fill();
        ctx.font = "500 12.5px var(--font-dm-sans), system-ui, sans-serif"; ctx.fillStyle = p.front ? "rgba(14,27,44,.86)" : "rgba(14,27,44,.38)"; ctx.textAlign = "center"; ctx.fillText(m.label, p.x, p.y - p.r - 8); };
      moons.forEach((m, i) => { if (!mp[i].front) drawMoon(m, i); });
      // atmosphere + planet
      const atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.35); atm.addColorStop(0, "rgba(60,199,158,.35)"); atm.addColorStop(1, "rgba(34,115,214,0)"); ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();
      ctx.imageSmoothingEnabled = true; ctx.drawImage(buf, cx - R, cy - R, R * 2, R * 2);
      const rim = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.02); rim.addColorStop(0, "rgba(255,255,255,0)"); rim.addColorStop(1, "rgba(190,240,230,.45)"); ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R * 1.01, 0, Math.PI * 2); ctx.fill();
      moons.forEach((m, i) => { if (mp[i].front) drawMoon(m, i); });
      moonPos.current = mp;
      if (vis) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [vis, type, moons, hot, pal]);
  const onMove = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    light.current = { x: Math.max(-0.85, Math.min(0.85, (x / r.width - 0.5) * 1.6)), y: Math.max(-0.85, Math.min(0.85, (y / r.height - 0.5) * 1.6)) };
    const i = moonPos.current.findIndex((p) => Math.hypot(p.x - x, p.y - y) < p.r + 12); setHot(i >= 0 ? i : null);
  };
  return (
    <div ref={host} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHot(null)} onClick={() => hot !== null && onMoon?.(hot)} style={{ position: "relative", height, cursor: hot !== null ? "pointer" : "default" }}>
      <canvas ref={cv} style={{ position: "absolute", inset: 0 }} />
      {moons.length > 0 && <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{moons.map((m, i) => <button key={m.label} onClick={() => onMoon?.(i)}>{m.label}</button>)}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Signal Convergence — streaming signal lines in 3D space converging on a hub
// node; the camera tilts toward the cursor (canvas 2D with perspective projection).
export function SignalConvergence({ height = 380, labels = ["Results", "Imaging", "Wearables", "History", "Genes", "Lifestyle"], hub = "Neyu", dark }: { height?: number | string; labels?: string[]; hub?: string; dark?: boolean }) {
  const host = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const vis = useVisible(host);
  const tilt = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    const c = cv.current, el = host.current; if (!c || !el) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const S = labels.map((l, i) => { const a = (i / labels.length) * Math.PI * 2 + 0.3, e = (i % 2 ? 0.62 : -0.5); return { l, x: Math.cos(a) * Math.cos(e), y: Math.sin(e), z: Math.sin(a) * Math.cos(e) }; });
    const parts = Array.from({ length: 70 }, (_, i) => ({ s: i % S.length, t: Math.random(), v: 0.18 + Math.random() * 0.25, w: (Math.random() - 0.5) * 0.25 }));
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const T = tilt.current; T.x += (T.tx - T.x) * 0.05; T.y += (T.ty - T.y) * 0.05;
      const rotY = (now / 9000) * pace() + T.x * 0.6, rotX = 0.25 + T.y * 0.4, R = Math.min(W, H * 1.6) * 0.42, F = 900;
      const proj = (x: number, y: number, z: number) => { const x1 = x * Math.cos(rotY) - z * Math.sin(rotY), z1 = x * Math.sin(rotY) + z * Math.cos(rotY); const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX), z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX); const k = F / (F + z2 * R); return { x: W / 2 + x1 * R * k, y: H / 2 + y1 * R * k, k, z: z2 }; };
      const pathPt = (s: (typeof S)[number], t: number, w = 0) => { const u = 1 - t; const bx = s.x * (u * u + 0.4 * u * t) + w * u * t, by = s.y * (u * u + 0.4 * u * t) + s.y * 0.3 * u * t, bz = s.z * (u * u + 0.4 * u * t); return proj(bx, by, bz); };
      // streams
      S.forEach((s) => { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const p = pathPt(s, i / 30); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } const g = ctx.createLinearGradient(proj(s.x, s.y, s.z).x, proj(s.x, s.y, s.z).y, W / 2, H / 2); g.addColorStop(0, dark ? "rgba(126,224,192,.15)" : "rgba(47,191,148,.18)"); g.addColorStop(1, dark ? "rgba(90,160,255,.55)" : "rgba(34,115,214,.5)"); ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.stroke(); });
      // particles
      parts.forEach((p) => { p.t += p.v * dt * pace(); if (p.t > 1) { p.t = 0; p.s = Math.floor(Math.random() * S.length); } const q = pathPt(S[p.s], p.t, p.w); ctx.fillStyle = `rgba(${dark ? "150,230,210" : "31,167,180"},${0.35 + p.t * 0.6})`; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2 + p.t * 2.2 * q.k, 0, Math.PI * 2); ctx.fill(); });
      // source nodes + labels
      S.map((s) => ({ s, p: proj(s.x, s.y, s.z) })).sort((a, b) => b.p.z - a.p.z).forEach(({ s, p }) => {
        ctx.fillStyle = dark ? "rgba(13,27,40,.95)" : "#fff"; ctx.strokeStyle = dark ? "rgba(255,255,255,.28)" : "rgba(14,27,44,.16)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * p.k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1FA7B4"; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 * p.k, 0, Math.PI * 2); ctx.fill();
        const hd = Math.hypot(p.x - W / 2, p.y - H / 2), fade = Math.max(0, Math.min(1, (hd - 58) / 50));
        ctx.font = `500 ${Math.round(12.5 * p.k)}px var(--font-dm-sans), system-ui, sans-serif`; ctx.textAlign = "center"; const al = (0.45 + p.k * 0.4) * fade; ctx.fillStyle = dark ? `rgba(234,242,246,${al})` : `rgba(14,27,44,${al})`; if (al > 0.02) ctx.fillText(s.l, p.x, p.y - 14 * p.k);
      });
      // hub
      const hp = proj(0, 0, 0), pulse = 1 + Math.sin(now / 600) * 0.06;
      const halo = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 70 * pulse); halo.addColorStop(0, "rgba(31,167,180,.4)"); halo.addColorStop(1, "rgba(34,115,214,0)"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(hp.x, hp.y, 70 * pulse, 0, Math.PI * 2); ctx.fill();
      const core = ctx.createLinearGradient(hp.x - 30, hp.y - 30, hp.x + 30, hp.y + 30); core.addColorStop(0, "#2FBF94"); core.addColorStop(0.55, "#1FA7B4"); core.addColorStop(1, "#2273D6"); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(hp.x, hp.y, 30, 0, Math.PI * 2); ctx.fill();
      const sh = ctx.createRadialGradient(hp.x - 10, hp.y - 12, 2, hp.x, hp.y, 30); sh.addColorStop(0, "rgba(255,255,255,.6)"); sh.addColorStop(0.4, "rgba(255,255,255,0)"); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(hp.x, hp.y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.font = "600 13px var(--font-dm-sans), system-ui, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(hub, hp.x, hp.y + 4.5);
      if (vis) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [vis, labels, hub, dark]);
  return (
    <div ref={host} role="img" aria-label={`${labels.join(", ")} streaming into ${hub}`} onPointerMove={(e) => { const r = host.current!.getBoundingClientRect(); tilt.current.tx = (e.clientX - r.left) / r.width - 0.5; tilt.current.ty = (e.clientY - r.top) / r.height - 0.5; }} onPointerLeave={() => { tilt.current.tx = 0; tilt.current.ty = 0; }} style={{ position: "relative", height }}>
      <canvas ref={cv} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D Cards Carousel (coverflow) — a scroll-snapped track; each card rotates and
// scales by its distance from the centre as you scroll or swipe.
export function Coverflow<T>({ items, render, cardWidth = 300, label }: { items: T[]; render: (item: T, i: number, active: boolean) => React.ReactNode; cardWidth?: number; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [act, setAct] = useState(0);
  const update = useCallback(() => {
    const t = track.current; if (!t) return;
    const mid = t.scrollLeft + t.clientWidth / 2; let best = 0, bd = 1e9;
    cards.current.forEach((c, i) => {
      if (!c) return;
      const cmid = c.offsetLeft + c.offsetWidth / 2, d = (cmid - mid) / (t.clientWidth / 2), ad = Math.min(1.2, Math.abs(d));
      const inner = c.firstElementChild as HTMLElement | null;
      if (inner) { inner.style.transform = `perspective(1000px) rotateY(${(-d * 38).toFixed(1)}deg) scale(${(1 - ad * 0.16).toFixed(3)}) translateZ(${(-ad * 60).toFixed(0)}px)`; inner.style.opacity = String(1 - ad * 0.4); }
      if (Math.abs(cmid - mid) < bd) { bd = Math.abs(cmid - mid); best = i; }
    });
    setAct(best);
  }, []);
  useEffect(() => { update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, [update, items.length]);
  // Open on the second card so there is a card on each side of the centre.
  useEffect(() => { const t = track.current, c = cards.current[items.length > 2 ? 1 : 0]; if (t && c) { t.scrollLeft = c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2; update(); } }, [items.length, update]);
  const go = (i: number) => { const c = cards.current[i], t = track.current; if (c && t) t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2, behavior: "smooth" }); };
  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} style={{ position: "relative" }}>
      <div ref={track} onScroll={update} className="neyu-noscroll" style={{ display: "flex", gap: 18, overflowX: "auto", scrollSnapType: "x mandatory", padding: "24px calc(50% - " + cardWidth / 2 + "px) 30px", scrollbarWidth: "none" }}>
        {items.map((it, i) => (
          <div key={i} ref={(n) => { cards.current[i] = n; }} style={{ flex: "none", width: `min(${cardWidth}px, 82vw)`, scrollSnapAlign: "center" }}>
            <div style={{ transition: "transform .12s linear, opacity .12s linear", transformStyle: "preserve-3d", height: "100%" }}>{render(it, i, i === act)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
        <button aria-label="Previous" onClick={() => go(Math.max(0, act - 1))} style={arrowBtn}><span style={{ transform: "rotate(180deg)", display: "grid" }}><NIcon name="arrow" size={16} /></span></button>
        {items.map((_, i) => <button key={i} aria-label={`Go to ${i + 1}`} aria-current={i === act} onClick={() => go(i)} style={{ width: i === act ? 22 : 7, height: 7, borderRadius: 4, border: 0, background: i === act ? "linear-gradient(90deg,#2FBF94,#2273D6)" : "#D5DEE3", cursor: "pointer", transition: "width .3s", padding: 0 }} />)}
        <button aria-label="Next" onClick={() => go(Math.min(items.length - 1, act + 1))} style={arrowBtn}><NIcon name="arrow" size={16} /></button>
      </div>
    </div>
  );
}
const arrowBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 18, border: "1px solid #E2E7EA", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" };

// ─────────────────────────────────────────────────────────────
// Beam Flow — WebGL laser beams through drifting fog, tilting toward the cursor.
const BEAM_FS = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*2.-1.;p.x*=r.x/r.y;
float tilt=(m.x-.5)*.6;float fog=fb(p*1.6+vec2(t*.05,-t*.03));
vec3 col=vec3(.03,.07,.12)+vec3(.02,.06,.08)*fog;
for(int i=0;i<4;i++){float fi=float(i);float ang=-.35+fi*.22+tilt;vec2 d=vec2(cos(ang),sin(ang));vec2 q=p-vec2(-1.6,-.9+fi*.18+(m.y-.5)*.3);
float along=dot(q,d);float across=abs(dot(q,vec2(-d.y,d.x)));float w=.006+.004*fi;float core=exp(-across/w);float glow=exp(-across/(.12+.05*fi))*.35;
float streak=.6+.4*sin(along*18.-t*(3.+fi));float wisp=fb(vec2(along*3.-t*.8,across*14.+fi))*.8;
vec3 c=mix(vec3(.18,.75,.58),vec3(.13,.45,.84),fi/3.);col+=c*(core*streak+glow*(.5+wisp))*smoothstep(-.2,.4,along);}
col+=vec3(.05,.12,.14)*pow(fog,3.)*1.4;gl_FragColor=vec4(col,1.);}`;
export function BeamFlow({ height = "100%", style }: { height?: number | string; style?: React.CSSProperties }) {
  const host = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const vis = useVisible(host);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const c = cv.current, el = host.current; if (!c || !el) return;
    const gl = c.getContext("webgl", { antialias: false, premultipliedAlpha: false }); if (!gl) { setOk(false); return; }
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!; gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}")); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, BEAM_FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setOk(false); return; }
    gl.useProgram(prog); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ur = gl.getUniformLocation(prog, "r"), ut = gl.getUniformLocation(prog, "t"), um = gl.getUniformLocation(prog, "m");
    let raf = 0; const t0 = performance.now(); const sm = { x: 0.5, y: 0.5 };
    const draw = (now: number) => {
      const scale = 0.6, W = Math.max(1, Math.floor(el.clientWidth * scale)), H = Math.max(1, Math.floor(el.clientHeight * scale));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; gl.viewport(0, 0, W, H); }
      sm.x += (mouse.current.x - sm.x) * 0.04; sm.y += (mouse.current.y - sm.y) * 0.04;
      gl.uniform2f(ur, W, H); gl.uniform1f(ut, ((now - t0) / 1000) * pace()); gl.uniform2f(um, sm.x, sm.y); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (vis) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [vis]);
  useEffect(() => { const onM = (e: PointerEvent) => { const r = host.current?.getBoundingClientRect(); if (!r) return; mouse.current = { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height }; }; window.addEventListener("pointermove", onM, { passive: true }); return () => window.removeEventListener("pointermove", onM); }, []);
  return (
    <div ref={host} aria-hidden="true" style={{ position: "absolute", inset: 0, height, overflow: "hidden", background: "radial-gradient(900px 500px at 80% 0%, rgba(34,115,214,.35), transparent 60%), radial-gradient(800px 500px at 0% 100%, rgba(47,191,148,.3), transparent 60%), #08131F", ...style }}>
      {ok && <canvas ref={cv} style={{ width: "100%", height: "100%", display: "block" }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Evervault Card — an encrypted field of characters that decodes around the cursor.
const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const scramble = (n: number) => Array.from({ length: n }, () => CH[Math.floor(Math.random() * CH.length)]).join("");
export function EvervaultCard({ children, height = 260, style }: { children: React.ReactNode; height?: number | string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [txt, setTxt] = useState("");
  const [pos, setPos] = useState({ x: -400, y: -400 });
  useEffect(() => { setTxt(scramble(2600)); }, []);
  const move = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); setTxt(scramble(2600)); };
  const mask = `radial-gradient(220px at ${pos.x}px ${pos.y}px, #000 0%, rgba(0,0,0,.35) 45%, transparent 75%)`;
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={() => setPos({ x: -400, y: -400 })} style={{ position: "relative", overflow: "hidden", borderRadius: 26, height, background: "linear-gradient(160deg,#FFFFFF,#F2F7F8)", border: "1px solid #E2E7EA", ...style }}>
      {/* At rest: a faint encrypted field that fades toward the content, so the card never looks empty. */}
      <p aria-hidden="true" style={{ position: "absolute", inset: 0, margin: 0, padding: 10, fontSize: 11, lineHeight: 1.35, wordBreak: "break-all", color: "rgba(31,140,170,.16)", maskImage: "linear-gradient(180deg,#000 0%,rgba(0,0,0,.6) 40%,transparent 72%)", WebkitMaskImage: "linear-gradient(180deg,#000 0%,rgba(0,0,0,.6) 40%,transparent 72%)", fontWeight: 500, letterSpacing: ".04em" }}>{txt}</p>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,#2FBF94,#1FA7B4 50%,#2273D6)", opacity: 0.9, maskImage: mask, WebkitMaskImage: mask, transition: "mask-position .1s" }} />
      <p aria-hidden="true" style={{ position: "absolute", inset: 0, margin: 0, padding: 10, fontSize: 11, lineHeight: 1.35, wordBreak: "break-all", color: "rgba(255,255,255,.85)", maskImage: mask, WebkitMaskImage: mask, fontWeight: 500, letterSpacing: ".04em" }}>{txt}</p>
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dynamic Navigation — a pill that glides and resizes to the active tab.
export function PillNav<K extends string>({ tabs, value, onChange, dark, label, size = "md" }: { tabs: { k: K; label: string; icon?: string; href?: string }[]; value: K; onChange?: (k: K) => void; dark?: boolean; label: string; size?: "sm" | "md" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ x: 0, w: 0, y: 0, h: 0 });
  // Soft fade on the side(s) that have more tabs, so a cut-off tab reads as "scroll for more".
  const [edge, setEdge] = useState({ l: false, r: false });
  const edges = useCallback(() => { const w = wrap.current; if (!w) return; const l = w.scrollLeft > 4, r = w.scrollLeft + w.clientWidth < w.scrollWidth - 4; setEdge((e) => (e.l === l && e.r === r ? e : { l, r })); }, []);
  useEffect(() => { edges(); window.addEventListener("resize", edges); return () => window.removeEventListener("resize", edges); }, [edges, tabs.length]);
  useIso(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-k="${value}"]`); if (!el) return;
    const set = () => setPill({ x: el.offsetLeft, w: el.offsetWidth, y: el.offsetTop, h: el.offsetHeight });
    set();
    // Keep the active tab visible by scrolling the strip itself — never the page.
    const w = wrap.current!; if (w.scrollWidth > w.clientWidth) { const l = el.offsetLeft - 12, r = el.offsetLeft + el.offsetWidth + 12; if (l < w.scrollLeft) w.scrollTo({ left: l, behavior: "smooth" }); else if (r > w.scrollLeft + w.clientWidth) w.scrollTo({ left: r - w.clientWidth, behavior: "smooth" }); }
    if (typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(set); ro.observe(wrap.current!); return () => ro.disconnect();
  }, [value, tabs.length]);
  const h = size === "sm" ? 38 : 44;
  return (
    <div role="tablist" aria-label={label} ref={wrap} onScroll={edges} className="neyu-noscroll" style={{ position: "relative", display: "flex", gap: 4, padding: 5, borderRadius: 999, overflowX: "auto", maxWidth: "100%", scrollbarWidth: "none",
      ...(edge.l || edge.r ? { maskImage: `linear-gradient(90deg, ${edge.l ? "transparent 0, #000 36px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 36px), transparent 100%" : "#000 100%"})`, WebkitMaskImage: `linear-gradient(90deg, ${edge.l ? "transparent 0, #000 36px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 36px), transparent 100%" : "#000 100%"})` } : {}),
      background: dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.95)", border: `1px solid ${dark ? "rgba(255,255,255,.14)" : "rgba(14,27,44,.08)"}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(10px)", boxShadow: dark ? "none" : "0 14px 30px -24px rgba(14,27,44,.4)" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: pill.x, top: pill.y, width: pill.w, height: pill.h, borderRadius: 999, background: dark ? "linear-gradient(120deg,#2FBF94,#2273D6)" : "#0E1B2C", transition: "left .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1)", boxShadow: "0 8px 18px -10px rgba(14,27,44,.6)" }} />
      {tabs.map((t) => {
        const on = t.k === value;
        const st: React.CSSProperties = { position: "relative", zIndex: 1, flex: "none", height: h, padding: "0 16px", borderRadius: 999, border: 0, background: "transparent", display: "inline-flex", alignItems: "center", gap: 8, fontSize: size === "sm" ? 13.5 : 14.5, fontWeight: 500, cursor: "pointer", color: on ? "#fff" : dark ? "rgba(234,242,246,.8)" : "#33465A", transition: "color .3s", whiteSpace: "nowrap", textDecoration: "none" };
        const inner = <>{t.icon && <NIcon name={t.icon} size={17} tone={on ? "light" : dark ? "#BDEFE0" : "#14324A"} />}{t.label}</>;
        return t.href
          ? <a key={t.k} data-k={t.k} role="tab" aria-selected={on} href={t.href} onClick={() => onChange?.(t.k)} style={st}>{inner}</a>
          : <button key={t.k} data-k={t.k} role="tab" aria-selected={on} onClick={() => onChange?.(t.k)} style={st}>{inner}</button>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Apple Dock — proximity magnification. Attach the returned handlers to a list;
// each child with [data-dock] scales smoothly as the pointer approaches.
export function useDock(axis: "x" | "y" = "y", max = 1.45, reach = 120) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersReduced()) return;
    ref.current?.querySelectorAll<HTMLElement>("[data-dock]").forEach((el) => {
      const r = el.getBoundingClientRect(); const c = axis === "y" ? r.top + r.height / 2 : r.left + r.width / 2; const p = axis === "y" ? e.clientY : e.clientX;
      const d = Math.abs(p - c); const s = d > reach ? 1 : 1 + (max - 1) * Math.cos((d / reach) * (Math.PI / 2)) ** 2;
      el.style.transform = `scale(${s.toFixed(3)})`; el.style.transformOrigin = axis === "y" ? "right center" : "center bottom";
    });
  };
  const onLeave = () => ref.current?.querySelectorAll<HTMLElement>("[data-dock]").forEach((el) => { el.style.transform = "scale(1)"; });
  return { ref, onPointerMove: onMove, onPointerLeave: onLeave };
}

// ─────────────────────────────────────────────────────────────
// 3D Showcase Cylinder — cards around a rotating cylinder. Pauses on hover,
// drag/swipe to spin, click a card to bring it to the front and zoom its details.
export function Cylinder3D<T>({ items, render, detail, cardW = 220, cardH = 250, height = 420, label }: { items: T[]; render: (item: T, front: boolean) => React.ReactNode; detail?: (item: T) => React.ReactNode; cardW?: number; cardH?: number; height?: number; label: string }) {
  const host = useRef<HTMLDivElement>(null), ring = useRef<HTMLDivElement>(null);
  const vis = useVisible(host);
  const st = useRef({ a: 0, v: 0.12, hover: false, drag: false, x: 0, target: null as number | null });
  const [front, setFront] = useState(0), [open, setOpen] = useState<number | null>(null), [w, setW] = useState(900);
  const n = Math.max(items.length, 1), step = 360 / n;
  const scale = Math.min(1, w / 760);
  const R = Math.max(cardW * 0.9, ((cardW + 18) * n) / (2 * Math.PI)) * scale;
  useEffect(() => { const el = host.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect(); }, []);
  useEffect(() => { st.current.a = 0; st.current.target = null; setOpen(null); }, [items.length]);
  useEffect(() => {
    if (!vis) return; let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const s = st.current;
      if (s.target != null) { let d = ((s.target - s.a + 540) % 360) - 180; s.a += d * Math.min(1, dt * 6); if (Math.abs(d) < 0.2) { s.a = s.target; s.target = null; } }
      else if (!s.hover && !s.drag && open == null) s.a -= 9 * dt * pace();
      if (ring.current) ring.current.style.transform = `translateZ(${-R}px) rotateY(${s.a}deg)`;
      const f = ((Math.round(-s.a / step) % n) + n) % n; setFront((p) => (p === f ? p : f));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [vis, R, step, n, open]);
  const pick = (i: number) => { st.current.target = -i * step; setOpen(i); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div ref={host} role="region" aria-roledescription="carousel" aria-label={label}
        onMouseEnter={() => (st.current.hover = true)} onMouseLeave={() => { st.current.hover = false; st.current.drag = false; }}
        onPointerDown={(e) => { st.current.drag = true; st.current.x = e.clientX; }} onPointerMove={(e) => { const s = st.current; if (!s.drag) return; s.a += (e.clientX - s.x) * 0.25; s.x = e.clientX; }} onPointerUp={() => (st.current.drag = false)}
        style={{ position: "relative", height, perspective: 1600, touchAction: "pan-y", userSelect: "none", overflow: "hidden", maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}>
        <div aria-hidden style={{ position: "absolute", left: "50%", bottom: 18, width: "70%", height: 40, transform: "translateX(-50%)", background: "radial-gradient(closest-side, rgba(31,167,180,.22), transparent)", filter: "blur(6px)" }} />
        <div ref={ring} style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transformStyle: "preserve-3d" }}>
          {items.map((it, i) => (
            <div key={i} onClick={() => pick(i)} style={{ position: "absolute", width: cardW * scale, height: cardH * scale, left: (-cardW * scale) / 2, top: (-cardH * scale) / 2, transform: `rotateY(${i * step}deg) translateZ(${R}px)`, backfaceVisibility: "hidden", cursor: "pointer", transition: "filter .3s", filter: i === front ? "none" : "saturate(.85)" }}>
              <div style={{ width: cardW, height: cardH, transform: `scale(${scale * (i === front ? 1.06 : 1)})`, transformOrigin: "0 0", transition: "transform .4s cubic-bezier(.2,.8,.2,1)" }}>{render(it, i === front)}</div>
            </div>
          ))}
        </div>
      </div>
      {detail && open != null && items[open] && (
        <div key={open} style={{ animation: "fadeUp .3s ease" }}>{detail(items[open])}<button onClick={() => setOpen(null)} style={{ marginTop: 10, border: 0, background: "none", color: "#2273D6", cursor: "pointer", fontSize: 14 }}>Close details · resume rotation</button></div>
      )}
    </div>
  );
}
