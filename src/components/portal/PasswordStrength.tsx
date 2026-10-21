"use client";

// Live password strength meter + checklist (sign-up, change password).
// Uses the same rules as the server (src/lib/portal/password.ts).

import React from "react";
import { passwordChecks, passwordScore, SCORE_LABELS } from "@/lib/portal/password";
import { NIcon } from "@/components/neyu/icons";

const COLORS = ["#C8826A", "#C8826A", "#D9A441", "#6EA8B6", "#3F6F7C"];

export default function PasswordStrength({ password, email = "" }: { password: string; email?: string }) {
  const score = passwordScore(password, email);
  const c = passwordChecks(password, email);
  const items: [boolean, string, boolean][] = [
    [c.length, "At least 10 characters", true],
    [c.lettersNumber, "Letters and a number", true],
    [c.notCommon, "Not a common word or your email name", true],
    [c.mixedCase, "Upper and lower case", false],
    [c.symbol, "A symbol (e.g. ! ? #)", false],
    [c.long, "14 or more characters", false],
  ];
  return (
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} style={{ height: 5, borderRadius: 3, background: password && score >= i ? COLORS[score] : "#E7E3DD", transition: "background .25s" }} />
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 56, textAlign: "right", color: password ? COLORS[score] : "#5B6369" }}>{password ? SCORE_LABELS[score] : "Strength"}</span>
      </div>
      {password && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "4px 12px" }}>
          {items.map(([ok, label, required]) => (
            <li key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ok ? "#2F5A66" : required ? "#8B4B37" : "#737A80" }}>
              <NIcon name={ok ? "ph-check-circle" : required ? "ph-x-circle" : "ph-circle"} size={14} tone="currentColor" />
              {label}{!required && !ok ? " (optional)" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
