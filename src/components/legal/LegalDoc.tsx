// Shared layout for the legal pages: title, version, contents list with anchors,
// plain-language sections and links to the other policies. Server component (no JS).
import React from "react";
import { LEGAL, effectiveLabel, mailing } from "@/lib/legal";

export type LegalSection = { id: string; h: string; body: React.ReactNode };

const LINKS = [
  ["/privacy", "Privacy Policy"], ["/terms", "Terms of Use"], ["/ai-notice", "Neyu AI notice"],
  ["/cookies", "Cookies"], ["/accessibility", "Accessibility"],
] as const;

export function LegalDoc({ path, eyebrow, title, intro, version, sections }: { path: string; eyebrow: string; title: string; intro: React.ReactNode; version?: string; sections: LegalSection[] }) {
  return (
    <div style={{ background: "#F7F6F2", color: "#1D2327", minHeight: "100vh" }}>
      <article className="legal-doc" style={{ maxWidth: 820, margin: "0 auto", padding: "calc(56px + env(safe-area-inset-top)) 20px 96px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, letterSpacing: ".04em", textTransform: "uppercase", color: "#4D565C" }}>{eyebrow}</p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(32px, 5vw, 44px)", lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>{title}</h1>
        <p style={{ margin: "0 0 24px", fontSize: 14.5, color: "#4D565C" }}>Effective {effectiveLabel()}{version ? ` · Version ${version}` : ""}</p>
        <div className="legal-intro" style={{ fontSize: 17, lineHeight: 1.65, color: "#2B3338" }}>{intro}</div>

        <nav aria-label="On this page" style={{ margin: "28px 0 8px", padding: "18px 20px", borderRadius: 16, background: "#FFFFFF", border: "1px solid rgba(29,35,39,.08)" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>On this page</h2>
          <ol style={{ margin: 0, paddingLeft: 22, columns: "2 240px", columnGap: 28, fontSize: 15, lineHeight: 1.9 }}>
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`} style={{ color: "#1B5E73" }}>{s.h}</a></li>)}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} style={{ scrollMarginTop: 90 }}>
            <h2 id={`${s.id}-h`} style={{ margin: "40px 0 12px", fontSize: 22, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-.01em" }}>{i + 1}. {s.h}</h2>
            <div className="legal-body">{s.body}</div>
          </section>
        ))}

        <footer style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid rgba(29,35,39,.12)", display: "flex", flexWrap: "wrap", gap: "8px 20px", fontSize: 15 }}>
          {LINKS.filter(([href]) => href !== path).map(([href, label]) => <a key={href} href={href} style={{ color: "#1B5E73" }}>{label}</a>)}
        </footer>
        <p style={{ margin: "18px 0 0", fontSize: 14, color: "#4D565C" }}>{LEGAL.brand} is not an emergency service. In an emergency call <a href="tel:911" style={{ color: "#9B2317", fontWeight: 600 }}>911</a>. For nurse advice in Alberta call Health Link <a href="tel:811" style={{ color: "#1B5E73", textDecoration: "underline" }}>811</a>.</p>
      </article>
      <style>{`.legal-body{font-size:16.5px;line-height:1.7;color:#2B3338}.legal-body p{margin:0 0 14px}.legal-body ul{margin:0 0 14px;padding-left:22px}.legal-body li{margin:0 0 6px}.legal-body h3{margin:22px 0 8px;font-size:17px;font-weight:600;color:#1D2327}.legal-body a,.legal-intro a{color:#1B5E73;text-decoration:underline;text-underline-offset:2px}.legal-body table{width:100%;border-collapse:collapse;margin:6px 0 16px;font-size:15px;background:#fff;border-radius:12px;overflow:hidden}.legal-body th,.legal-body td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid rgba(29,35,39,.08)}.legal-body th{background:#EEF3F5;font-weight:600}.legal-body .scroll{overflow-x:auto}`}</style>
    </div>
  );
}

/** How to reach us about privacy (uses the confirmed facts, else the safe fallback). */
export function ContactBlock() {
  const { privacyEmail, phone } = LEGAL;
  return (
    <ul>
      {privacyEmail && <li>Email: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a></li>}
      <li>Phone: <a href={`tel:${phone}`}>{phone.replace(/^\+1-/, "")}</a> (ask for the {LEGAL.privacyOfficerTitle})</li>
      <li>Mail: Attention: {LEGAL.privacyOfficerTitle}, {mailing()}</li>
      <li>In My Health Space: Account → Privacy &amp; Data</li>
    </ul>
  );
}
