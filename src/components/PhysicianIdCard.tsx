"use client";

import React, { useEffect, useRef } from "react";
import type { Physician } from "@/data/physicians";
import NeyuLogo from "@/components/brand/NeyuLogo";

// Hanging ID-card physician card: a lanyard from the top with pendulum
// physics (spring return + damping). Drag it left/right and let go to watch
// it swing and settle; a click (no drag) opens the physician profile.
// No photos (clinic rule) — the avatar shows the physician's initials.

const STRAP = 132; // lanyard length in px (pivot → card clip)

function initials(name: string) {
  return name.replace(/^Dr\.?\s*/i, "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// Deterministic decorative barcode from the physician's slug.
function bars(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 28 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return { w: (h >> 8) % 3 === 0 ? 3 : 1.5, hgt: 16 + ((h >> 12) % 12), gap: i % 5 === 0 ? 3 : 2 };
  });
}

export default function PhysicianIdCard({ p, index = 0, onOpen, strap = STRAP }: { p: Physician; index?: number; onOpen: () => void; strap?: number }) {
  const rigRef = useRef<HTMLDivElement>(null);
  const s = useRef({ a: 0, v: 0, dragging: false, moved: false, startX: 0, pivotX: 0, pivotY: 0, raf: 0, last: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = s.current;
    // Gentle staggered entrance swing.
    if (!reduce) st.v = (index % 2 ? -1 : 1) * 1.6;
    const step = (t: number) => {
      const dt = Math.min(0.032, st.last ? (t - st.last) / 1000 : 0.016);
      st.last = t;
      if (!st.dragging) {
        const k = 38, c = 2.6; // spring stiffness, damping
        st.v += (-k * st.a - c * st.v) * dt;
        st.a += st.v * dt;
        if (Math.abs(st.a) < 0.0005 && Math.abs(st.v) < 0.0005) { st.a = 0; st.v = 0; }
      }
      if (rigRef.current) rigRef.current.style.transform = `rotate(${st.a}rad)`;
      st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(st.raf);
  }, [index]);

  const onPointerDown = (e: React.PointerEvent) => {
    const st = s.current;
    const r = rigRef.current!.parentElement!.getBoundingClientRect();
    st.pivotX = r.left + r.width / 2;
    st.pivotY = r.top;
    st.dragging = true;
    st.moved = false;
    st.startX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.dragging) return;
    if (Math.abs(e.clientX - st.startX) > 5) st.moved = true;
    if (!st.moved) return;
    const target = Math.max(-1.1, Math.min(1.1, Math.atan2(e.clientX - st.pivotX, Math.max(40, e.clientY - st.pivotY))));
    st.v = (target - st.a) * 30; // carry momentum into release
    st.a = target;
  };

  const onPointerUp = () => {
    const st = s.current;
    if (!st.dragging) return;
    st.dragging = false;
    if (!st.moved) {
      st.v += (Math.random() > 0.5 ? 1 : -1) * 1.4; // little swing on click
      onOpen();
    }
  };

  const code = "NEYU-" + p.slug.split("-").map((w) => w[0]).join("").toUpperCase() + "-" + String(index + 1).padStart(2, "0");

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", paddingTop: 4, touchAction: "pan-y" }}>
      <div ref={rigRef} style={{ transformOrigin: "50% 0", display: "flex", flexDirection: "column", alignItems: "center", willChange: "transform" }}>
        {/* Pivot pin + lanyard */}
        <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", background: "#14181B", boxShadow: "0 2px 4px rgba(0,0,0,.3)", marginBottom: -4, zIndex: 1 }} />
        <span aria-hidden="true" style={{ width: 22, height: strap, borderRadius: 3, background: "repeating-linear-gradient(0deg,#1C2226 0 3px,#2A3035 3px 4px), #1C2226", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.04)" }} />
        <span aria-hidden="true" style={{ width: 16, height: 12, borderRadius: 3, background: "linear-gradient(#5A626A,#2A3035)", marginTop: -2 }} />

        {/* Card */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${p.name}, ${p.title}. View profile`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { s.current.dragging = false; }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
          style={{ width: 256, marginTop: -3, borderRadius: 18, background: "#FFFFFF", boxShadow: "0 30px 50px -24px rgba(20,24,27,.45), 0 2px 6px rgba(20,24,27,.08)", overflow: "hidden", cursor: "grab", userSelect: "none", textAlign: "center", fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
        >
          {/* Top strip with slot */}
          <div style={{ height: 22, background: "#F3F1ED", display: "grid", placeItems: "center" }}>
            <span style={{ width: 34, height: 6, borderRadius: 3, background: "#14181B" }} />
          </div>
          {/* Header */}
          <div style={{ position: "relative", height: 88, background: "linear-gradient(120deg,#3F6F7C 0%,#6EA8B6 45%,#2A84E4 100%)", display: "grid", placeItems: "center" }}>
            <span aria-hidden="true" style={{ position: "absolute", left: 12, top: 12, width: 22, height: 17, borderRadius: 4, background: "linear-gradient(135deg,#F3C3B2,#E7A98F)", boxShadow: "inset 0 0 0 1px rgba(122,62,42,.25)" }} />
            <span aria-hidden="true" style={{ position: "absolute", right: 10, top: 9, opacity: 0.9 }}><NeyuLogo height={18} tone="light" mono /></span>
            <span style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,.22)", border: "2px solid rgba(255,255,255,.7)", display: "grid", placeItems: "center", color: "#FFFFFF", fontWeight: 600, fontSize: 20, letterSpacing: ".04em", backdropFilter: "blur(4px)" }}>
              {initials(p.name)}
            </span>
          </div>
          {/* Body */}
          <div style={{ padding: "14px 18px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#14181B", lineHeight: 1.25 }}>{p.name}</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: "#3F6F7C", fontWeight: 500, lineHeight: 1.35 }}>{p.title}</div>
            <div style={{ margin: "12px 0", height: 1, background: "#EFECE6" }} />
            <div style={{ fontSize: 12, color: "#5A626A", lineHeight: 1.5 }}>
              <div>{p.location} Clinic</div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.languages.join(", ")}>{p.languages.join(" · ")}</div>
            </div>
            <div aria-hidden="true" style={{ marginTop: 12, display: "flex", justifyContent: "center", alignItems: "flex-end", height: 28 }}>
              {bars(p.slug).map((b, i) => <span key={i} style={{ width: b.w, height: b.hgt, marginRight: b.gap, background: "#14181B", borderRadius: 1 }} />)}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, letterSpacing: ".14em", color: "#3F6F7C", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{code}</div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {p.disciplines.slice(0, 2).map((d) => (
                <span key={d} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: "#E9F1F3", color: "#2F5561" }}>{d}</span>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "#1D5FA8" }}>View profile →</div>
          </div>
        </div>
      </div>
    </div>
  );
}
