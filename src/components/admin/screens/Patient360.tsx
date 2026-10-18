"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Patient360DTO, HealthRevealDTO, LabDTO, AiRow, ApptDTO } from "@/lib/admin/types";
import { useAdmin, useView, postAction } from "../context";
import { T, S, chip, Chip, TestTag, Orb, TabBar, RecordSkeleton, Failed, CaretRow, tone, type ChipData } from "../ui";
import { decAI } from "./AiActivity";

const TABS: [string, string][] = [["overview", "Overview"], ["timeline", "Timeline"], ["health", "Health Data"], ["labs", "Labs"], ["protocol", "Protocol"], ["appointments", "Appointments"], ["referrals", "Referrals"], ["ai", "AI & Assessments"], ["devices", "Devices & Sessions"], ["audit", "Audit"]];
type Section = "health" | "labs" | "ai";

export const refUrg = (u: string) => (/asap|^urgent/i.test(u) ? chip(u, "urgent", "ph-warning") : /semi/i.test(u) ? chip(u, "teal", "ph-circle") : chip(u, "neutral", "ph-circle"));
export const refSt = (s: string) => chip(s, s === "Reviewed" || s === "Scheduled" ? "teal" : "neutral", ({ Received: "ph-tray", Reviewed: "ph-eye", Scheduled: "ph-calendar-check", Closed: "ph-check" } as Record<string, string>)[s]);
export const auditChip = (k: string) => chip(k, ({ View: "neutral", Reveal: "ai", Change: "teal", Export: "urgent", Account: "neutral" } as const)[k as "View"] || "neutral", ({ View: "ph-eye", Reveal: "ph-eye-slash", Change: "ph-pencil-simple", Export: "ph-export", Account: "ph-user" } as Record<string, string>)[k]);

