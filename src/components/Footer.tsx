"use client";

import React from "react";
import { PAGE_HREF, CLINIC_PHONE, CLINIC_EMAIL, type NavLink } from "@/data/homeContent";
import { useAnraNav } from "@/lib/useAnraNav";
import NeyuLogo from "@/components/brand/NeyuLogo";
import { NIcon } from "@/components/neyu/icons";

const head: React.CSSProperties = { fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#5A626A" };
const col: React.CSSProperties = { marginTop: 12, display: "grid", gap: 8, justifyItems: "start" };
const linkBtn: React.CSSProperties = { border: 0, background: "none", padding: "2px 0", fontSize: 16, color: "#14181B" };

// Universal footer (design "Footer" screen).
export default function Footer() {
  const go = useAnraNav();
  const L = (label: string, l: NavLink) => <button key={label} onClick={() => go(l)} className="hv-footLink" style={linkBtn}>{label}</button>;

  return (
    <footer className="anra-chrome" style={{ borderTop: "1px solid #E3DED5", background: "#EFECE6" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(48px,7vw,88px) clamp(20px,4vw,40px) 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 32 }}>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <NeyuLogo height={38} />
            <p style={{ margin: "10px 0 0", color: "#3A4147", maxWidth: 320 }}>Your Health, Connected. Listen · Connect · Flourish.<br />Calgary, Alberta.</p>
            <p style={{ margin: "16px 0 0", fontSize: 15, color: "#3A4147" }}><a href={`tel:${CLINIC_PHONE}`}>{CLINIC_PHONE}</a> · <a href={`mailto:${CLINIC_EMAIL}`}>{CLINIC_EMAIL}</a></p>
          </div>
          <div>
            <div style={head}>Explore</div>
            <div style={col}>
              {L("Care", { label: "Care", href: PAGE_HREF.care })}
              {L("Diagnostics", { label: "Diagnostics", href: PAGE_HREF.diagnostics })}
              {L("Prevention", { label: "Prevention", href: PAGE_HREF.prevention })}
              {L("Longevity", { label: "Longevity", href: PAGE_HREF.longevity })}
              {L("Meet Neyu", { label: "Meet Neyu", href: PAGE_HREF.neyu })}
              {L("All services", { label: "All services", href: PAGE_HREF.explore })}
              {L("About", { label: "About", href: "/about" })}
            </div>
          </div>
          <div>
            <div style={head}>Patients</div>
            <div style={col}>
              {L("Virtual Care", { label: "Virtual Care", href: PAGE_HREF.virtual })}
              {L("Hypertension Clinic", { label: "Hypertension Clinic", href: PAGE_HREF.htn })}
              {L("Packages", { label: "Packages", href: PAGE_HREF.packages })}
              {L("Membership", { label: "Membership", href: PAGE_HREF.membership })}
              {L("Referral Centre", { label: "Referral Centre", href: PAGE_HREF.referral })}
              {L("Patient Resources", { label: "Patient Resources", href: PAGE_HREF.resources })}
              {L("Find a physician", { label: "Find a physician", href: PAGE_HREF.matcher })}
              {L("Contact", { label: "Contact", href: PAGE_HREF.contact })}
            </div>
          </div>
          <div>
            <div style={head}>Locations</div>
            <p style={{ margin: "12px 0 0", fontSize: 15, color: "#3A4147" }}>North East<br />201 – 3151 27 St NE</p>
            <p style={{ margin: "10px 0 0", fontSize: 15, color: "#3A4147" }}>Meadow Miles<br />250 – 8500 Blackfoot Trail SE</p>
          </div>
        </div>
        <div style={{ marginTop: 40, padding: "16px 18px", borderRadius: 12, background: "#FDFCFA", display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
          <NIcon name="ph-first-aid" size={20} tone={"#9B2317"} />
          <span><strong style={{ fontWeight: 600 }}>Emergency information.</strong> NEYU isn’t an emergency service. If you think you’re having a medical emergency, call <a href="tel:911" style={{ color: "#9B2317", fontWeight: 600 }}>911</a>. For nurse advice in Alberta, call Health Link <a href="tel:811">811</a>.</span>
        </div>
        <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: "8px 20px", fontSize: 13, color: "#5A626A" }}>
          <span>© {new Date().getFullYear()} NEYU Health</span>
          <a href="/privacy" style={{ color: "#5A626A" }}>Privacy</a>
          <a href="/terms" style={{ color: "#5A626A" }}>Terms</a>
          <a href="/ai-notice" style={{ color: "#5A626A" }}>Neyu AI notice</a>
          <a href="/cookies" style={{ color: "#5A626A" }}>Cookies</a>
          <a href="/accessibility" style={{ color: "#5A626A" }}>Accessibility</a>
          <span>Testing fulfilled by BioAro Labs and BioAro Drugs.</span>
        </div>
      </div>
    </footer>
  );
}
