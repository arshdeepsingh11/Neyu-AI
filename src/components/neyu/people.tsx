"use client";

// NEYU physicians — one card, one profile sheet and one "who speaks what" matrix,
// used on /physicians, /care and every specialty page. Data: src/data/physicians.ts
// (from the clinic's Doctors.docx). No photos (clinic rule): initials only.
import React, { useEffect, useMemo } from "react";
import type { Physician } from "@/data/physicians";
import { physicians } from "@/data/physicians";
import { N, btn } from "./kit";
import { NIcon } from "./icons";

export const initials = (name: string) => name.replace(/^Dr\.?\s*/i, "").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Z]/i.test(c)).slice(0, 2).join("").toUpperCase();
export const ALL_LANGS = Array.from(new Set(physicians.flatMap((p) => p.languages))).sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)));
export const doctorsFor = (disciplines: string[]) => (disciplines.length ? physicians.filter((p) => disciplines.some((d) => p.disciplines.includes(d))) : []);

/** Avatar: initials on a soft gradient ring. */
export function Avatar({ p, size = 64 }: { p: Physician; size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 2, padding: 2, background: "linear-gradient(135deg,#2FBF94,#1FA7B4 50%,#2273D6)", flex: "none", display: "grid" }}>
      <span style={{ borderRadius: "50%", background: "linear-gradient(160deg,#FFFFFF,#EEF6F5)", display: "grid", placeItems: "center", fontSize: size * 0.32, fontWeight: 500, letterSpacing: ".02em", color: N.ink }}>{initials(p.name)}</span>
    </span>
  );
}

/** Physician card — name, role, disciplines, languages and clinic, all from the data file. */
export function PhysicianCard({ p, onOpen, active, compact }: { p: Physician; onOpen: () => void; active?: boolean; compact?: boolean }) {
  return (
    <button onClick={onOpen} className="sx-card" aria-label={`${p.name}, ${p.title}. Speaks ${p.languages.join(", ")}. ${p.location} clinic. Open profile.`}
      style={{ width: "100%", height: "100%", textAlign: "left", cursor: "pointer", padding: compact ? 18 : 22, borderRadius: 26, display: "grid", gap: 14, alignContent: "start", color: N.ink,
        background: active ? "linear-gradient(160deg,#FFFFFF 0%,#F1F9F7 60%,#EDF4FB 100%)" : "#FFFFFF", border: `1px solid ${active ? "rgba(31,167,180,.45)" : N.line}`, boxShadow: active ? "0 30px 60px -36px rgba(34,115,214,.55)" : "0 1px 2px rgba(14,27,44,.04), 0 24px 50px -40px rgba(14,27,44,.4)" }}>
      <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar p={p} size={compact ? 52 : 60} />
        <span style={{ minWidth: 0 }}>
          <b style={{ display: "block", fontWeight: 500, fontSize: compact ? 16.5 : 18, lineHeight: 1.25, letterSpacing: "-.01em" }}>{p.name}</b>
          <span style={{ display: "block", fontSize: 13.5, color: N.tealText, marginTop: 2, lineHeight: 1.35 }}>{p.title}</span>
        </span>
      </span>
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{p.disciplines.map((d) => <span key={d} style={{ padding: "4px 10px", borderRadius: 999, background: N.line2, fontSize: 12.5, color: N.ink2 }}>{d}</span>)}</span>
      <span style={{ display: "grid", gap: 7, fontSize: 13.5, color: N.ink2 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><NIcon name="language" size={17} tone="grad" style={{ marginTop: 1 }} /><span>{p.languages.join(" · ")}</span></span>
        <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><NIcon name="pin" size={17} tone="grad" style={{ marginTop: 1 }} /><span>{p.location} clinic</span></span>
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: N.deep, display: "inline-flex", gap: 6, alignItems: "center", marginTop: 2 }}>View profile<NIcon name="arrow" size={15} tone={N.deep} /></span>
    </button>
  );
}

