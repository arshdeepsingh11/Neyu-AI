"use client";

// Sign in / create account for My Health Space, in the portal's visual
// language. Errors come from the API as friendly sentences.

import { LEGAL } from "@/lib/legal";
import React, { useState } from "react";
import { api, announceSession } from "./api";
import { C } from "./ui";
import PasswordStrength from "./PasswordStrength";
import { passwordProblem } from "@/lib/portal/password";
import { NIcon } from "@/components/neyu/icons";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.muted };

function safeNext(): string {
  const n = new URLSearchParams(window.location.search).get("next") || "";
  return n.startsWith("/my-health") && !n.startsWith("//") && !n.includes("sign-") ? n : "/my-health";
}

export default function AuthForm({ mode, signupOpen = true }: { mode: "sign-in" | "sign-up"; signupOpen?: boolean }) {
  const up = mode === "sign-up";
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", dateOfBirth: "", consent: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (up) { const pwErr = passwordProblem(f.password, f.email); if (pwErr) { setErr(pwErr); return; } }
    setBusy(true);
    try {
      let r: { verify?: boolean };
      if (up) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        r = await api("/api/portal/auth/sign-up", { body: { ...f, dateOfBirth: f.dateOfBirth || undefined, timezone } });
      } else {
        r = await api("/api/portal/auth/sign-in", { body: { email: f.email, password: f.password } });
      }
      announceSession();
      // New or unverified accounts confirm their email before seeing any health data.
      window.location.assign(r?.verify ? "/my-health/verify" : safeNext());
    } catch (e: any) {
      setErr(e.message); setBusy(false);
    }
  };

  return (
    <div className="mhs mhs-page">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <a href="/" style={{ display: "flex", flexDirection: "column", gap: 2, color: C.ink, textDecoration: "none" }}>
            <span style={{ fontSize: 12, letterSpacing: ".14em", color: C.muted, fontWeight: 500 }}>NEYU HEALTH</span>
            <span style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.01em" }}>My Health Space</span>
          </a>
        </div>

        <main style={{ width: "100%", maxWidth: 440, animation: "mhs-fadeUp 380ms cubic-bezier(.2,.7,.2,1)" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>{up ? "Create your account" : "Welcome back"}</h1>
          <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.55, color: C.ink2 }}>{up ? "Bring your wearable data, results and care plan together in one private place." : "Sign in to see your health snapshot, trends and results."}</p>

          {up && !signupOpen ? (
            <div style={{ padding: "24px 22px", borderRadius: 20, background: C.card, border: `1px solid ${C.line}`, fontSize: 15, lineHeight: 1.55, color: C.ink2 }}>
              New accounts aren't open yet. If you're an NEYU patient, please contact the clinic to get access.
              <p style={{ margin: "16px 0 0" }}><a href="/my-health/sign-in">Already have an account? Sign in</a></p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate={false} style={{ padding: 22, borderRadius: 22, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 16 }}>
              {up && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={field}>First name<input className="mhs-in" value={f.firstName} onChange={set("firstName")} required maxLength={60} autoComplete="given-name" /></label>
                  <label style={field}>Last name<input className="mhs-in" value={f.lastName} onChange={set("lastName")} required maxLength={60} autoComplete="family-name" /></label>
                </div>
              )}
              <label style={field}>Email<input className="mhs-in" type="email" value={f.email} onChange={set("email")} required maxLength={254} autoComplete="email" inputMode="email" autoCapitalize="none" /></label>
              <label style={field}>
                Password
                <span style={{ position: "relative", display: "block" }}>
                  <input className="mhs-in" type={showPw ? "text" : "password"} value={f.password} onChange={set("password")} required minLength={up ? 10 : 1} maxLength={200} autoComplete={up ? "new-password" : "current-password"} style={{ paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 4, top: 4, width: 38, height: 38, border: "none", background: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><NIcon name={showPw ? "ph-eye-slash" : "ph-eye"} size={18} tone="currentColor" /></button>
                </span>
                {up && <PasswordStrength password={f.password} email={f.email} />}
              </label>
              {up && <label style={field}>Date of birth <span style={{ fontSize: 12, color: C.faint, marginTop: -4 }}>Optional</span><input className="mhs-in" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} max={new Date().toISOString().slice(0, 10)} autoComplete="bday" /></label>}
              {up && (
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: C.ink2, cursor: "pointer" }}>
                  <input type="checkbox" checked={f.consent} onChange={set("consent")} required style={{ width: 18, height: 18, marginTop: 2, accentColor: C.teal, flex: "none" }} />
                  <span>I’m {LEGAL.minAge} or older and agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Use</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>. NEYU Health may store the health information I add or connect, to show it to me and — only when I choose — to my care team. I can export or delete it at any time.</span>
                </label>
              )}
              {err && <p role="alert" style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: C.peach, color: C.peachInk, fontSize: 14, lineHeight: 1.5 }}>{err}</p>}
              <button type="submit" disabled={busy} className="h-primary" style={{ height: 48, border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, fontWeight: 500, cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1 }}>
                {busy ? (up ? "Creating your account…" : "Signing in…") : up ? "Create account" : "Sign in"}
              </button>
            </form>
          )}

          <p style={{ margin: "20px 0 0", fontSize: 15, color: C.muted, textAlign: "center" }}>
            {up ? <>Already have an account? <a href="/my-health/sign-in">Sign in</a></> : <>New to My Health Space? <a href="/my-health/sign-up">Create an account</a></>}
          </p>
          <p style={{ margin: "32px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <NIcon name="ph-lock-simple" size={16} tone="currentColor" style={{marginTop: 1}} /><span>Your health data belongs to you. It is encrypted in transit, never sold, and you control every source.</span>
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <NIcon name="ph-first-aid" size={16} tone={C.peachInk} style={{marginTop: 1}} /><span>If you think you may be having a medical emergency, call 911 or go to the nearest emergency department.</span>
          </p>
        </main>
      </div>
    </div>
  );
}
