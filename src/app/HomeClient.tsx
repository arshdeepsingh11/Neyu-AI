"use client";

import React from "react";
import IntroExperience from "@/components/IntroExperience";
import { Hero, Connected, OneRecord, Understand } from "@/components/neyu/home1";
import { Proactive, Biology, MeetNeyu, Journey, Model, NewServices, Philosophy, FinalCta } from "@/components/neyu/home2";

// Homepage — Neyu version ("Your Health, Connected."). One proposition, not a
// catalogue: everything else sits underneath it. Order follows the CEO brief:
// Hero → Connected → One record → Understand → Proactive pillars → Biology →
// Meet Neyu → Journey, then the NEYU model, new services, philosophy and CTA.
export default function HomeClient() {
  return (
    <>
      <IntroExperience />
      <div className="anra-root neyu-page" style={{ minHeight: "100vh", overflowX: "clip", background: "#F7F6F2", color: "#0E1B2C" }}>
        <a href="#main" className="anra-skip" style={{ position: "absolute", left: -9999, top: 8, background: "#0E1B2C", color: "#fff", padding: "10px 14px", borderRadius: 8, zIndex: 200, textDecoration: "none" }}>Skip to content</a>
        <main id="main" className="neyu-main">
          <Hero />
          <Connected />
          <OneRecord />
          <Understand />
          <Proactive />
          <Biology />
          <MeetNeyu />
          <Journey />
          <Model />
          <NewServices />
          <Philosophy />
          <FinalCta />
        </main>
      </div>
    </>
  );
}
