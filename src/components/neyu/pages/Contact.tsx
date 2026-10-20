"use client";

// /contact — the digital Calgary map with both clinics and Neyu's nearest-clinic
// finder, hours, phone and fax, and a message form that really reaches the team
// (saved to Admin → Service requests).
import React from "react";
import { locations, brand } from "@/data/content";
import { N, Section, PillarHero, RequestForm, NeyuReads, cardN, gradText, IconTile } from "../kit";
import { NIcon } from "../icons";
import CityMap from "../CityMap";

export default function ContactPage() {
  return (
    <>
      <PillarHero kicker="Visit · Contact" title={<>Two clinics. <span style={gradText}>One team.</span></>}
        lead={`Open ${brand.hours}. Call us, send a message, or add your postal code and Neyu shows the closer clinic and the way there.`}
        page="/contact" suggestions={["Which clinic is closer to me?", "What should I bring to my first visit?", "Is there parking at the clinic?"]}
        visual={<div style={{ display: "grid", gap: 12 }}>
          {[["phone", "Call", brand.phone, "tel:" + brand.phone.replace(/[^\d]/g, "")], ["mail", "Email", brand.email, "mailto:" + brand.email], ["clock", "Hours", brand.hours, ""]].map(([ic, l, v, href]) => (
            <a key={l} href={href || undefined} style={{ ...cardN, padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", textDecoration: "none", color: N.ink }}><IconTile icon={ic} /><span><span style={{ display: "block", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText }}>{l}</span><b style={{ fontWeight: 500, fontSize: 17 }}>{v}</b></span></a>
          ))}
          <NeyuReads text="Emergency? Call 911. For nurse advice in Alberta, call Health Link 811." />
        </div>} />
      <Section tone="white" label="Map" eyebrow="Find us" title={<>Your way <span style={gradText}>to NEYU.</span></>}>
        <CityMap height={500} />
      </Section>
      <Section label="Message" eyebrow="Send a message" title={<>We’ll get back to you.</>} lead="Messages go straight to the NEYU team. Please don't include urgent medical concerns — call 911 in an emergency.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 18, alignItems: "start" }}>
          <RequestForm service="contact" title="Your message" cta="Send message" note="We reply within one business day." done="Thanks — the NEYU team has your message and will reply within one business day." />
          <div style={{ display: "grid", gap: 12 }}>
            {locations.map((l) => (
              <div key={l.tag} style={{ ...cardN, padding: 20, display: "grid", gap: 8 }}>
                <b style={{ fontWeight: 500, fontSize: 18 }}>{l.name}</b>
                <span style={{ display: "flex", gap: 8, fontSize: 14.5, color: N.ink2 }}><NIcon name="pin" size={17} tone="grad" style={{ marginTop: 1 }} />{l.address}</span>
                <a href={"tel:" + l.phone.replace(/[^\d]/g, "")} style={{ display: "flex", gap: 8, fontSize: 14.5, color: N.ink2, textDecoration: "none" }}><NIcon name="phone" size={17} tone="grad" style={{ marginTop: 1 }} />{l.phone}</a>
                <span style={{ display: "flex", gap: 8, fontSize: 14.5, color: N.muted }}><NIcon name="doc" size={17} tone="grad" style={{ marginTop: 1 }} />Fax {l.fax}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
