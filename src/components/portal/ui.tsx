"use client";

// Shared visual primitives for My Health Space — exact values from the
// approved design (colours, radii, type scale).

import React from "react";
import { NIcon } from "@/components/neyu/icons";

export const C = {
  page: "#F6F4F1", side: "#F3F0EC", card: "#FFFDFB", sheet: "#FAF8F5",
  ink: "#1D2327", ink2: "#454C52", ink3: "#3A4146", muted: "#5B6369", faint: "#666D73",
  teal: "#3F6F7C", tealDark: "#2F5A66", tealMid: "#3B6874", tealLight: "#6EA8B6", tealWash: "#E8F2F4", tealChip: "#E1EDF0",
  lav: "#F0ECF7", lavInk: "#5F4A8A", lavMid: "#2A84E4", lavDeep: "#4E3C75",
  peach: "#FBEEE8", peachInk: "#8B4B37",
  line: "rgba(29,35,39,.06)", line2: "rgba(29,35,39,.07)", line12: "rgba(29,35,39,.12)",
};

export const EASE = "cubic-bezier(.2,.7,.2,1)";
export const screenAnim: React.CSSProperties = { animation: `mhs-fadeUp 380ms ${EASE}` };
export const cardBox: React.CSSProperties = { borderRadius: 20, background: C.card, border: `1px solid ${C.line}` };

export function H1({ children, sub, subSize = 15, mb = 22 }: { children: React.ReactNode; sub?: React.ReactNode; subSize?: number; mb?: number }) {
  return (
    <>
      <h1 style={{ margin: "0 0 6px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>{children}</h1>
      {sub && <p style={{ margin: `0 0 ${mb}px`, fontSize: subSize, lineHeight: 1.55, color: subSize === 16 ? C.ink2 : C.muted }}>{sub}</p>}
    </>
  );
}

export function Switch({ on, onToggle, label, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onToggle} disabled={disabled}
      style={{ width: 46, height: 28, flex: "none", border: "none", borderRadius: 14, background: on ? C.teal : "#D9D5CF", position: "relative", cursor: disabled ? "default" : "pointer", transition: "background 200ms", opacity: disabled ? 0.6 : 1, padding: 0 }}>
      <span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: 11, background: C.card, boxShadow: "0 1px 3px rgba(29,35,39,.2)", transform: on ? "translateX(18px)" : "none", transition: `transform 220ms ${EASE}` }} />
    </button>
  );
}

/** Settings-style toggle list (Privacy, Notifications). */
export function ToggleList({ items }: { items: { label: string; sub?: string; on: boolean; toggle: () => void }[] }) {
  return (
    <section style={{ borderRadius: 18, background: C.card, overflow: "hidden" }}>
      {items.map((t, i) => (
        <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 16px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15 }}>{t.label}</span>{t.sub && <span style={{ fontSize: 13, color: C.muted }}>{t.sub}</span>}</span>
          <Switch on={t.on} onToggle={t.toggle} label={t.label} />
        </div>
      ))}
    </section>
  );
}

export function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <>
      {items.map((c) => {
        const a = c.id === value;
        return (
          <button key={c.id} onClick={() => onChange(c.id)} aria-pressed={a}
            style={{ height: 36, padding: "0 14px", border: `1px solid ${a ? "transparent" : C.line12}`, borderRadius: 18, background: a ? C.tealChip : "transparent", color: a ? C.tealDark : C.ink2, fontSize: 14, cursor: "pointer", transition: "all 160ms" }}>
            {c.label}
          </button>
        );
      })}
    </>
  );
}

export function PeriodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Time period" style={{ display: "flex", padding: 3, borderRadius: 12, background: "#ECE9E4" }}>
      {[7, 30, 90, 365].map((v) => {
        const a = v === value;
        return (
          <button key={v} role="radio" aria-checked={a} onClick={() => onChange(v)}
            style={{ height: 34, minWidth: 52, padding: "0 10px", border: "none", borderRadius: 9, background: a ? C.card : "transparent", boxShadow: a ? "0 1px 3px rgba(29,35,39,.1)" : "none", fontSize: 13, fontWeight: 500, color: a ? C.ink : C.muted, cursor: "pointer", transition: "all 200ms" }}>
            {v === 365 ? "1Y" : v + "D"}
          </button>
        );
      })}
    </div>
  );
}

/** Empty state card (design: "No trend data yet", "Your results will appear here"…). */
export function EmptyCard({ icon, title, text, action, maxWidth = 560 }: { icon: string; title: string; text: string; action?: React.ReactNode; maxWidth?: number | string }) {
  return (
    <div style={{ padding: "40px 28px", borderRadius: 24, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", maxWidth }}>
      <NIcon name={icon.replace(/^ph(-fill|-bold)? /, "")} size={28} tone={C.tealLight} />
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.muted }}>{text}</p>
      {action}
    </div>
  );
}

export const btnPrimary: React.CSSProperties = { height: 44, padding: "0 18px", border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, fontWeight: 500, cursor: "pointer" };
export const btnSecondary: React.CSSProperties = { height: 46, padding: "0 20px", border: "none", borderRadius: 12, background: C.tealChip, color: C.tealDark, fontSize: 15, fontWeight: 500, cursor: "pointer" };
export const btnOutline: React.CSSProperties = { height: 44, padding: "0 16px", border: `1px solid ${C.line12}`, borderRadius: 12, background: "none", fontSize: 15, cursor: "pointer" };
export const btnLink: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, height: 40, padding: 0, border: "none", background: "none", fontSize: 14, fontWeight: 500, color: C.teal, cursor: "pointer" };

export function Avatar({ size, photoUrl, initials, fontSize }: { size: number; photoUrl: string | null; initials: string; fontSize: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size / 2, background: "#DCE9EC", color: C.tealDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize, flex: "none", overflow: "hidden" }}>
      {photoUrl ? <img src={photoUrl} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover", display: "block" }} /> : initials}
    </span>
  );
}

export function Shimmer({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#EDEAE5 0,#F6F4F1 60px,#EDEAE5 120px)", backgroundSize: "400px 100%", animation: "mhs-shimmer 1.4s linear infinite" }} />;
}

/** Generic screen-level loading / error placeholder. */
export function Loading({ error, retry }: { error?: string; retry?: () => void }) {
  if (error)
    return (
      <div role="alert" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px", borderRadius: 16, background: C.peach, maxWidth: 560 }}>
        <NIcon name="ph-cloud-slash" size={22} tone={C.peachInk} style={{marginTop: 1}} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 15, fontWeight: 500 }}>We couldn't load this right now.</span><span style={{ fontSize: 14, color: C.muted }}>{error}</span></div>
        {retry && <button onClick={retry} style={{ height: 36, padding: "0 14px", border: "1px solid rgba(139,75,55,.25)", borderRadius: 10, background: C.card, fontSize: 14, fontWeight: 500, color: C.peachInk, cursor: "pointer" }}>Try again</button>}
      </div>
    );
  return (
    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Shimmer w={220} h={32} /><Shimmer w={320} h={14} r={6} />
      <div style={{ height: 8 }} /><Shimmer w="100%" h={160} r={20} /><Shimmer w="100%" h={120} r={20} />
    </div>
  );
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Sep 24" from an ISO timestamp, in the patient's timezone. */
export const shortDate = (iso: string, tz: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz }).format(new Date(iso));
export const longDateTz = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: tz }).format(new Date(iso));
