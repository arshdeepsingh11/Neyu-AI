"use client";

// My Health Space — a page inside the website (the site's nav rail, mobile
// nav, footer and Neyu stay). Header + section tabs, in-page navigation
// stack with browser back support (?s=… in the URL), sheets and toast.
// Screens load their own data through the shared cache.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BootstrapDTO, ProfileDTO, SettingsDTO } from "@/lib/portal/types";
import { routeUrl as toUrl } from "@/lib/portal/route";
import { Ctx, PARENT, LABELS, TABS, GROUPS, tabOf, type PortalCtx, type Route, type Screen, type Sheet } from "./context";
import { EP, api, invalidate, load, prime } from "./api";
import { C, Avatar } from "./ui";
import { PillNav } from "@/components/neyu/fx";
import { MyHealth, Records, DocDetail, AddRecord, Food, Plan, Assessment } from "./screens/Space";
import { useUsageTracker } from "./usage";
import { HealthStory } from "./screens/Intel";
import Today from "./screens/Today";
import { Trends, TrendDetail } from "./screens/Trends";
import { Results, ResultDetail } from "./screens/Results";
import Protocol from "./screens/Protocol";
import Devices from "./screens/Devices";
import History from "./screens/History";
import { Appointments, Referrals } from "./screens/Appointments";
import PolicyUpdate from "./PolicyUpdate";
import { More, Profile, Privacy, Notifications } from "./screens/Account";
import Sheets from "./Sheets";
import { Heart, Lifestyle, Family, CareView, Rewards } from "./screens/Universe";
import Baseline from "./screens/Baseline";
import { NIcon } from "@/components/neyu/icons";