const card = { ...S.card, padding: "20px 22px" };
const h2 = { margin: 0, fontSize: 16, fontWeight: 500 } as React.CSSProperties;
const sectionH = { margin: 0, fontSize: 18, fontWeight: 500, flex: 1 } as React.CSSProperties;
const btnHead = { height: 38, padding: "0 12px", borderRadius: 12, border: `1px solid ${T.line3}`, background: T.card, fontSize: 13.5, fontWeight: 500, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap", color: T.ink } as React.CSSProperties;
const btnPrim = { height: 38, padding: "0 14px", borderRadius: 12, border: "none", background: T.teal, color: T.card, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" } as React.CSSProperties;

function EmptyCard({ title, sub }: { title: string; sub?: string }) {
  return <div style={{ padding: 40, borderRadius: 20, background: T.card, border: `1px solid ${T.line}`, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>{sub && <div style={{ color: T.ink2, fontSize: 14 }}>{sub}</div>}</div>;
}
function Hidden({ name, what, extra }: { name: string; what: string; extra: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 22, borderRadius: 20, background: T.side }}>
      <i className="ph ph-shield-slash" style={{ fontSize: 24, color: T.ink2 }} />
      <div><div style={{ fontSize: 15.5, fontWeight: 500 }}>Hidden by patient consent</div><div style={{ fontSize: 14, color: T.ink2 }}>{name} has turned off {what}. {extra}</div></div>
    </div>
  );
}
function RevealedBar({ onHide }: { onHide: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: T.tealDk }}>
      <i className="ph ph-eye" />Revealed for this session · access logged<span style={{ flex: 1 }} />
      <button onClick={onHide} className="h-sand" style={{ height: 32, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.line3}`, background: T.card, fontSize: 13, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap", color: T.ink }}><i className="ph ph-eye-slash" />Hide again</button>
    </div>
  );
}

export default function Patient360({ id, tab }: { id: string; tab: string }) {
  const a = useAdmin();
  const { data: p, error, loading, reload } = useView<Patient360DTO>("patient", { id }, { logFirst: true });
  const [revealed, setRevealed] = useState<{ health?: HealthRevealDTO; labs?: LabDTO[]; ai?: AiRow[] }>({});
  const reasons = useRef<Partial<Record<Section, string>>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const firstVersion = useRef(a.version);

  // A new patient: nothing is revealed.
  useEffect(() => { setRevealed({}); reasons.current = {}; setOpen({}); }, [id]);
  // After a change, refresh the sections that are currently revealed (each refresh is logged again).
  useEffect(() => {
    if (a.version === firstVersion.current) return;
    firstVersion.current = a.version;
    (Object.keys(reasons.current) as Section[]).forEach((s) => {
      postAction({ action: "reveal", patientId: id, section: s, reason: reasons.current[s] + " (refreshed after change)" })
        .then((r) => setRevealed((x) => ({ ...x, [s]: r.data })))
        .catch(() => setRevealed((x) => { const n = { ...x }; delete n[s]; return n; }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.version]);

  if (loading) return <RecordSkeleton />;
  if (error && !p) return <Failed what="this patient record" onRetry={reload} />;
  if (!p) return null;

  const reveal = (s: Section, label: string) => a.askReveal(p.id, p.name, s, label, (d) => { setRevealed((x) => ({ ...x, [s]: d.data })); reasons.current[s] = d.reason; });
  const hide = (s: Section) => { setRevealed((x) => { const n = { ...x }; delete n[s]; return n; }); delete reasons.current[s]; };
  const setTab = (t: string) => a.setTab(t);
  const devSummary = p.devices.length ? `${p.devices.filter((d) => d.status === "Connected").length} of ${p.devices.length} connected` : "No devices";
  const consent: ChipData[] = [
    p.consent.wearables ? chip("Wearables · Shared", "teal", "ph-check-circle") : chip("Wearables · Off", "neutral", "ph-minus-circle"),
    p.consent.labs ? chip("Labs · Shared", "teal", "ph-check-circle") : chip("Labs · Off", "neutral", "ph-minus-circle"),
    p.consent.clinical ? chip("Clinical records · Shared", "teal", "ph-check-circle") : chip("Clinical records · Off", "neutral", "ph-minus-circle"),
    p.consent.alba ? chip("Neyu · Allowed", "teal", "ph-check-circle") : chip("Neyu · Off", "neutral", "ph-minus-circle"),
  ];
  const next = p.upcoming[0];
  const active = p.protocol.filter((x) => x.status === "Active");
  const protRate = active.length ? Math.round(active.reduce((s, x) => s + x.rate, 0) / active.length) + "% avg completion · last 30 days" : "No active items";
  const actions = {
    addLab: () => a.openForm("lab", p.id, { patient: p.name }),
    addProt: () => a.openForm("protocol", p.id),
    addAppt: () => a.openForm("appt", p.id, { patient: p.name }),
    addReading: () => a.openForm("reading", p.id),
    linkRef: () => a.openForm("link", p.id),
    addCare: () => a.openForm("care", p.id),
    exportData: () => { a.setMenu(null); a.askExport(p.id, p.name); },
    deactivate: () => a.confirm({
      title: p.acct === "Deactivated" ? "Reactivate account?" : `Deactivate ${p.name}’s account?`,
      body: p.acct === "Deactivated" ? "The patient can sign in to My Health Space again." : "The patient can no longer sign in to My Health Space and is signed out everywhere. Their record, history and audit trail are kept and staff can still view them. You can reactivate at any time.",
      label: p.acct === "Deactivated" ? "Reactivate" : "Deactivate account", danger: p.acct !== "Deactivated",
      run: () => a.act({ action: "account.deactivate", patientId: p.id }, { success: p.acct === "Deactivated" ? "Account reactivated" : "Account deactivated", sub: p.name }),
    }),
    deleteAcct: () => { a.setMenu(null); a.askDelete(p.id, p.name); },
    resend: () => a.act({ action: "account.resend", patientId: p.id }, { success: "Verification email resent", sub: (r) => r?.message || "" }),
    pushTest: () => a.act({ action: "push.test", patientId: p.id }, { success: "Test notification sent", sub: "It arrives on the patient's phone in a few seconds" }),
    verify: () => a.confirm({ title: `Confirm ${p.name}’s email by hand?`, body: `Only do this after checking ${p.email} with the patient (phone call or in person). They can then sign in without the email code. This is saved in the audit log.`, label: "Email checked — confirm", run: () => a.act({ action: "account.verify", patientId: p.id, how: "Checked with the patient by staff" }, { success: "Email confirmed", sub: "The patient can sign in now" }) }),
    unlock: () => a.confirm({ title: `Unlock ${p.name}’s account?`, body: "The account was locked after repeated failed sign-in attempts. Unlocking lets the patient try again immediately.", label: "Unlock account", run: () => a.act({ action: "account.unlock", patientId: p.id }, { success: "Account unlocked", sub: p.name + " can sign in again." }) }),
    signOutAll: () => a.confirm({ title: `Sign ${p.name} out of all devices?`, body: "Every active My Health Space session ends immediately. The patient can sign in again with their password.", label: "Sign out all devices", danger: true, run: () => a.act({ action: "session.revokeAll", patientId: p.id }, { success: "Signed out of all devices", sub: p.name }) }),
  };

  return (
    <section data-screen-label="05 Patient 360" style={{ display: "flex", flexDirection: "column", gap: 22, animation: "anraFade 260ms ease-out" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ width: 64, height: 64, flex: "none", borderRadius: "50%", background: T.chip, color: T.tealDk, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 500 }}>{p.initials}</span>
        <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={S.h1}>{p.name}</h1>
            <Chip c={p.verified ? chip("Verified", "teal", "ph-seal-check") : chip("Unverified", "neutral", "ph-clock")} />
            {p.locked && <Chip c={chip("Account locked", "urgent", "ph-lock")} />}
            {p.acct !== "Active" && <Chip c={chip(p.acct, "urgent", "ph-prohibit")} />}
            <TestTag show={p.test} />
          </div>
          <div style={{ display: "flex", gap: "6px 18px", flexWrap: "wrap", fontSize: 14, color: T.ink2 }}>
            {p.age != null && <span>{p.age} years</span>}<span>{p.id}</span><span>Member since {p.since}</span><span>Last active {p.lastActive}</span>
          </div>
          <div aria-label="Consent" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>{consent.map((c) => <Chip key={c.text} c={c} h={26} />)}</div>
        </div>
        {a.canEdit && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
            <button onClick={actions.addLab} className="h-primary" style={{ ...btnHead, border: "none", background: T.teal, color: T.card }}><i className="ph ph-flask" />Add lab</button>
            <button onClick={actions.addProt} className="h-sand" style={btnHead}><i className="ph ph-pill" />Add protocol</button>
            <button onClick={actions.addAppt} className="h-sand" style={btnHead}><i className="ph ph-calendar-plus" />Add appointment</button>
            <button onClick={actions.addReading} className="h-sand" style={btnHead}><i className="ph ph-heartbeat" />Add reading</button>
            <button onClick={actions.linkRef} className="h-sand" style={btnHead}><i className="ph ph-link" />Link referral</button>
            <button onClick={() => a.setMenu(a.menu === "ptmore" ? null : "ptmore")} aria-label="More actions" aria-expanded={a.menu === "ptmore"} className="h-sand" style={{ ...btnHead, width: 38, padding: 0, justifyContent: "center" }}><i className="ph ph-dots-three" /></button>
            {a.menu === "ptmore" && (
              <div role="menu" style={{ position: "absolute", right: 0, top: 46, width: 240, background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadow, padding: 6, zIndex: 15, animation: "anraPop 200ms ease-out" }}>
                <MenuItem icon="ph-export" onClick={actions.exportData}>Export patient data</MenuItem>
                <MenuItem icon="ph-user-minus" onClick={() => { a.setMenu(null); actions.deactivate(); }}>{p.acct === "Deactivated" ? "Reactivate account" : "Deactivate account"}</MenuItem>
                <div style={{ height: 1, background: T.line, margin: "4px 8px" }} />
                <MenuItem icon="ph-trash" danger onClick={actions.deleteAcct}>Delete account…</MenuItem>
              </div>
            )}
          </div>
        )}
      </div>

      <TabBar tabs={TABS} active={tab} onPick={setTab} label="Patient record sections" sticky />

      {tab === "overview" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", animation: "anraFade 220ms" }}>
          <div style={{ flex: "1.4 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h2 style={h2}>Upcoming appointment</h2><button onClick={() => setTab("appointments")} className="h-line" style={{ border: "none", background: "none", color: T.tealDk, fontSize: 13.5, cursor: "pointer" }}>All appointments</button></div>
              {next ? (
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 56, height: 60, borderRadius: 14, background: T.wash, color: T.tealDk, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><i className="ph ph-calendar-check" style={{ fontSize: 22 }} /></div>
                  <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 17, fontWeight: 500 }}>{next.date} · {next.time}</div><div style={{ color: T.ink2, fontSize: 14 }}>{next.clinician} · {next.specialty} · {next.location}</div><div style={{ color: T.faint, fontSize: 13, marginTop: 2 }}>Visit prep: {next.prep}</div></div>
                  <Chip c={apptChip(next)} />
                </div>
              ) : <p style={{ margin: "12px 0 0", color: T.ink2 }}>No upcoming appointments.</p>}
            </div>
            <div style={card}>
              <h2 style={{ ...h2, margin: "0 0 4px" }}>Protected information</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: T.faint }}>Masked by default. Revealing any section asks for a reason and is logged.</p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <ProtRow icon="ph-watch" label={`Wearable data · ${devSummary}`} hidden={p.healthHidden} shown={!!revealed.health} onClick={() => setTab("health")} />
                <ProtRow icon="ph-flask" label={`Lab results · ${p.labsN}`} hidden={p.labsHidden} shown={!!revealed.labs} onClick={() => setTab("labs")} />
                <ProtRow icon="ph-sparkle" ai label={`AI conversations and assessments · ${p.aisN}`} hidden={false} shown={!!revealed.ai} onClick={() => setTab("ai")} />
              </div>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={h2}>Recent activity</h2><button onClick={() => setTab("timeline")} className="h-line" style={{ border: "none", background: "none", color: T.tealDk, fontSize: 13.5, cursor: "pointer" }}>Full timeline</button></div>
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
                {p.timeline.slice(0, 4).map((t) => <li key={t.id} style={{ display: "flex", gap: 12, padding: "9px 0", alignItems: "flex-start" }}><i className={"ph " + t.icon} style={{ fontSize: 17, color: T.teal, paddingTop: 2 }} /><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500 }}>{t.title}</span><span style={{ display: "block", fontSize: 13, color: T.faint }}>{t.date} · {t.time} · {t.source}</span></span></li>)}
              </ul>
            </div>
          </div>
          <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={card}>
              <h2 style={{ ...h2, margin: "0 0 10px" }}>Identity</h2>
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 14 }}>
                <dt style={{ color: T.faint }}>Email</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{p.email}</dd>
                <dt style={{ color: T.faint }}>Phone</dt><dd style={{ margin: 0 }}>{p.phone}</dd>
                <dt style={{ color: T.faint }}>Home clinic</dt><dd style={{ margin: 0 }}>{p.home}</dd>
                <dt style={{ color: T.faint }}>Patient ID</dt><dd style={{ margin: 0 }}>{p.id}</dd>
                {p.visitorIds.length > 0 && <><dt style={{ color: T.faint }}>Visitor ID</dt><dd style={{ margin: 0 }}>{p.visitorIds.map((v, i) => <React.Fragment key={v}>{i > 0 && ", "}<button onClick={() => a.go({ s: "visitor", id: v })} className="h-line" style={{ border: "none", background: "none", padding: 0, color: T.tealDk, fontSize: 14, cursor: "pointer" }}>{v}</button></React.Fragment>)}</dd></>}
              </dl>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={h2}>Care team</h2>{a.canEdit && <button onClick={actions.addCare} className="h-sand" style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${T.line3}`, background: T.card, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", gap: 5, alignItems: "center", whiteSpace: "nowrap", color: T.ink }}><i className="ph ph-plus" />Add</button>}</div>
              {p.care.length === 0 && <p style={{ margin: "10px 0 0", color: T.ink2, fontSize: 14 }}>No care team yet.</p>}
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
                {p.care.map((c) => (
                  <li key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "9px 0", borderTop: `1px solid ${T.line}` }}>
                    <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: T.stone, color: T.ink2, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}><i className="ph ph-stethoscope" /></span>
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500 }}>{c.name}</span><span style={{ display: "block", fontSize: 13, color: T.faint }}>{c.role} · {c.specialty} · {c.location}</span></span>
                    {a.canEdit && <button onClick={() => a.confirm({ title: `Remove ${c.name} from the care team?`, body: `${c.name} will no longer see ${p.name} in their patient list. Past notes are kept.`, label: "Remove", danger: true, run: () => a.act({ action: "care.remove", careId: c.id }, { success: "Care team updated", sub: c.name + " removed" }) })} aria-label="Remove from care team" className="h-x" style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "transparent", color: T.faint, cursor: "pointer" }}><i className="ph ph-x" /></button>}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
              <LinkRow icon="ph-pill" title={`Protocol · ${active.length} active`} sub={protRate} onClick={() => setTab("protocol")} />
              <LinkRow icon="ph-devices" title="Devices" sub={devSummary} onClick={() => setTab("devices")} />
              {p.refs[0] && <LinkRow icon="ph-arrow-square-in" title={`Referral ${p.refs[0].code} · ${p.refs[0].status}`} sub={`${p.refs[0].specialty} · ${p.refs[0].urgency}`} onClick={() => a.openRef(p.refs[0].id)} />}
            </div>
            {p.goals.length > 0 && (
              <div style={card}><h2 style={{ ...h2, margin: "0 0 8px" }}>Health goals</h2><ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 14.5, color: T.ink }}>{p.goals.map((g) => <li key={g}>{g}</li>)}</ul><p style={{ margin: "10px 0 0", fontSize: 12.5, color: T.faint }}>Set by the patient in My Health Space</p></div>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div style={{ ...S.card, padding: "8px 22px", animation: "anraFade 220ms" }}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {p.timeline.map((t) => {
              const c = tone(t.tone), isOpen = !!open[t.id];
              const src = chip(t.source, t.source === "Neyu" ? "ai" : t.tone === "urgent" ? "urgent" : "neutral");
              return (
                <li key={t.id} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ width: 96, flex: "none", fontSize: 13, color: T.faint, paddingTop: 8 }}><span style={{ display: "block", color: T.ink, fontWeight: 500 }}>{t.date}</span>{t.time}</div>
                  <span style={{ width: 36, height: 36, flex: "none", borderRadius: 11, background: c.bg, color: c.fg, display: "grid", placeItems: "center", fontSize: 17 }}><i className={"ph " + t.icon} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))} aria-expanded={isOpen} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "none", padding: "6px 0", textAlign: "left", cursor: "pointer", color: T.ink, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{t.title}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 999, background: src.bg, color: src.fg, fontSize: 12, fontWeight: 500 }}>{t.source}</span>
                      {t.pre && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 999, border: "1px dashed rgba(29,35,39,.25)", color: T.ink2, fontSize: 12, fontWeight: 500 }}><i className="ph ph-user-circle-dashed" />Before sign-up</span>}
                      <span style={{ flex: 1 }} /><i className={isOpen ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ color: T.faint }} />
                    </button>
                    {isOpen && <p style={{ margin: "2px 0 4px", fontSize: 14, color: T.ink2, animation: "anraFade 200ms" }}>{t.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {tab === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "anraFade 220ms" }}>
          {p.healthHidden ? <Hidden name={p.name} what="wearable sharing in My Health Space" extra="Staff can't view this data until the patient shares it again." /> : (
            <>
              {p.devices.map((d) => (
                <div key={d.id} style={card}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: T.wash, color: T.teal, display: "grid", placeItems: "center", fontSize: 20 }}><i className="ph ph-watch" /></span>
                    <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 16, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 13.5, color: T.faint }}>Last sync {d.lastSync} · {d.data}</div></div>
                    <Chip c={devChip(d.status)} />
                  </div>
                </div>
              ))}
              {p.devices.length === 0 && <div style={{ padding: 28, borderRadius: 20, background: T.card, border: `1px solid ${T.line}`, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>No connected devices</div><div style={{ color: T.ink2, fontSize: 14 }}>This patient hasn't connected a wearable in My Health Space.</div></div>}
              {!revealed.health ? (
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: 22, borderRadius: 20, background: T.side, border: "1px dashed rgba(29,35,39,.16)" }}>
                  <i className="ph ph-eye-slash" style={{ fontSize: 24, color: T.ink2 }} />
                  <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontSize: 15.5, fontWeight: 500 }}>Wearable data · {devSummary}</div><div style={{ fontSize: 14, color: T.ink2 }}>Resting HR, HRV, SpO₂, sleep, activity, ECG and clinic readings are masked. Revealing asks for a reason and is logged.</div></div>
                  {a.canEdit && <button onClick={() => reveal("health", "Wearable data")} className="h-primary" style={{ ...btnPrim, height: 40, padding: "0 16px", gap: 8 }}><i className="ph ph-eye" />Reveal health data</button>}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "anraFade 260ms" }}>
                  <RevealedBar onHide={() => hide("health")} />
                  {revealed.health.metrics.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
                      {revealed.health.metrics.map((m) => <div key={m.label} style={{ ...S.card, borderRadius: 18, padding: "16px 18px" }}><div style={{ fontSize: 13, color: T.faint }}>{m.label}</div><div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 2 }}>{m.value} <span style={{ fontSize: 14, color: T.ink2, fontWeight: 400 }}>{m.unit}</span></div><div style={{ fontSize: 12.5, color: T.ink2 }}>{m.note}</div></div>)}
                    </div>
                  ) : <p style={{ margin: 0, color: T.ink2, fontSize: 14 }}>No wearable readings received yet.</p>}
                  <div style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={h2}>Clinic readings</h2>{a.canEdit && <button onClick={actions.addReading} className="h-sand" style={{ ...S.btnS, fontWeight: 500, padding: "0 12px", display: "inline-flex", gap: 6, alignItems: "center" }}><i className="ph ph-plus" />Add reading</button>}</div>
                    {revealed.health.readings.length === 0 ? <p style={{ margin: "12px 0 0", color: T.ink2, fontSize: 14 }}>No clinic readings recorded yet.</p> : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8, minWidth: 560 }}>
                          <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}><th style={{ padding: "10px 8px 10px 0", fontWeight: 500 }}>Reading</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Value</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Date and time</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Source</th><th style={{ padding: "10px 0 10px 8px", fontWeight: 500 }}>Entered by</th></tr></thead>
                          <tbody>{revealed.health.readings.map((r) => <tr key={r.id}><td style={{ padding: "10px 8px 10px 0", borderTop: `1px solid ${T.line}`, fontWeight: 500 }}>{r.type}</td><td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}` }}>{r.value} {r.unit}</td><td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{r.when}</td><td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{r.source}</td><td style={{ padding: "10px 0 10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{r.by}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "labs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "anraFade 220ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2 style={sectionH}>Labs</h2>{a.canEdit && <button onClick={actions.addLab} className="h-primary" style={btnPrim}><i className="ph ph-plus" />Add lab result</button>}</div>
          {p.labsHidden ? <Hidden name={p.name} what="lab sharing" extra="Results staff add are stored, but can't be viewed here until the patient shares labs again." />
            : !revealed.labs ? (
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: 22, borderRadius: 20, background: T.side, border: "1px dashed rgba(29,35,39,.16)" }}>
                <i className="ph ph-eye-slash" style={{ fontSize: 24, color: T.ink2 }} />
                <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontSize: 15.5, fontWeight: 500 }}>Lab results · {p.labsN}</div><div style={{ fontSize: 14, color: T.ink2 }}>Test names, values and explanations are masked. Revealing asks for a reason and is logged.</div></div>
                {a.canEdit && <button onClick={() => reveal("labs", "Lab results")} className="h-page" style={{ ...S.btn2, padding: "0 16px" }}><i className="ph ph-eye" />Reveal lab results</button>}
              </div>
            ) : (
              <>
                <RevealedBar onHide={() => hide("labs")} />
                {revealed.labs.length === 0 ? <EmptyCard title="No lab results" sub="Results from BioAro Labs appear here once added." /> : (
                  <div style={{ ...S.card, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 900 }}>
                      <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}><th style={{ ...S.th, padding: "12px 8px 12px 20px" }}>Test</th><th style={S.th}>Value</th><th style={S.th}>Reference range</th><th style={S.th}>Status</th><th style={S.th}>Collected</th><th style={S.th}>Panel</th><th style={{ ...S.th, padding: "12px 20px 12px 8px" }}>Source</th></tr></thead>
                      <tbody>
                        {revealed.labs.map((l) => (
                          <tr key={l.id}>
                            <td style={{ ...S.td, padding: "12px 8px 12px 20px" }}><span style={{ display: "block", fontWeight: 500 }}>{l.test}</span>{l.explanation && <span style={{ display: "block", fontSize: 12.5, color: T.faint }}>{l.explanation}</span>}</td>
                            <td style={{ ...S.td, fontVariantNumeric: "tabular-nums" }}>{l.value} <span style={{ color: T.faint }}>{l.unit}</span></td>
                            <td style={{ ...S.td, color: T.ink2 }}>{l.range}</td>
                            <td style={S.td}><Chip c={l.status === "Pending" ? chip("Pending", "neutral", "ph-hourglass") : l.flag ? chip(`Flagged · ${l.flag} range`, "urgent", "ph-flag") : chip("Final", "teal", "ph-check")} /></td>
                            <td style={{ ...S.td, color: T.ink2, whiteSpace: "nowrap" }}>{l.date}</td>
                            <td style={{ ...S.td, color: T.ink2 }}>{l.panel}</td>
                            <td style={{ ...S.td, padding: "12px 20px 12px 8px", color: T.ink2 }}>{l.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
        </div>
      )}

      {tab === "protocol" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "anraFade 220ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2 style={sectionH}>Protocol</h2>{a.canEdit && <button onClick={actions.addProt} className="h-primary" style={btnPrim}><i className="ph ph-plus" />Add protocol item</button>}</div>
          {(["Morning", "Midday", "Evening"] as const).map((slot) => {
            const items = p.protocol.filter((x) => x.timing === slot);
            return (
              <div key={slot}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 500, color: T.ink2, marginBottom: 8 }}><i className={"ph " + { Morning: "ph-sun-horizon", Midday: "ph-sun", Evening: "ph-moon" }[slot]} style={{ fontSize: 17 }} />{slot}</div>
                {items.length === 0 && <div style={{ padding: "14px 18px", borderRadius: 16, border: `1px dashed ${T.line3}`, color: T.faint, fontSize: 14 }}>Nothing scheduled for the {slot.toLowerCase()}.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((x) => (
                    <div key={x.id} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "16px 18px", borderRadius: 18, background: T.card, border: `1px solid ${T.line}` }}>
                      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 15.5, fontWeight: 500 }}>{x.name}</span><span style={{ color: T.ink2 }}>{x.dose}</span><Chip h={22} c={x.status === "Paused" ? chip("Paused", "neutral", "ph-pause") : chip("Active", "teal", "ph-play")} /></div>
                        <div style={{ fontSize: 13.5, color: T.ink2, marginTop: 2 }}>{[x.guidance, "Source: " + x.source, "Since " + x.start].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div style={{ width: 180 }}>
                        <div style={{ height: 6, borderRadius: 999, background: T.stone, overflow: "hidden" }}><div style={{ height: "100%", width: x.rate + "%", background: T.tealLt, borderRadius: 999 }} /></div>
                        <div style={{ fontSize: 12.5, color: T.faint, marginTop: 4 }}>{x.hasRate ? `${x.rate}% completion · last 30 days` : "New · no completion data yet"}</div>
                      </div>
                      {a.canEdit && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => a.openForm("protocol", p.id, { name: x.name, timing: x.timing, dose: x.dose, guidance: x.guidance.replace(/ · Until .*$/, ""), source: x.source, start: x.startIso }, x.id)} className="h-sand" style={S.btnS}>Edit</button>
                          <button onClick={() => a.act({ action: "protocol.pause", itemId: x.id }, { success: `${x.name} ${x.status === "Paused" ? "resumed" : "paused"}`, sub: "Patient timeline updated.", undoable: true })} className="h-sand" style={S.btnS}>{x.status === "Paused" ? "Resume" : "Pause"}</button>
                          <button onClick={() => a.confirm({ title: `End ${x.name}?`, body: `The item is removed from ${p.name}’s active protocol in My Health Space. Its history stays in the record.`, label: "End protocol item", danger: true, run: () => a.act({ action: "protocol.end", itemId: x.id }, { success: "Protocol item ended", sub: x.name }) })} className="h-danger" style={S.btnD}>End</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "appointments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "anraFade 220ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2 style={sectionH}>Appointments</h2>{a.canEdit && <button onClick={actions.addAppt} className="h-primary" style={btnPrim}><i className="ph ph-calendar-plus" />Book appointment</button>}</div>
          {p.upcoming.filter((x) => x.rescheduleRequested).map((x) => (
            <div key={"rq" + x.id} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "16px 18px", borderRadius: 18, background: T.card, border: `1px solid ${T.tealLt}` }}>
              <i className="ph ph-calendar-x" style={{ fontSize: 20, color: T.teal }} />
              <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 15, fontWeight: 500 }}>Reschedule request · {x.date}</div><div style={{ fontSize: 13.5, color: T.ink2 }}>The patient asked to move their {x.time} visit with {x.clinician}.</div></div>
              {a.canEdit && <>
                <button onClick={() => a.openForm("appt", p.id, { patient: p.name, clinician: x.clinician, location: x.location, type: x.type }, x.id)} className="h-primary" style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: T.teal, color: T.card, fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>Pick new time</button>
                <button onClick={() => a.act({ action: "queue.complete", id: "res:" + x.id }, { success: "Reschedule request resolved", sub: "Front desk will confirm the new time with the patient.", undoable: true })} className="h-sand" style={{ height: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.line3}`, background: T.card, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap", color: T.ink }}>Mark resolved</button>
              </>}
            </div>
          ))}
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.ink2, marginBottom: 8 }}>Upcoming</div>
            {p.upcoming.length === 0 && <div style={{ padding: 18, borderRadius: 16, border: `1px dashed ${T.line3}`, color: T.ink2, fontSize: 14 }}>No upcoming appointments.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.upcoming.map((x) => (
                <div key={x.id} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "16px 18px", borderRadius: 18, background: T.card, border: `1px solid ${T.line}` }}>
                  <div style={{ flex: "1 1 260px" }}><div style={{ fontSize: 16, fontWeight: 500 }}>{x.date} · {x.time}</div><div style={{ fontSize: 14, color: T.ink2 }}>{x.clinician} · {x.specialty} · {x.type} · {x.location}</div><div style={{ fontSize: 13, color: T.faint, marginTop: 2 }}>Visit-prep sharing: {x.prep}{x.notes ? " · Staff note: " + x.notes : ""}</div></div>
                  <Chip c={apptChip(x)} />
                  {a.canEdit && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => a.openForm("appt", p.id, { patient: p.name, clinician: x.clinician, location: x.location, type: x.type }, x.id)} className="h-sand" style={S.btnS}>Reschedule</button>
                      <button onClick={() => a.act({ action: "appt.complete", apptId: x.id }, { success: "Appointment marked complete", sub: `${x.date} · ${x.clinician}` })} className="h-sand" style={S.btnS}>Complete</button>
                      <button onClick={() => a.confirm({ title: "Cancel this appointment?", body: `${x.date} at ${x.time} with ${x.clinician} (${x.location}). The patient sees the change in My Health Space.`, label: "Cancel appointment", danger: true, run: () => a.act({ action: "appt.cancel", apptId: x.id }, { success: "Appointment cancelled", sub: `${x.date} · ${x.clinician}` }) })} className="h-danger" style={S.btnD}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {p.questions.length > 0 && (
            <div style={{ ...S.card, padding: "18px 20px" }}><div style={{ fontSize: 14, fontWeight: 500, color: T.ink2, marginBottom: 8 }}>Patient questions for the next visit</div><ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5 }}>{p.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
          )}
          {p.past.length > 0 && (
            <div><div style={{ fontSize: 14, fontWeight: 500, color: T.ink2, marginBottom: 8 }}>Past</div>
              {p.past.map((x) => <div key={x.id} style={{ display: "flex", gap: 16, alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${T.line}` }}><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 500 }}>{x.date} · {x.time}</div><div style={{ fontSize: 13.5, color: T.ink2 }}>{x.clinician} · {x.type} · {x.location}</div></div><Chip c={apptChip(x)} /></div>)}
            </div>
          )}
        </div>
      )}

      {tab === "referrals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "anraFade 220ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2 style={sectionH}>Referrals</h2>{a.canEdit && <button onClick={actions.linkRef} className="h-sand" style={{ ...btnHead, fontSize: 14, padding: "0 14px" }}><i className="ph ph-link" />Link referral</button>}</div>
          {p.refs.length === 0 && <EmptyCard title="No referrals" sub="Link an incoming referral if it belongs to this patient." />}
          {p.refs.map((r) => (
            <button key={r.id} onClick={() => a.openRef(r.id)} className="h-lift" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "16px 18px", borderRadius: 18, background: T.card, border: `1px solid ${T.line}`, textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div style={{ flex: "1 1 260px" }}><div style={{ fontSize: 15.5, fontWeight: 500, color: T.ink }}>{r.code} · {r.type} · {r.specialty}</div><div style={{ fontSize: 13.5, color: T.ink2 }}>From {r.referring} · Received {r.received}</div></div>
              <Chip c={refUrg(r.urgency)} /><Chip c={refSt(r.status)} />
            </button>
          ))}
        </div>
      )}

      {tab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "anraFade 220ms" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>AI &amp; Assessments</h2>
          {!revealed.ai ? (
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: 22, borderRadius: 20, background: T.lavWash, border: "1px dashed rgba(95,74,138,.25)" }}>
              <Orb size={36} />
              <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontSize: 15.5, fontWeight: 500, color: T.lavInk }}>AI conversations and assessments · {p.aisN}</div><div style={{ fontSize: 14, color: T.lavInk }}>Neyu conversations, symptom checks, assessments and lab explainers are masked. Revealing asks for a reason and is logged.</div></div>
              {a.canEdit && <button onClick={() => reveal("ai", "AI conversations")} className="h-page" style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(95,74,138,.3)", background: T.card, color: T.lavInk, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}><i className="ph ph-eye" />Reveal AI activity</button>}
            </div>
          ) : (
            <>
              <RevealedBar onHide={() => hide("ai")} />
              {revealed.ai.length === 0 && <EmptyCard title="No AI activity" sub="This patient hasn't used Neyu or any AI tools." />}
              {revealed.ai.map((x) => { const d = decAI(x); return (
                <button key={x.key} onClick={() => a.openAI(x.key)} className="h-lift" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 18px", borderRadius: 18, background: T.card, border: `1px solid ${T.line}`, textAlign: "left", cursor: "pointer", width: "100%" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 11, background: T.lavWash, color: T.lavInk, display: "grid", placeItems: "center", fontSize: 18, flex: "none" }}><i className={d.icon} /></span>
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 500, color: T.ink }}>{x.title}</span><span style={{ fontSize: 13, color: T.faint }}>{x.id} · {x.date}, {x.time}</span>{x.pre && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 999, border: "1px dashed rgba(29,35,39,.25)", color: T.ink2, fontSize: 12, fontWeight: 500 }}>Before sign-up</span>}</div><div style={{ fontSize: 13.5, color: T.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.line}</div></div>
                  <Chip c={d.st} />
                </button>
              ); })}
            </>
          )}
        </div>
      )}

      {tab === "devices" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", animation: "anraFade 220ms" }}>
          <div style={{ flex: "1.5 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={card}>
              <h2 style={{ ...h2, margin: "0 0 8px" }}>Connected devices</h2>
              {p.devices.length === 0 && <p style={{ margin: 0, color: T.ink2, fontSize: 14 }}>No connected devices.</p>}
              {p.devices.map((d) => <div key={d.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${T.line}` }}><i className="ph ph-watch" style={{ fontSize: 19, color: T.teal }} /><div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 13, color: T.faint }}>Last sync {d.lastSync}</div></div><Chip c={devChip(d.status)} /></div>)}
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={h2}>My Health Space sessions</h2>{a.canEdit && p.sessions.length > 0 && <button onClick={actions.signOutAll} className="h-danger" style={{ ...S.btnD, fontWeight: 500, padding: "0 12px" }}>Sign out all devices</button>}</div>
              {p.sessions.length === 0 ? <p style={{ margin: "10px 0 0", color: T.ink2, fontSize: 14 }}>No active sessions — the patient is signed out everywhere.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8, minWidth: 560 }}>
                    <thead><tr style={{ textAlign: "left", color: T.ink2, fontSize: 13 }}><th style={{ padding: "10px 8px 10px 0", fontWeight: 500 }}>Device</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Browser</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>IP</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Last seen</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Status</th><th style={{ padding: "10px 0", fontWeight: 500, position: "relative" }}><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>{p.sessions.map((x) => (
                      <tr key={x.id}>
                        <td style={{ padding: "10px 8px 10px 0", borderTop: `1px solid ${T.line}`, fontWeight: 500 }}>{x.device}</td>
                        <td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{x.browser}</td>
                        <td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>{x.ip}</td>
                        <td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{x.last}</td>
                        <td style={{ padding: "10px 8px", borderTop: `1px solid ${T.line}` }}><Chip c={chip("Active", "teal", "ph-circle")} /></td>
                        <td style={{ padding: "10px 0", borderTop: `1px solid ${T.line}`, textAlign: "right" }}>{a.canEdit && <button onClick={() => a.act({ action: "session.revoke", sessionId: x.id }, { success: `Signed out of ${x.device}`, sub: "The patient must sign in again on that device." })} className="h-sand" style={{ height: 30, padding: "0 10px", borderRadius: 9, border: `1px solid ${T.line3}`, background: T.card, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: T.ink }}>Sign out</button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div style={{ flex: "1 1 300px", minWidth: 0, ...card }}>
            <h2 style={{ ...h2, margin: "0 0 4px" }}>Account</h2>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: T.faint }}>Every action here asks for confirmation and is logged.</p>
            <p data-testid="p360-phones" style={{ margin: "0 0 12px", fontSize: 14, color: T.ink2 }}><i className="ph ph-device-mobile" /> NEYU app: {p.phones.length ? p.phones.map((x) => `${x.platform} (since ${x.since})`).join(", ") + " · notifications on" : "not installed, or notifications off"}</p>
            {a.canEdit && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {p.locked && <AcctBtn icon="ph-lock-open" onClick={actions.unlock}>Unlock account</AcctBtn>}
                {!p.verified && <AcctBtn icon="ph-envelope-simple" onClick={actions.resend}>Resend verification email</AcctBtn>}
                {!p.verified && <AcctBtn icon="ph-seal-check" onClick={actions.verify}>Confirm email by hand</AcctBtn>}
                {p.phones.length > 0 && <AcctBtn icon="ph-bell-ringing" onClick={actions.pushTest}>Send test notification</AcctBtn>}
                <AcctBtn icon="ph-export" onClick={actions.exportData}>Export patient data</AcctBtn>
                <AcctBtn icon="ph-user-minus" onClick={actions.deactivate}>{p.acct === "Deactivated" ? "Reactivate account" : "Deactivate account"}</AcctBtn>
                <div style={{ height: 10 }} />
                <button onClick={actions.deleteAcct} className="h-danger" style={{ display: "flex", gap: 10, alignItems: "center", height: 42, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(139,75,55,.3)", background: T.card, color: T.peachInk, fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left" }}><i className="ph ph-trash" />Delete account…</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "anraFade 220ms" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Access and change history</h2>
          {p.audit.length === 0 ? <EmptyCard title="No audit events" sub="No one has viewed or changed protected information in this record yet." /> : (
            <div style={{ ...S.card, overflow: "hidden" }}>
              {p.audit.map((e) => { const k = auditChip(e.kind); return (
                <button key={e.id} onClick={() => a.openAudit(e.id)} className="h-row" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", width: "100%", padding: "14px 20px", border: "none", borderBottom: `1px solid ${T.line}`, background: "transparent", textAlign: "left", cursor: "pointer" }}>
                  <Chip c={k} style={{ minWidth: 84 }} />
                  <span style={{ flex: "1 1 240px", minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: T.ink }}>{e.action} · {e.resource}</span><span style={{ display: "block", fontSize: 13, color: T.faint }}>{e.who} · {e.ip}</span></span>
                  <span style={{ fontSize: 13, color: T.ink2 }}>{e.ts}</span><CaretRow />
                </button>
              ); })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function apptChip(x: ApptDTO) {
  return x.status === "Completed" ? chip("Completed", "neutral", "ph-check") : x.status === "Cancelled" ? chip("Cancelled", "neutral", "ph-x") : x.status === "Reschedule requested" ? chip("Reschedule requested", "urgent", "ph-calendar-x") : chip(x.status, "teal", "ph-calendar-check");
}
export function devChip(s: string) {
  return s === "Connected" ? chip("Connected", "teal", "ph-check-circle") : s === "Not syncing" ? chip("Not syncing", "urgent", "ph-warning") : chip(s, "neutral", s === "Disconnected" ? "ph-plug" : "ph-hourglass");
}

function MenuItem({ icon, children, onClick, danger }: { icon: string; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button role="menuitem" onClick={onClick} className={danger ? "h-danger" : "h-page"} style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", height: 40, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontSize: 14, cursor: "pointer", color: danger ? T.peachInk : T.ink }}><i className={"ph " + icon} />{children}</button>;
}
function AcctBtn({ icon, children, onClick }: { icon: string; children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="h-page" style={{ display: "flex", gap: 10, alignItems: "center", height: 42, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(29,35,39,.1)", background: T.card, fontSize: 14, cursor: "pointer", textAlign: "left", color: T.ink }}><i className={"ph " + icon} />{children}</button>;
}
function ProtRow({ icon, label, hidden, shown, onClick, ai }: { icon: string; label: string; hidden: boolean; shown: boolean; onClick: () => void; ai?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", border: "none", borderTop: `1px solid ${T.line}`, background: "transparent", textAlign: "left", cursor: "pointer", fontSize: 14.5, color: T.ink }}>
      <i className={"ph " + icon} style={{ fontSize: 18, color: ai ? T.lav : T.teal }} /><span style={{ flex: 1 }}>{label}</span>
      {hidden ? <span style={{ fontSize: 13, color: T.ink2 }}>Hidden by patient consent</span>
        : shown ? <span style={{ fontSize: 13, color: T.tealDk, display: "inline-flex", gap: 5, alignItems: "center" }}><i className="ph ph-eye" />Revealed</span>
        : <span style={{ fontSize: 13, color: T.faint, display: "inline-flex", gap: 5, alignItems: "center" }}><i className="ph ph-eye-slash" />Masked</span>}
      <CaretRow />
    </button>
  );
}
function LinkRow({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ display: "flex", gap: 12, alignItems: "center", border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer", color: T.ink }}><i className={"ph " + icon} style={{ fontSize: 18, color: T.teal }} /><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 500 }}>{title}</span><span style={{ display: "block", fontSize: 13, color: T.faint }}>{sub}</span></span><CaretRow /></button>;
}
