"use client";

// Nea Precision Skin — NEYU's aesthetics & skin-health partner.
// Tabbed like the specialty pages. Content from neaprecisionskin.com; every
// "Book" goes to Nea's own Jane booking, packages to Nea's consultation form.
// URL: ?tab=studio|treatments|results|packages|visit · #<treatment-id> opens it.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NEA, NEA_TREATMENTS, NEA_META, type NeaCat, type NeaTreatment } from "@/data/nea";
import { T, wrap, Book } from "./ui";
import Studio, { type Tool, type Profile } from "./studio";
import Treatments, { Detail } from "./treatments";
import { Overview, Results, Packages, Visit, OpenPill, type Tab } from "./sections";
import { NIcon } from "@/components/neyu/icons";

const TABS: { v: Tab; label: string; icon: string }[] = [
  { v: "overview", label: "Overview", icon: "ph-house-simple" },
  { v: "studio", label: "Neyu Studio", icon: "ph-sparkle" },
  { v: "treatments", label: "Treatments", icon: "ph-first-aid-kit" },
  { v: "results", label: "Results & data", icon: "ph-chart-line-up" },
  { v: "packages", label: "Packages", icon: "ph-package" },
  { v: "visit", label: "Visit", icon: "ph-map-pin" },
];
const isTab = (v: string | null): v is Tab => !!v && TABS.some((t) => t.v === v);