/** Profile sheet (modal) with bio, qualifications, clinic, phone and languages. */
export function PhysicianSheet({ p, onClose }: { p: Physician; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; }; }, [onClose]);
  return (
    <div className="anra-chrome">
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(14,27,44,.36)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
      <div role="dialog" aria-modal="true" aria-label={p.name} style={{ position: "fixed", zIndex: 86, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(600px,calc(100% - 24px))", maxHeight: "88vh", overflow: "auto", background: "#FFFFFF", borderRadius: 28, padding: "clamp(20px,4vw,32px)", boxShadow: "0 50px 100px -40px rgba(14,27,44,.55)", animation: "fadeUp .25s", color: N.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
            <Avatar p={p} size={68} />
            <div style={{ minWidth: 0 }}><h2 style={{ margin: 0, fontSize: 23, fontWeight: 500, letterSpacing: "-.015em" }}>{p.name}</h2><p style={{ margin: "3px 0 0", fontSize: 14.5, color: N.tealText }}>{p.title}</p></div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, border: `1px solid ${N.line}`, borderRadius: 20, background: "#fff", cursor: "pointer", flex: "none", display: "grid", placeItems: "center" }}><NIcon name="x" size={18} /></button>
        </div>
        {p.bio && <p style={{ margin: "18px 0 0", fontSize: 15.5, lineHeight: 1.65, color: N.ink2 }}>{p.bio}</p>}
        <div style={{ marginTop: 18, display: "grid", gap: 10, fontSize: 14.5, color: N.ink2, padding: 16, borderRadius: 18, background: "#F7F9F9", border: `1px solid ${N.line2}` }}>
          <span style={{ display: "flex", gap: 10 }}><NIcon name="pin" size={18} tone="grad" style={{ marginTop: 1 }} /><span><b style={{ fontWeight: 600, color: N.ink }}>{p.location} clinic</b><br />{p.address}</span></span>
          <a href={"tel:" + p.phone.replace(/[^\d+]/g, "")} style={{ display: "flex", gap: 10, color: N.ink2, textDecoration: "none" }}><NIcon name="phone" size={18} tone="grad" style={{ marginTop: 1 }} />{p.phone}</a>
          <span style={{ display: "flex", gap: 10 }}><NIcon name="language" size={18} tone="grad" style={{ marginTop: 1 }} />{p.languages.join(", ")}</span>
        </div>
        {p.qualifications.length > 0 && <>
          <div style={{ marginTop: 18, fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>Qualifications</div>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>{p.qualifications.map((q) => <li key={q} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.5, color: N.ink2 }}><NIcon name="award" size={17} tone="grad" style={{ marginTop: 2 }} />{q}</li>)}</ul>
        </>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <a href="/referral-centre" style={btn("grad")}>Start a referral<NIcon name="arrow" size={16} tone="light" /></a>
          <a href={"tel:" + p.phone.replace(/[^\d+]/g, "")} style={btn("ghost")}><NIcon name="phone" size={16} tone="currentColor" />Call the clinic</a>
        </div>
      </div>
    </div>
  );
}

/** Who speaks what — a precise physician × language matrix, straight from the data. */
export function LanguageMatrix({ list = physicians, highlight }: { list?: Physician[]; highlight?: string }) {
  const langs = useMemo(() => ALL_LANGS.filter((l) => list.some((p) => p.languages.includes(l))), [list]);
  return (
    <div style={{ overflowX: "auto", borderRadius: 20, border: `1px solid ${N.line}`, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 560 }}>
        <caption style={{ textAlign: "left", padding: "14px 16px 4px", fontSize: 13, color: N.muted }}>Languages each physician speaks · {list.length} physicians · {langs.length} languages</caption>
        <thead><tr><th scope="col" style={{ textAlign: "left", padding: "10px 16px", fontWeight: 500, color: N.muted, borderBottom: `1px solid ${N.line2}` }}>Physician</th>{langs.map((l) => <th key={l} scope="col" style={{ padding: "10px 6px", fontWeight: 500, color: highlight === l ? N.deep : N.muted, borderBottom: `1px solid ${N.line2}`, whiteSpace: "nowrap" }}>{l}</th>)}</tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.slug}>
              <th scope="row" style={{ textAlign: "left", padding: "10px 16px", fontWeight: 500, color: N.ink, borderBottom: `1px solid ${N.line2}`, whiteSpace: "nowrap" }}>{p.name.replace(/^Dr\.\s*/, "Dr. ")}</th>
              {langs.map((l) => { const has = p.languages.includes(l); return <td key={l} style={{ textAlign: "center", borderBottom: `1px solid ${N.line2}`, background: highlight === l && has ? "rgba(31,167,180,.07)" : undefined }}>{has ? <span role="img" aria-label={`${p.name} speaks ${l}`} style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: "linear-gradient(135deg,#2FBF94,#2273D6)" }} /> : <span aria-hidden="true" style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: N.line }} />}</td>; })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
