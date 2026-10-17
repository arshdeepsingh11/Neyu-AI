"use client";

// NEYU Health — Admin Console (built 1:1 from the approved Claude Design
// prototype). One client app at /admin with hash routes (#/patients/<id>/labs),
// so staff keep their place and the browser back button works.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BootDTO, Go } from "@/lib/admin/types";
import "./admin.css";
import { Ctx, getView, postAction, setReasonAsker, type AdminCtx, type ConfirmSpec, type FormType, type ActOpts } from "./context";
import { T } from "./ui";
import { SignIn, LockScreen, CommandPalette, ConfirmDialog, RevealDialog, DeleteDialog, ExportDialog, Toasts, ReasonDialog, PasswordDialog, type ToastT } from "./overlays";
import { FormSheet, AiSheet, ReferralSheet, AuditSheet } from "./sheets";
import Overview from "./screens/Overview";
import Inbox from "./screens/Inbox";
import Patients from "./screens/Patients";
import Patient360 from "./screens/Patient360";
import Visitors, { VisitorRecord } from "./screens/Visitors";
import Referrals from "./screens/Referrals";
import Requests from "./screens/Requests";
import AiActivity from "./screens/AiActivity";
import Analytics from "./screens/Analytics";
import AuditLog from "./screens/AuditLog";
import Settings from "./screens/Settings";
import { NeyuMark } from "@/components/brand/NeyuLogo";

const LOCK_MIN = 15;
type Route = { s: string; id: string | null; tab: string };
const SLUG: Record<string, string> = { overview: "overview", inbox: "inbox", patients: "patients", patient: "patients", visitors: "visitors", visitor: "visitors", referrals: "referrals", requests: "service-requests", ai: "ai-activity", analytics: "analytics", audit: "audit-log", settings: "settings" };
const FROM_SLUG: Record<string, string> = { overview: "overview", inbox: "inbox", patients: "patients", visitors: "visitors", referrals: "referrals", "service-requests": "requests", "ai-activity": "ai", analytics: "analytics", "audit-log": "audit", settings: "settings" };