export default function NeaPage() {
  const [tab, setTabState] = useState<Tab>("overview");
  const [tool, setTool] = useState<Tool>("match");
  const [seed, setSeed] = useState("");
  const [cat, setCat] = useState<NeaCat | "All">("All");
  const [open, setOpen] = useState<NeaTreatment | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [picked, setPicked] = useState<string[]>(["facial", "cosmetic"].filter((id) => NEA_META[id]));
  const barRef = useRef<HTMLDivElement>(null);

  const setTab = useCallback((t: Tab, scroll = true) => {
    setTabState(t);
    const u = new URL(window.location.href);
    if (t === "overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", t);
    history.replaceState(null, "", u.pathname + u.search + u.hash);
    // Scroll back to where the tab bar sits un-stuck (sentinel marks it).
    if (scroll && barRef.current) {
      const stick = window.innerWidth <= 859 ? 64 : 10;
      const top = barRef.current.getBoundingClientRect().top + window.scrollY - stick;
      if (window.scrollY > top + 1) window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  // Initial tab from ?tab=, and #id deep links open a treatment.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (isTab(p)) setTabState(p);
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const t = NEA_TREATMENTS.find((x) => x.id === id);
      if (t) { setOpen(t); setTabState((cur) => (cur === "overview" ? "treatments" : cur)); }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const close = useCallback(() => { setOpen(null); if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search); }, []);
  const toAsk = useCallback((q: string) => { setSeed(q); setTool("ask"); setTab("studio"); }, [setTab]);
  const openTool = (t: Tool) => { setTool(t); setTab("studio"); };
  const pickCat = (c: NeaCat) => { setCat(c); setTab("treatments"); };

  return (
    <div style={{ color: T.ink, paddingBottom: 90 }}>
      <style>{`.nea-tabs::-webkit-scrollbar{display:none}.nea-marquee{animation:neaMarquee 60s linear infinite}.nea-marquee:hover{animation-play-state:paused}@keyframes neaMarquee{to{transform:translateX(-50%)}}.nea-glassbtn:hover{background:rgba(255,255,255,.13)!important}.nea-row:hover{background:${T.paper}}@media (prefers-reduced-motion: reduce){.nea-marquee{animation:none}}.nea-bar{top:10px}@media (max-width:859px){.nea-bar{top:calc(var(--neyu-topbar,56px) + env(safe-area-inset-top))}}.nea-gantt{display:grid;grid-template-columns:minmax(120px,26%) 1fr;gap:12px;align-items:center}@media (max-width:560px){.nea-gantt{grid-template-columns:1fr;gap:6px}.nea-gantt-sp{display:none}}`}</style>

      {/* Title (like the specialty pages) */}
      <header style={{ ...wrap, paddingTop: "clamp(34px,6vw,72px)", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase", color: T.deep }}>NEYU Health · Skin & Aesthetics partner</p>
        <h1 style={{ margin: "10px 0 0", fontSize: "clamp(36px,5vw,60px)", lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 500 }}>Nea Precision Skin</h1>
        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <OpenPill />
          <span style={{ fontSize: 13.5, color: T.muted, display: "inline-flex", gap: 6, alignItems: "center" }}><NIcon name="ph-map-pin" size={18} tone={T.nea} />Calgary NE</span>
          <a href={NEA.tel} style={{ fontSize: 13.5, color: T.muted, display: "inline-flex", gap: 6, alignItems: "center", textDecoration: "none" }}><NIcon name="ph-phone" size={18} tone={T.nea} />{NEA.phone}</a>
        </div>
      </header>

      {/* Sticky tab bar */}
      <div ref={barRef} aria-hidden style={{ height: 0 }} />
      <div className="nea-bar" style={{ position: "sticky", zIndex: 40, marginTop: 22, display: "flex", justifyContent: "center", padding: "0 12px" }}>
        <nav aria-label="Nea sections" className="nea-tabs" style={{ display: "flex", gap: 4, padding: 5, borderRadius: 999, maxWidth: "100%", overflowX: "auto", scrollbarWidth: "none", background: "rgba(255,255,255,.78)", backdropFilter: "blur(18px) saturate(1.5)", WebkitBackdropFilter: "blur(18px) saturate(1.5)", border: `1px solid ${T.line}`, boxShadow: "0 14px 34px -22px rgba(20,24,27,.45)" }}>
          {TABS.map((t) => {
            const on = tab === t.v, ai = t.v === "studio";
            return (
              <button key={t.v} onClick={() => setTab(t.v)} aria-current={on ? "page" : undefined}
                style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 999, border: 0, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap", transition: "all .25s",
                  background: on ? (ai ? "linear-gradient(120deg,#1D5FA8,#2A84E4 50%,#3CC79E)" : T.ink) : "transparent", color: on ? "#fff" : ai ? T.violet : T.ink2, boxShadow: on ? "0 8px 20px -10px rgba(20,24,27,.6)" : "none" }}>
                <NIcon name={t.icon} size={16} tone="currentColor" />{t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <main key={tab} style={{ ...wrap, marginTop: "clamp(22px,3vw,34px)", animation: "fadeUp .35s ease" }}>
        {tab === "overview" && <Overview go={setTab} openTool={openTool} askSeed={toAsk} pickCat={pickCat} />}
        {tab === "studio" && <Studio tool={tool} setTool={setTool} seed={seed} setSeed={setSeed} open={setOpen} profile={profile} setProfile={setProfile} picked={picked} setPicked={setPicked} />}
        {tab === "treatments" && <Treatments cat={cat} setCat={setCat} open={setOpen} />}
        {tab === "results" && <Results open={setOpen} />}
        {tab === "packages" && <Packages />}
        {tab === "visit" && <Visit askSeed={toAsk} />}
      </main>

      {tab !== "visit" && (
        <div style={{ ...wrap, marginTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "18px 20px", borderRadius: 20, background: T.soft }}>
            <span style={{ fontSize: 15.5 }}>Every Nea plan starts with a <b style={{ fontWeight: 600 }}>free 15-minute consultation</b>.</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Book small label="Book consult" href={NEA.consult} /><Book small ghost /></div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 12.5, color: T.muted }}>Nea Precision Skin is a separate clinic partnered with NEYU Health. Information from neaprecisionskin.com; not medical advice. In an emergency call 911.</p>
        </div>
      )}

      {open && <Detail t={open} onClose={close} onAsk={toAsk} />}
    </div>
  );
}