export default function PortalApp({ boot, initialRoute }: { boot: BootstrapDTO; initialRoute: Route }) {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [hist, setHist] = useState<Route[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDTO>(boot.profile);
  const [settings, setSettings] = useState<SettingsDTO>(boot.settings);
  const mainRef = useRef<HTMLDivElement>(null);
  const tt = useRef<ReturnType<typeof setTimeout>>(undefined);
  const histRef = useRef(hist); histRef.current = hist;
  const routeRef = useRef(route); routeRef.current = route;

  // Server-rendered data goes straight into the cache (no refetch on first paint).
  useState(() => { prime(EP.today, boot.today); prime(EP.settings, boot.settings); prime(EP.me, boot.profile); return 0; });

  // Warm the other tabs in the background so switching is instant.
  useEffect(() => {
    const warm = () => [EP.brief, EP.space, EP.profile, EP.trends, EP.results, EP.docs, EP.protocol, EP.appointments, EP.heart, EP.lifestyle].forEach((u) => load(u).catch(() => {}));
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(warm, { timeout: 2000 }) : setTimeout(warm, 600);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  // Bring the section tabs back into view when the screen changes.
  const scrollTop = () => {
    const el = mainRef.current;
    if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 90) });
  };
  const toast = useCallback((t: string) => {
    clearTimeout(tt.current);
    setToastText(t);
    tt.current = setTimeout(() => setToastText(null), 2600);
  }, []);

  const go = useCallback((s: Screen, p?: Omit<Route, "s">) => {
    const r: Route = { s, ...(p || {}) };
    setHist((h) => [...h, routeRef.current]);
    setRoute(r); setSheet(null); scrollTop();
    window.history.pushState({ mhs: true }, "", toUrl(r));
  }, []);
  const tab = useCallback((s: Screen) => {
    const r: Route = { s };
    setHist([]); setRoute(r); setSheet(null); scrollTop();
    window.history.replaceState({ mhs: true }, "", toUrl(r));
  }, []);
  // In-app back: pops our stack (browser history stays in step via popstate).
  const internalBack = useCallback(() => {
    const h = histRef.current;
    if (h.length) { const r = h[h.length - 1]; setHist(h.slice(0, -1)); setRoute(r); return r; }
    const r: Route = { s: PARENT[routeRef.current.s] || "today" };
    setRoute(r); return r;
  }, []);
  const back = useCallback(() => {
    if (histRef.current.length) { window.history.back(); return; }
    const r = internalBack(); scrollTop();
    window.history.replaceState({ mhs: true }, "", toUrl(r));
  }, [internalBack]);
  useEffect(() => {
    const onPop = () => { if (sheetRef.current) { setSheet(null); } internalBack(); scrollTop(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [internalBack]);
  const sheetRef = useRef(sheet); sheetRef.current = sheet;

  // Esc closes a sheet.
  useEffect(() => {
    if (!sheet) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sheet]);

  const addQuestion = useCallback(async (text: string) => {
    await api("/api/portal/questions", { body: { text } });
    invalidate(EP.appointments); load(EP.appointments, true).catch(() => {});
  }, []);

  const initials = ((profile.firstName[0] || "") + (profile.lastName[0] || "")).toUpperCase();
  const ctx: PortalCtx = useMemo(() => ({
    route, go, tab, back, toast, sheet, openSheet: setSheet, profile, setProfile, settings, setSettings, tz: profile.timezone, initials, addQuestion,
  }), [route, go, tab, back, toast, sheet, profile, settings, initials, addQuestion]);

  const scr = route.s;
  const activeTab = tabOf(scr);
  const group = GROUPS.find((g) => g.tab === activeTab);
  const isDetail = !!PARENT[scr];
  const showBack = isDetail || (hist.length > 0 && !group?.items.some((i) => i.s === scr) && !TABS.some((t) => t.s === scr));
  const backTo = hist.length ? hist[hist.length - 1].s : PARENT[scr] || "today";
  const backLabel = LABELS[backTo] || "Back";
  useUsageTracker(scr, LABELS[scr] || scr, settings.learnUsage !== false);

  const screen = (() => {
    switch (scr) {
      case "today": return <Today />;
      case "trends": return <Trends />;
      case "trend": return <TrendDetail k={route.k!} />;
      case "results": return <Results />;
      case "result": return <ResultDetail id={route.id!} />;
      case "protocol": return <Protocol />;
      case "devices": return <Devices />;
      case "history": return <History />;
      case "appointments": return <Appointments />;
      case "referrals": return <Referrals />;
      case "more": return <More />;
      case "profile": return <Profile />;
      case "privacy": return <Privacy />;
      case "settings": return <Notifications />;
      case "heart": return <Heart />;
      case "lifestyle": return <Lifestyle />;
      case "family": return <Family />;
      case "careview": return <CareView id={route.id!} />;
      case "rewards": return <Rewards />;
      case "story": return <HealthStory />;
      case "baseline": return <Baseline id={route.id} />;
      case "myhealth": return <MyHealth />;
      case "records": return <Records />;
      case "doc": return <DocDetail id={route.id!} />;
      case "add": return <AddRecord />;
      case "food": return <Food />;
      case "plan": return <Plan />;
      case "assessment": return <Assessment />;
    }
  })();

  return (
    <Ctx.Provider value={ctx}>
      <div className="mhs mhs-page">
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <button onClick={() => tab("today")} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
            <span style={{ fontSize: 12, letterSpacing: ".14em", color: C.muted, fontWeight: 500 }}>NEYU HEALTH</span>
            <span style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>My Health Space</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => go("add")} aria-label="Add a report to your Health Space" className="h-primary" style={{ display: "flex", alignItems: "center", gap: 7, height: 40, padding: "0 14px", border: "none", borderRadius: 20, background: C.ink, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              <NIcon name="plus" size={16} tone="#fff" stroke={2} /><span className="mhs-hide-sm">Add report</span>
            </button>
            <button onClick={() => setSheet({ t: "alba" })} className="h-albabtn" aria-label="Ask Neyu about your health data" style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", border: "none", borderRadius: 20, background: "#E6F3F8", color: C.lavDeep, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              <NIcon name="sparkle" size={17} tone="currentColor" /><span className="mhs-hide-sm">Ask Neyu</span>
            </button>
            <button onClick={() => tab("profile")} aria-label="Account, privacy and notifications" aria-current={activeTab === "profile" ? "page" : undefined} style={{ padding: 0, border: activeTab === "profile" ? `2px solid ${C.teal}` : "2px solid transparent", borderRadius: 22, background: "none", cursor: "pointer", lineHeight: 0 }}>
              <Avatar size={36} photoUrl={profile.photoUrl} initials={initials} fontSize={13} />
            </button>
          </div>
        </header>

        {/* Primary tabs — Dynamic Navigation (the pill glides to the active tab) */}
        <nav aria-label="My Health Space" style={{ margin: "0 0 14px" }}>
          <PillNav label="My Health Space sections" tabs={TABS.map((t) => ({ k: t.s, label: t.label, icon: t.icon }))} value={TABS.some((t) => t.s === activeTab) ? activeTab : ("" as Screen)} onChange={(k) => tab(k)} size="sm" />
        </nav>
        {group && group.items.length > 1 && !isDetail && (
          <div role="tablist" aria-label={`${LABELS[group.tab]} sections`} className="neyu-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 0 26px", scrollbarWidth: "none" }}>
            {group.items.map((it) => {
              const a = it.s === scr;
              return <button key={it.s} role="tab" aria-selected={a} onClick={() => tab(it.s)} style={{ flex: "none", height: 34, padding: "0 14px", borderRadius: 17, border: `1px solid ${a ? "transparent" : C.line12}`, background: a ? C.tealChip : "transparent", color: a ? C.tealDark : C.ink2, fontSize: 14, fontWeight: a ? 500 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 160ms" }}>{it.label}</button>;
            })}
          </div>
        )}
        {!(group && group.items.length > 1 && !isDetail) && <div style={{ height: 12 }} />}

        <PolicyUpdate />
        <div ref={mainRef} style={{ scrollMarginTop: 90 }}>
          {showBack && (
            <button onClick={back} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: 0, marginBottom: 12, border: "none", background: "none", fontSize: 15, fontWeight: 500, color: C.teal, cursor: "pointer" }}><NIcon name="ph-caret-left" size={18} tone="currentColor" />{backLabel}</button>
          )}
          <div key={scr + (route.k || "") + (route.id || "")}>{screen}</div>
        </div>

        {sheet && <Sheets />}

        {toastText && (
          <div role="status" className="mhs-toast" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 95, display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100% - 32px)", padding: "12px 16px", borderRadius: 14, background: C.ink, color: C.page, fontSize: 14, boxShadow: "0 12px 32px rgba(29,35,39,.25)", animation: "mhs-fadeUp 260ms ease" }}>
            <NIcon name="ph-check-circle" size={17} tone={"#9FC9D3"} />{toastText}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
