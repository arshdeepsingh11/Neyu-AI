"use client";
// Switch for anonymous visit statistics (cookie neyu_stats=off). Used on /cookies.
import React, { useEffect, useState } from "react";
import { statsAllowed, setStatsAllowed } from "@/lib/statsConsent";

export default function StatsChoice() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(statsAllowed()), []);
  if (on === null) return null;
  return (
    <div role="group" aria-label="Anonymous visit statistics" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "#fff", border: "1px solid rgba(29,35,39,.1)", margin: "6px 0 16px" }}>
      <span style={{ flex: 1, minWidth: 220 }}><b>Anonymous visit statistics</b><br /><span style={{ fontSize: 15, color: "#4D565C" }}>{on ? "On — page views, searches and clicks are counted without your name." : "Off — this browser’s visits, searches and clicks are not recorded."}</span></span>
      <button type="button" role="switch" aria-checked={on} onClick={() => { setStatsAllowed(!on); setOn(!on); }}
        style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "1px solid rgba(29,35,39,.2)", background: on ? "#1D2327" : "#fff", color: on ? "#fff" : "#1D2327", fontSize: 15, cursor: "pointer" }}>
        {on ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
