"use client";

import React from "react";
import type { SettingsDTO } from "@/lib/admin/types";
import { useAdmin, useView, downloadFile, hasPerm } from "../context";
import Staff from "./Staff";
import { PrivacyRequests, SystemStatus } from "./PrivacyRequests";
import { T, S, chip, Chip, Failed, BlockSkeleton } from "../ui";
import { brand } from "@/data/content";

const TABS: [string, string, string?][] = [["clinic", "Clinic"], ["email", "Email"], ["signup", "Sign-up"], ["retention", "Data retention"], ["export", "Export", "exports.create"], ["roles", "Staff", "staff.invite"], ["privacy", "Privacy requests", "privacy.deletion.manage|privacy.export.manage"], ["system", "System", "platform.settings.manage"]];

export default function Settings({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const a = useAdmin();
  const { data, error, loading, reload } = useView<SettingsDTO>("settings");
  const card = { ...S.card, padding: "22px 24px" };
  return (
    <section data-screen-label="18 Settings" style={{ display: "flex", flexDirection: "column", gap: 20, animation: "anraFade 260ms ease-out" }}>
      <h1 style={S.h1}>Settings</h1>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div role="tablist" aria-orientation="vertical" style={{ flex: "0 0 210px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.filter(([, , need]) => !need || hasPerm(a.perms, ...need.split("|"))).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="h-card" style={{ height: 40, padding: "0 12px", border: "none", borderRadius: 12, background: tab === k ? T.card : "transparent", color: tab === k ? T.ink : T.ink2, boxShadow: tab === k ? "0 1px 2px rgba(29,35,39,.06)" : "none", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <span style={{ flex: 1 }}>{l}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: "1 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && <BlockSkeleton h={220} />}
          {error && !data && <Failed what="settings" onRetry={reload} />}
          {data && tab === "clinic" && (
            <>
              <div style={card}>
                <h2 style={{ ...S.h2, margin: "0 0 12px" }}>Clinic</h2>
                <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px 16px", fontSize: 14.5 }}>
                  <dt style={{ color: T.faint }}>Name</dt><dd style={{ margin: 0 }}>{brand.name}</dd>
                  <dt style={{ color: T.faint }}>Specialties</dt><dd style={{ margin: 0 }}>Cardiology, Internal Medicine, Endocrinology and more</dd>
                  <dt style={{ color: T.faint }}>Main phone</dt><dd style={{ margin: 0 }}>{brand.phone}</dd>
                  <dt style={{ color: T.faint }}>Contact email</dt><dd style={{ margin: 0 }}>{brand.email}</dd>
                  <dt style={{ color: T.faint }}>Hours</dt><dd style={{ margin: 0 }}>{brand.hours}</dd>
                  <dt style={{ color: T.faint }}>Records</dt><dd style={{ margin: 0 }}>{data.counts.patients} patients · {data.counts.visitors} visitors · {data.counts.referrals} referrals · {data.counts.audit} audit events</dd>
                </dl>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
                {data.locations.map((l) => <div key={l.name} style={{ ...S.card, padding: "20px 22px" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><i className="ph ph-map-pin" style={{ color: T.teal }} /><h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 500 }}>{l.name}</h3></div><p style={{ margin: "6px 0 0", color: T.ink2, fontSize: 14 }}>{l.address}</p></div>)}
              </div>
            </>
          )}
          {data && tab === "email" && (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={S.h2}>Email</h2>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <i className="ph ph-plugs-connected" style={{ fontSize: 20, color: T.teal }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>Resend connection</div><div style={{ fontSize: 13.5, color: T.faint }}>{data.emailConfigured ? "SMTP settings found in the server environment" : "SMTP settings are missing — verification codes can't be sent"}</div></div>
                <Chip c={data.emailConfigured ? chip("Connected", "teal", "ph-check-circle") : chip("Not connected", "urgent", "ph-warning")} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <i className="ph ph-envelope-simple" style={{ fontSize: 20, color: T.teal }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>Sender · {data.mailFrom}</div><div style={{ fontSize: 13.5, color: T.faint }}>Used for verification codes and sync reminders{/resend\.dev$/.test(data.mailFrom) ? ". This is Resend's test sender — verify neyuhealth.com in Resend and update MAIL_FROM before launch." : ""}</div></div>
                <Chip c={/resend\.dev$/.test(data.mailFrom) ? chip("Test sender", "neutral", "ph-flask") : chip("Custom domain", "teal", "ph-seal-check")} />
              </div>
            </div>
          )}
          {data && tab === "signup" && (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={S.h2}>Sign-up</h2>
              <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 16, background: T.side }}>
                <i className={"ph " + (data.signupOpen ? "ph-lock-simple-open" : "ph-lock-simple")} style={{ fontSize: 22, color: T.ink2 }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>Public sign-up is currently {data.signupOpen ? "open" : "closed"}</div><div style={{ fontSize: 13.5, color: T.ink2 }}>{data.signupOpen ? "Anyone can create a My Health Space account. Close public sign-up until the Privacy Impact Assessment is approved." : "Public patient sign-up opens once the Privacy Impact Assessment is approved."}</div></div>
                <span role="switch" aria-checked={data.signupOpen} aria-disabled="true" aria-label="Public sign-up" style={{ width: 44, height: 26, borderRadius: 999, background: data.signupOpen ? T.teal : "#DCD7D1", position: "relative", flex: "none", opacity: 0.7 }}><span style={{ position: "absolute", left: data.signupOpen ? 21 : 3, top: 3, width: 20, height: 20, borderRadius: "50%", background: T.card }} /></span>
              </div>
              <div style={{ fontSize: 13.5, color: T.faint }}>Controlled by <code>PORTAL_SIGNUP_OPEN</code> in the server <code>.env</code> file (set it to <code>false</code> to close). A restart is needed after changing it.</div>
            </div>
          )}
          {tab === "retention" && (
            <div style={card}>
              <h2 style={{ ...S.h2, margin: "0 0 4px" }}>Data retention</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: T.faint }}>Configured by the clinic owner. Changes require the Owner role (Phase 2).</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><tbody>
                {[["Clinical records", "Retained per clinic policy after last visit"], ["Audit log", "Append-only · never deleted by staff"], ["Anonymous page views, searches and clicks", "Kept 13 months, then deleted automatically"], ["Wearable data", "Stops syncing when consent is withdrawn"], ["Deleted accounts", "Sign-in removed at once; records kept for the retention period"]].map(([k, v]) => <tr key={k}><td style={{ padding: "10px 0", borderTop: `1px solid ${T.line}` }}>{k}</td><td style={{ padding: "10px 0", borderTop: `1px solid ${T.line}`, color: T.ink2 }}>{v}</td></tr>)}
              </tbody></table>
            </div>
          )}
          {tab === "export" && (
            <div style={{ ...card, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}><h2 style={S.h2}>System export</h2><p style={{ margin: "4px 0 0", fontSize: 14, color: T.ink2 }}>Exports referrals, appointments and account metadata. Health data is excluded unless exported per patient. Every export is logged.</p></div>
              <button onClick={() => a.act({ action: "export.system" }, { success: "System export ready", sub: "Downloaded as CSV · logged to audit", after: (r) => r.file && downloadFile(r.file) })} className="h-sand" style={{ ...S.btn2, padding: "0 16px" }}><i className="ph ph-export" />Start export</button>
            </div>
          )}
          {tab === "roles" && <Staff />}
          {tab === "privacy" && <PrivacyRequests />}
          {tab === "system" && <SystemStatus system={a.system} />}
        </div>
      </div>
    </section>
  );
}