function parseHash(): Route {
  const [slug, id, tab] = (typeof window === "undefined" ? "" : window.location.hash.replace(/^#\/?/, "")).split("/").map(decodeURIComponent);
  const s = FROM_SLUG[slug] || "overview";
  if (id && (s === "patients" || s === "visitors")) return { s: s === "patients" ? "patient" : "visitor", id, tab: tab || "overview" };
  return { s, id: null, tab: "overview" };
}
const hashFor = (r: Route) => "#/" + SLUG[r.s] + (r.id ? "/" + encodeURIComponent(r.id) + (r.tab && r.tab !== "overview" ? "/" + r.tab : "") : "");

type SheetState = { kind: "form"; type: FormType; pid: string; init: Record<string, string>; editId?: string } | { kind: "ai"; id: string } | { kind: "ref"; id: string } | { kind: "audit"; id: string } | null;

export default function AdminConsole({ signedIn, actor: initialActor }: { signedIn: boolean; actor: string }) {
  const [authed, setAuthed] = useState(signedIn);
  const [actor, setActor] = useState(initialActor);
  const [route, setRoute] = useState<Route>({ s: "overview", id: null, tab: "overview" });
  const [locked, setLocked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [vw, setVw] = useState(1440);
  const [cmd, setCmd] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [reveal, setReveal] = useState<{ pid: string; pname: string; section: "health" | "labs" | "ai"; label: string; onData: (d: any) => void } | null>(null);
  const [del, setDel] = useState<{ pid: string; pname: string } | null>(null);
  const [exp, setExp] = useState<{ pid: string; pname: string } | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [range, setRange] = useState("30D");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [customOpen, setCustomOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState("all");
  const [settingsTab, setSettingsTab] = useState("clinic");
  const [version, setVersion] = useState(0);
  const [boot, setBoot] = useState<BootDTO | null>(null);
  const [notifSeen, setNotifSeen] = useState("");
  const [reasonAsk, setReasonAsk] = useState<{ label: string; resolve: (r: string | null) => void } | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  // Break-glass prompt: the data layer asks, this dialog answers.
  useEffect(() => { setReasonAsker((label) => new Promise((resolve) => setReasonAsk({ label, resolve }))); return () => setReasonAsker(null); }, []);
  const lastAct = useRef(Date.now());
  const scroller = useRef<HTMLDivElement>(null);

  const mobile = vw < 720, isCollapsed = collapsed || vw < 1100, canEdit = !mobile;
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // ── Routing ──
  useEffect(() => {
    const on = () => { setRoute(parseHash()); setMenu(null); setSheet(null); scroller.current?.scrollTo({ top: 0 }); };
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const navigate = useCallback((r: Route) => { const h = hashFor(r); if (window.location.hash === h) { setRoute(r); } else window.location.hash = h; setCmd(false); }, []);
  const openAI = useCallback((key: string) => { setMenu(null); setCmd(false); setSheet({ kind: "ai", id: key }); }, []);
  const openRef = useCallback((id: string) => { setMenu(null); setCmd(false); setSheet({ kind: "ref", id }); }, []);
  const go = useCallback((g: Go | { s: string; id?: string; tab?: string }) => {
    if ("ref" in g) return openRef(g.ref);
    if ("ai" in g) return openAI(g.ai);
    navigate({ s: g.s, id: ("id" in g && g.id) || null, tab: ("tab" in g && g.tab) || "overview" });
  }, [navigate, openAI, openRef]);

  // ── Session: idle lock, sign-out on 401, viewport ──
  useEffect(() => {
    try { if (sessionStorage.getItem("anra_admin_locked") === "1") setLocked(true); } catch { /* */ }
    const onResize = () => setVw(window.innerWidth);
    onResize();
    const touch = () => { lastAct.current = Date.now(); };
    const out = () => setAuthed(false);
    window.addEventListener("resize", onResize);
    ["mousemove", "keydown", "pointerdown", "wheel", "touchstart"].forEach((e) => window.addEventListener(e, touch, { passive: true }));
    window.addEventListener("anra-admin-signed-out", out);
    return () => { window.removeEventListener("resize", onResize); ["mousemove", "keydown", "pointerdown", "wheel", "touchstart"].forEach((e) => window.removeEventListener(e, touch)); window.removeEventListener("anra-admin-signed-out", out); };
  }, []);
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(() => { if (!locked && Date.now() - lastAct.current > LOCK_MIN * 60000) lock(); }, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, locked]);
  const lock = () => { setLocked(true); setCmd(false); setMenu(null); try { sessionStorage.setItem("anra_admin_locked", "1"); } catch { /* */ } };
  const unlock = () => { setLocked(false); lastAct.current = Date.now(); try { sessionStorage.removeItem("anra_admin_locked"); } catch { /* */ } refresh(); };
  const signOut = async () => { await fetch("/api/admin/logout", { method: "POST" }).catch(() => {}); try { sessionStorage.removeItem("anra_admin_locked"); } catch { /* */ } setAuthed(false); setLocked(false); setMenu(null); window.location.hash = "#/overview"; };

  // ── Boot data (badge, notifications) every minute and after changes ──
  useEffect(() => {
    if (!authed || locked) return;
    let live = true;
    const load = () => getView<BootDTO>("boot").then((b) => { if (live) { setBoot(b); setActor(b.actor); } }).catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => { live = false; clearInterval(iv); };
  }, [authed, locked, version]);

  // ── Keyboard: ⌘K and Escape ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (authed && !locked) { setCmd((c) => !c); setMenu(null); } return; }
      if (e.key !== "Escape") return;
      if (cmd) return setCmd(false);
      if (confirm) return setConfirm(null);
      if (del) return setDel(null);
      if (exp) return setExp(null);
      if (reveal) return setReveal(null);
      if (sheet) return setSheet(null);
      if (customOpen) return setCustomOpen(false);
      if (menu) return setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authed, locked, cmd, confirm, del, exp, reveal, sheet, menu, customOpen]);

  // ── Toasts + actions ──
  const toast = useCallback((title: string, sub?: string, undo?: (() => void) | null, tone: "ok" | "err" = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, sub, undo, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "err" ? 8000 : 6000);
  }, []);
  const act = useCallback(async (body: Record<string, unknown>, o: ActOpts) => {
    try {
      const r = await postAction(body);
      const sub = typeof o.sub === "function" ? o.sub(r) : o.sub;
      const undo = o.undoable && r?.undo ? () => { postAction(r.undo).then(() => { refresh(); toast("Undone", "The previous state was restored."); }).catch((e) => toast("Couldn't undo", e.message, null, "err")); } : null;
      toast(o.success, sub || undefined, undo);
      o.after?.(r);
      refresh();
      return r;
    } catch (e: any) {
      toast("That didn't work", e.message, null, "err");
      throw e;
    }
  }, [refresh, toast]);

  const rangeParams = useMemo(() => (range === "Custom" && custom.from && custom.to ? { range, from: custom.from, to: custom.to } : { range: range === "Custom" ? "30D" : range }), [range, custom]);

  const ctx: AdminCtx = {
    actor, perms: boot?.perms, system: boot?.system, canEdit, mobile, version, refresh, go, openAI, openRef,
    setTab: (tab) => navigate({ ...route, tab }),
    openAudit: (id) => { setMenu(null); setSheet({ kind: "audit", id }); },
    openForm: (type, pid, init = {}, editId) => { setMenu(null); setSheet({ kind: "form", type, pid, init, editId }); },
    toast, confirm: (c) => { setMenu(null); setConfirm(c); }, act,
    askReveal: (pid, pname, section, label, onData) => setReveal({ pid, pname, section, label, onData }),
    askDelete: (pid, pname) => setDel({ pid, pname }),
    askExport: (pid, pname) => setExp({ pid, pname }),
    range, rangeParams, menu, setMenu,
  };

  if (!authed) return <div className="anra-admin"><SignIn onSignedIn={(a) => { setActor(a); setAuthed(true); setLocked(false); lastAct.current = Date.now(); refresh(); }} /></div>;

  const queueN = boot?.queueCount ?? 0;
  const R = route;
  // Menu shows only the screens this role can open (boot.nav from the server).
  const allowed = (k: string) => !boot?.nav || boot.nav.includes(k);
  const nav: ([string, string, string, number?, boolean?] | ["G", string])[] = ([
    ["overview", "Overview", "ph-squares-four"], ["inbox", "Inbox", "ph-tray", queueN], ["G", "People"],
    ["patients", "Patients", "ph-user", 0, true], ["visitors", "Visitors", "ph-user-circle-dashed", 0, true],
    ["referrals", "Referrals", "ph-arrow-square-in"], ["requests", "Service requests", "ph-calendar-plus"], ["ai", "AI Activity", "ph-sparkle"], ["analytics", "Analytics", "ph-chart-line"], ["audit", "Audit Log", "ph-shield-check"], ["settings", "Settings", "ph-gear-six"],
  ] as ([string, string, string, number?, boolean?] | ["G", string])[]).filter((n) => n[0] === "G" ? allowed("patients") || allowed("visitors") : allowed(n[0]));
  const screenKey = R.s === "patient" ? "patients" : R.s === "visitor" ? "visitors" : R.s;
  const blocked = !!boot?.nav && !boot.nav.includes(screenKey);
  const actorInit = actor.split("@")[0].replace(/[^a-z]/gi, " ").trim().split(/\s+/).map((x) => x[0] || "").join("").slice(0, 2).toUpperCase() || "AD";
  const notifs = boot ? [
    ...(boot.emergencyCount ? [{ title: `${boot.emergencyCount} emergency-flagged symptom check${boot.emergencyCount > 1 ? "s" : ""}`, sub: "Needs review now", icon: "ph ph-warning-circle", fg: T.peachInk, bg: T.peach, run: () => { setInboxTab("urgent"); go({ s: "inbox" }); } }] : []),
    ...(boot.latestReferral ? [{ title: "New referral " + boot.latestReferral.code, sub: boot.latestReferral.label, icon: "ph ph-arrow-square-in", fg: T.teal, bg: T.wash, run: () => openRef(boot.latestReferral!.id) }] : []),
    boot.emailConfigured ? { title: "Email delivery is set up", sub: "Verification codes and reminders can be sent", icon: "ph ph-envelope-simple", fg: T.teal, bg: T.wash, run: () => { setSettingsTab("email"); go({ s: "settings" }); } }
      : { title: "Email isn't set up", sub: "Verification codes can't be sent", icon: "ph ph-envelope-simple", fg: T.peachInk, bg: T.peach, run: () => { setSettingsTab("email"); go({ s: "settings" }); } },
  ] : [];
  const notifSig = notifs.map((n) => n.title).join("|");
  const notifN = notifSig && notifSig !== notifSeen ? notifs.filter((n) => n.fg === T.peachInk || n.title.startsWith("New referral")).length : 0;
  const showRange = (R.s === "overview" || R.s === "analytics") && !blocked;
  const isActive = (k: string) => R.s === k || (k === "patients" && R.s === "patient") || (k === "visitors" && R.s === "visitor");

  return (
    <Ctx.Provider value={ctx}>
      <div className="anra-admin" ref={scroller} onScroll={() => { lastAct.current = Date.now(); }}>
        <div style={{ display: "flex", minHeight: "100vh", filter: locked ? "blur(0)" : undefined }}>
          {/* Sidebar */}
          <nav aria-label="Primary" style={{ position: "sticky", top: 0, height: "100vh", flex: "none", width: isCollapsed ? 72 : 256, background: T.side, borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column", transition: "width 280ms cubic-bezier(.2,.8,.2,1)", overflow: "hidden", zIndex: 30 }}>
            <div style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", flex: "none" }}>
              <div style={{ width: 34, height: 34, flex: "none", display: "grid", placeItems: "center" }}><NeyuMark size={30} title="NEYU Health" /></div>
              {!isCollapsed && <div style={{ lineHeight: 1.15, whiteSpace: "nowrap" }}><div style={{ fontWeight: 600, fontSize: 15 }}>NEYU Health</div><div style={{ fontSize: 12.5, color: T.faint }}>Admin</div></div>}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              {nav.map((n) => {
                if (n[0] === "G") return isCollapsed ? <div key="g" style={{ height: 10 }} /> : <div key="g" style={{ fontSize: 12, fontWeight: 500, color: T.faint, padding: "14px 10px 4px", letterSpacing: ".02em" }}>{n[1]}</div>;
                const [k, l, ic, badge, sub] = n as [string, string, string, number?, boolean?];
                const on = isActive(k);
                return (
                  <button key={k} onClick={() => go({ s: k })} title={l} aria-current={on ? "page" : undefined} className="h-card" style={{ display: "flex", alignItems: "center", gap: 12, height: 40, padding: `0 10px 0 ${sub && !isCollapsed ? 22 : 10}px`, border: "none", borderRadius: 12, background: on ? T.card : "transparent", color: on ? T.ink : T.ink2, boxShadow: on ? "0 1px 2px rgba(29,35,39,.06)" : "none", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left", whiteSpace: "nowrap", transition: "background 180ms" }}>
                    <i className={(on ? "ph-fill " : "ph ") + ic} style={{ fontSize: 19, color: on ? T.teal : T.faint, flex: "none" }} />
                    {!isCollapsed && <span style={{ flex: 1 }}>{l}</span>}
                    {!isCollapsed && !!badge && <span style={{ minWidth: 22, height: 20, padding: "0 6px", borderRadius: 999, background: T.chip, color: T.tealDk, fontSize: 12, display: "grid", placeItems: "center" }}>{badge}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8, flex: "none" }}>
              <button onClick={() => setCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="h-card" style={{ display: "flex", alignItems: "center", gap: 12, height: 36, padding: "0 10px", border: "none", borderRadius: 10, background: "transparent", color: T.faint, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}><i className="ph ph-sidebar-simple" style={{ fontSize: 18 }} />{!isCollapsed && <span>Collapse</span>}</button>
              <button onClick={() => setMenu(menu === "prof" ? null : "prof")} className="h-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: "none", borderRadius: 12, background: "transparent", cursor: "pointer", textAlign: "left", whiteSpace: "nowrap", color: T.ink }}>
                <span style={{ position: "relative", width: 34, height: 34, flex: "none", borderRadius: "50%", background: T.chip, color: T.tealDk, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 }}>{actorInit}<span style={{ position: "absolute", right: -1, bottom: -1, width: 10, height: 10, borderRadius: "50%", background: T.tealLt, border: `2px solid ${T.side}` }} /></span>
                {!isCollapsed && <><span style={{ minWidth: 0, flex: 1 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{actor}</span><span style={{ display: "block", fontSize: 12, color: T.faint }}>{boot?.role || "Staff"} · Online</span></span><i className="ph ph-gear-six" style={{ color: T.faint }} /></>}
              </button>
            </div>
          </nav>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {/* Top bar */}
            <header style={{ position: "sticky", top: 0, zIndex: 20, height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", background: "rgba(246,244,241,.88)", backdropFilter: "saturate(1.4) blur(14px)", WebkitBackdropFilter: "saturate(1.4) blur(14px)", borderBottom: `1px solid ${T.line}` }}>
              <button onClick={() => { setCmd(true); setMenu(null); }} aria-label="Search, Command K" className="h-border" style={{ flex: 1, maxWidth: 460, height: 40, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(29,35,39,.08)", background: T.card, color: T.faint, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                <i className="ph ph-magnifying-glass" style={{ fontSize: 17 }} /><span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Search patients, visitors, referrals...</span><span style={{ fontSize: 12, border: "1px solid rgba(29,35,39,.12)", borderRadius: 6, padding: "1px 6px" }}>⌘K</span>
              </button>
              <div style={{ flex: 1 }} />
              {showRange && !mobile && (
                <div style={{ position: "relative" }}>
                  <div role="group" aria-label="Date range" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: T.stone }}>
                    {["7D", "30D", "90D", "1Y", "Custom"].map((r) => (
                      <button key={r} onClick={() => { if (r === "Custom") setCustomOpen(!customOpen); else { setRange(r); setCustomOpen(false); } }} aria-pressed={range === r} style={{ height: 30, padding: "0 10px", border: "none", borderRadius: 9, background: range === r ? T.card : "transparent", color: range === r ? T.ink : T.ink2, boxShadow: range === r ? "0 1px 3px rgba(29,35,39,.12)" : "none", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 220ms", whiteSpace: "nowrap" }}>{r}</button>
                    ))}
                  </div>
                  {customOpen && <CustomRange init={custom} onApply={(c) => { setCustom(c); setRange("Custom"); setCustomOpen(false); }} />}
                </div>
              )}
              {boot?.hasTestData && <span title="Test accounts exist. They are marked TEST everywhere and excluded from analytics." style={{ height: 26, padding: "0 10px", borderRadius: 999, border: "1px dashed rgba(29,35,39,.25)", color: T.ink2, fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none" }}>TEST DATA</span>}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setMenu(menu === "notif" ? null : "notif"); setNotifSeen(notifSig); }} aria-label="Notifications" className="h-stone" style={{ position: "relative", width: 40, height: 40, borderRadius: 12, border: "none", background: menu === "notif" ? T.stone : "transparent", color: T.ink2, fontSize: 20, cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <i className="ph ph-bell" />
                  {notifN > 0 && <span style={{ position: "absolute", top: 6, right: 5, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: T.peachInk, color: T.card, fontSize: 10.5, fontWeight: 600, display: "grid", placeItems: "center" }}>{notifN}</span>}
                </button>
                {menu === "notif" && (
                  <div style={{ position: "absolute", right: 0, top: 48, width: 340, background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: T.shadow, padding: 8, zIndex: 40, animation: "anraPop 220ms ease-out" }}>
                    <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 500, color: T.ink2 }}>Notifications</div>
                    {notifs.map((n) => (
                      <button key={n.title} onClick={() => { setMenu(null); n.run(); }} className="h-page" style={{ display: "flex", gap: 12, width: "100%", padding: 10, border: "none", background: "transparent", borderRadius: 12, textAlign: "left", cursor: "pointer" }}>
                        <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, background: n.bg, color: n.fg, display: "grid", placeItems: "center" }}><i className={n.icon} /></span>
                        <span><span style={{ display: "block", fontSize: 14, fontWeight: 500, color: T.ink }}>{n.title}</span><span style={{ display: "block", fontSize: 13, color: T.faint }}>{n.sub}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenu(menu === "prof" ? null : "prof")} aria-label="Staff profile" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: T.chip, color: T.tealDk, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{actorInit}</button>
                {menu === "prof" && (
                  <div style={{ position: "absolute", right: 0, top: 46, width: 280, background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: T.shadow, padding: 8, zIndex: 40, animation: "anraPop 220ms ease-out" }}>
                    <div style={{ padding: "10px 12px 12px" }}><div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{actor}</div><div style={{ fontSize: 13, color: T.faint }}>{boot?.role || "Staff"}</div></div>
                    <button onClick={() => { setMenu(null); setPwOpen(true); }} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 40, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, color: T.ink, cursor: "pointer" }}><i className="ph ph-key" />Change password</button>
                    <button onClick={lock} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 40, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, color: T.ink, cursor: "pointer" }}><i className="ph ph-lock-simple" />Lock session</button>
                    <button onClick={signOut} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 40, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, color: T.ink, cursor: "pointer" }}><i className="ph ph-sign-out" />Sign out</button>
                    <div style={{ padding: "8px 12px", fontSize: 12, color: T.faint }}>Locks automatically after {LOCK_MIN} min idle.</div>
                  </div>
                )}
              </div>
            </header>
            {mobile && <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 16px", background: T.wash, color: T.tealDk, fontSize: 13.5 }}><i className="ph ph-device-mobile" />Read-only on phone. Use a desktop or clinic iPad to make changes.</div>}

            <main id="anra-main" style={{ flex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: mobile ? "24px 16px 80px" : "32px 32px 80px" }}>
              {!locked && blocked && (
                <div data-testid="no-access" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "80px 20px", textAlign: "center" }}>
                  <span style={{ width: 52, height: 52, borderRadius: 16, background: T.stone, color: T.ink2, display: "grid", placeItems: "center", fontSize: 24 }}><i className="ph ph-lock-key" /></span>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Not part of your role</h1>
                  <p style={{ margin: 0, color: T.ink2, maxWidth: 420 }}>Your role ({boot?.role}) doesn't include this screen. Ask a super admin if you need it.</p>
                  <button onClick={() => go({ s: boot?.nav?.[0] || "settings" })} className="h-primary" style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: T.teal, color: T.card, cursor: "pointer" }}>Go to {boot?.nav?.[0] || "settings"}</button>
                </div>
              )}
              {!locked && !blocked && <>
                {R.s === "overview" && <Overview openInbox={(t) => { setInboxTab(t); go({ s: "inbox" }); }} />}
                {R.s === "inbox" && <Inbox tab={inboxTab} setTab={setInboxTab} />}
                {R.s === "patients" && <Patients />}
                {R.s === "patient" && R.id && <Patient360 key={R.id} id={R.id} tab={R.tab} />}
                {R.s === "visitors" && <Visitors />}
                {R.s === "visitor" && R.id && <VisitorRecord key={R.id} id={R.id} tab={R.tab} />}
                {R.s === "referrals" && <Referrals />}
                {R.s === "requests" && <Requests />}
                {R.s === "ai" && <AiActivity />}
                {R.s === "analytics" && <Analytics />}
                {R.s === "audit" && <AuditLog />}
                {R.s === "settings" && <Settings tab={settingsTab} setTab={setSettingsTab} />}
              </>}
            </main>
          </div>
        </div>

        {menu && menu !== "ptmore" && <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 12 }} />}
        {menu === "ptmore" && <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />}
        {!locked && cmd && <CommandPalette onClose={() => setCmd(false)} recent={(boot?.activity || []).map((x) => ({ title: x.title, sub: `${x.who} · ${x.time}`, icon: x.icon, go: x.go }))} />}
        {!locked && sheet?.kind === "form" && <FormSheet key={sheet.type + sheet.pid + (sheet.editId || "")} type={sheet.type} patientId={sheet.pid} init={sheet.init} editId={sheet.editId} onClose={() => setSheet(null)} />}
        {!locked && sheet?.kind === "ai" && <AiSheet id={sheet.id} onClose={() => setSheet(null)} />}
        {!locked && sheet?.kind === "ref" && <ReferralSheet id={sheet.id} onClose={() => setSheet(null)} />}
        {!locked && sheet?.kind === "audit" && <AuditSheet id={sheet.id} onClose={() => setSheet(null)} />}
        {reasonAsk && <ReasonDialog label={reasonAsk.label} onDone={(r) => { reasonAsk.resolve(r); setReasonAsk(null); }} />}
        {pwOpen && <PasswordDialog onClose={() => setPwOpen(false)} onSaved={() => toast("Password changed", "Other devices were signed out")} />}
        {!locked && reveal && <RevealDialog pname={reveal.pname} label={reveal.label} onCancel={() => setReveal(null)} onReveal={async (reason) => {
          const r = await postAction({ action: "reveal", patientId: reveal.pid, section: reveal.section, reason });
          reveal.onData({ data: r.data, reason });
          setReveal(null);
          toast(reveal.label + " revealed", "Reason logged to the audit log: " + reason);
        }} />}
        {!locked && confirm && <ConfirmDialog c={confirm} onClose={() => setConfirm(null)} />}
        {!locked && del && <DeleteDialog pid={del.pid} pname={del.pname} onClose={() => setDel(null)} />}
        {!locked && exp && <ExportDialog pid={exp.pid} pname={exp.pname} onClose={() => setExp(null)} />}
        <Toasts toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
        {locked && <LockScreen actor={actor} minutes={LOCK_MIN} onUnlock={unlock} onSignOut={signOut} />}
      </div>
    </Ctx.Provider>
  );
}

function CustomRange({ init, onApply }: { init: { from: string; to: string }; onApply: (c: { from: string; to: string }) => void }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });
  const [from, setFrom] = useState(init.from || new Date(Date.now() - 14 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }));
  const [to, setTo] = useState(init.to || today);
  const inp = { height: 38, borderRadius: 10, border: `1px solid ${T.line3}`, padding: "0 10px", fontSize: 14, color: T.ink, background: T.card } as React.CSSProperties;
  return (
    <div style={{ position: "absolute", right: 0, top: 44, width: 280, background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: T.shadow, padding: 16, zIndex: 40, display: "flex", flexDirection: "column", gap: 10, animation: "anraPop 220ms ease-out" }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink2 }}>Custom range</div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: T.faint }}>From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="f-teal" style={inp} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: T.faint }}>To<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="f-teal" style={inp} /></label>
      <button onClick={() => from && to && onApply({ from, to })} className="h-primary" style={{ height: 38, borderRadius: 10, border: "none", background: T.teal, color: T.card, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Apply</button>
    </div>
  );
}
