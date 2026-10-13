"use client";

// /app-start — where the NEYU mobile app opens. First launch: "Where should
// NEYU open?" Afterwards: straight to the saved choice.
import React, { useEffect, useState } from "react";
import NeyuLogo from "@/components/brand/NeyuLogo";
import { NIcon } from "@/components/neyu/icons";
import { getAppHome, setAppHome, homePath, type AppHome } from "@/lib/appMode";

export default function AppStart() {
  const [ready, setReady] = useState(false);
  const [pick, setPick] = useState<AppHome>("myhealth");
  useEffect(() => {
    const h = getAppHome();
    if (h && !new URLSearchParams(location.search).has("choose")) { location.replace(homePath(h)); return; }
    setReady(true);
  }, []);
  const go = () => { setAppHome(pick); location.replace(homePath(pick)); };
  if (!ready) return <div style={{ minHeight: "100vh", background: "#F7F6F2" }} />;
  const opts: { k: AppHome; icon: string; t: string; d: string }[] = [
    { k: "myhealth", icon: "heartPulse", t: "My Health Space", d: "Your records, results, food, plan and Neyu — opens first every time." },
    { k: "website", icon: "home", t: "NEYU website", d: "Care, services, physicians and booking. My Health Space stays one tap away." },
  ];
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "linear-gradient(170deg,#EAF3F6 0%,#F7F6F2 55%,#FFFDFB 100%)", padding: "calc(40px + env(safe-area-inset-top)) 22px calc(28px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", flex: 1 }}>
        <NeyuLogo height={46} />
        <h1 style={{ margin: "44px 0 8px", fontSize: 30, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-.025em", color: "#1D2327" }}>Where should NEYU open?</h1>
        <p style={{ margin: "0 0 26px", fontSize: 16, lineHeight: 1.55, color: "#5B6369" }}>Choose your home screen. You can change this anytime in My Health Space → Account.</p>
        <div role="radiogroup" aria-label="App home" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {opts.map((o) => {
            const on = pick === o.k;
            return (
              <button key={o.k} role="radio" aria-checked={on} onClick={() => setPick(o.k)} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "18px 18px", borderRadius: 20, border: `1.5px solid ${on ? "#1B8FD0" : "rgba(29,35,39,.10)"}`, background: on ? "#FFFFFF" : "rgba(255,253,251,.7)", boxShadow: on ? "0 18px 40px -26px rgba(27,143,208,.6)" : "none", cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: on ? "#E6F3FA" : "#F1EEE9", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><NIcon name={o.icon} size={23} tone={on ? "#1B8FD0" : "#5B6369"} /></span>
                <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 17, fontWeight: 500, color: "#1D2327" }}>{o.t}</span><span style={{ display: "block", marginTop: 3, fontSize: 14, lineHeight: 1.5, color: "#5B6369" }}>{o.d}</span></span>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${on ? "#1B8FD0" : "#C9C4BC"}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: 2 }}>{on && <span style={{ width: 10, height: 10, borderRadius: 5, background: "#1B8FD0" }} />}</span>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minHeight: 28 }} />
        <button onClick={go} style={{ height: 54, borderRadius: 16, border: "none", background: "#14181B", color: "#fff", fontSize: 16, fontWeight: 500, cursor: "pointer" }}>Continue</button>
      </div>
    </main>
  );
}
