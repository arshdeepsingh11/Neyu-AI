"use client";

// Email verification step: 6 single-digit boxes (auto-advance, paste,
// backspace), resend with countdown, and sign-out to use another email.

import { nativeBeforeSignOut } from "@/lib/native/session";
import React, { useEffect, useRef, useState } from "react";
import { api, announceSession } from "./api";
import { C } from "./ui";
import { NIcon } from "@/components/neyu/icons";

export default function VerifyEmail({ maskedEmail, needsCode, initialWait, devMode }: { maskedEmail: string; needsCode: boolean; initialWait: number; devMode: boolean }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(initialWait);
  const [done, setDone] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const sentOnce = useRef(false);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async (auto = false) => {
    setErr(null); setInfo(null);
    try {
      const r = await api<{ verified?: boolean }>("/api/portal/auth/resend", { body: {} });
      if (r.verified) { window.location.assign("/my-health"); return; }
      setWait(60);
      if (!auto) setInfo("A new code is on its way.");
      setDigits(["", "", "", "", "", ""]); refs.current[0]?.focus();
    } catch (e: any) { setErr(e.message); }
  };
  // Existing accounts arriving here without a live code get one automatically.
  useEffect(() => { if (needsCode && !sentOnce.current) { sentOnce.current = true; resend(true); } }, [needsCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (code: string) => {
    if (busy || code.length !== 6) return;
    setBusy(true); setErr(null); setInfo(null);
    try {
      await api("/api/portal/auth/verify", { body: { code } });
      setDone(true); announceSession();
      setTimeout(() => window.location.assign("/my-health"), 700);
    } catch (e: any) {
      setErr(e.message); setBusy(false);
      setDigits(["", "", "", "", "", ""]); refs.current[0]?.focus();
    }
  };

  const setAt = (i: number, v: string) => {
    const only = v.replace(/\D/g, "");
    if (only.length > 1) { // paste or autofill of the whole code
      const next = only.slice(0, 6).split("");
      const d = [...next, "", "", "", "", "", ""].slice(0, 6);
      setDigits(d);
      refs.current[Math.min(5, next.length)]?.focus();
      if (next.length === 6) submit(next.join(""));
      return;
    }
    const d = [...digits]; d[i] = only; setDigits(d);
    if (only && i < 5) refs.current[i + 1]?.focus();
    if (d.every(Boolean)) submit(d.join(""));
  };
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const signOut = async () => { await nativeBeforeSignOut(); try { await api("/api/portal/auth/sign-out", { body: {} }); } catch {} announceSession(); window.location.assign("/my-health/sign-up"); };

  return (
    <div className="mhs mhs-page">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <main style={{ width: "100%", maxWidth: 440, animation: "mhs-fadeUp 380ms cubic-bezier(.2,.7,.2,1)" }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: C.tealWash, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <NIcon name={done ? "ph-seal-check" : "ph-envelope-simple-open"} size={26} tone="currentColor" />
          </span>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.025em" }}>{done ? "Email verified" : "Check your email"}</h1>
          <p style={{ margin: "0 0 26px", fontSize: 16, lineHeight: 1.55, color: C.ink2 }}>
            {done ? "Opening My Health Space…" : <>We sent a 6-digit code to <b style={{ fontWeight: 600 }}>{maskedEmail}</b>. Enter it below to confirm this email is yours.</>}
          </p>
          {!done && (
            <div style={{ padding: 22, borderRadius: 22, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 16 }}>
              <div role="group" aria-label="Verification code" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={i === 0 ? 6 : 1}
                    aria-label={`Digit ${i + 1}`} disabled={busy}
                    onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
                    onPaste={(e) => { e.preventDefault(); setAt(0, e.clipboardData.getData("text")); }}
                    style={{ width: "100%", height: 58, textAlign: "center", fontSize: 24, fontWeight: 600, border: `1.5px solid ${err ? "rgba(139,75,55,.45)" : d ? C.teal : "rgba(29,35,39,.14)"}`, borderRadius: 14, background: "#FFFDFB", color: C.ink, outline: "none", transition: "border-color .15s" }} />
                ))}
              </div>
              {err && <p role="alert" style={{ margin: 0, padding: "10px 12px", borderRadius: 12, background: C.peach, color: C.peachInk, fontSize: 14 }}>{err}</p>}
              {info && <p role="status" style={{ margin: 0, fontSize: 14, color: C.tealDark }}>{info}</p>}
              <button onClick={() => submit(digits.join(""))} disabled={busy || digits.some((x) => !x)} className="h-primary"
                style={{ height: 48, border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 15, fontWeight: 500, cursor: "pointer", opacity: busy || digits.some((x) => !x) ? 0.6 : 1 }}>
                {busy ? "Checking…" : "Verify email"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 14 }}>
                <button onClick={() => resend()} disabled={wait > 0} style={{ padding: 0, border: "none", background: "none", color: wait > 0 ? C.faint : C.teal, cursor: wait > 0 ? "default" : "pointer", fontWeight: 500 }}>
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </button>
                <button onClick={signOut} style={{ padding: 0, border: "none", background: "none", color: C.muted, cursor: "pointer" }}>Use a different email</button>
              </div>
            </div>
          )}
          <p style={{ margin: "20px 0 0", fontSize: 13, lineHeight: 1.5, color: C.muted, display: "flex", gap: 8 }}>
            <NIcon name="ph-shield-check" size={16} tone="currentColor" style={{marginTop: 1}} /><span>The code expires in 10 minutes. Check your spam folder if it doesn't arrive. NEYU will never ask you for this code.</span>
          </p>
          {devMode && <p style={{ margin: "12px 0 0", fontSize: 12, color: C.peachInk }}>Development: email isn't set up yet, so the code is printed in the terminal running the site.</p>}
        </main>
      </div>
    </div>
  );
}
