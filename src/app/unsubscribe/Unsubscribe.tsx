"use client";

import React, { useEffect, useState } from "react";

const C = { page: "#F6F4F1", card: "#FFFDFB", ink: "#1D2327", ink2: "#454C52", muted: "#737A80", teal: "#3F6F7C", wash: "#E8F2F4", peach: "#F7E6DF", peachInk: "#8B4B37", line: "rgba(29,35,39,.08)" };
type Info = { email: string; reminders: boolean; news: boolean; unsubscribed: boolean };

export default function Unsubscribe({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string>("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) { setErr("This link isn't complete. Open it again from the email."); return; }
    fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`).then(async (r) => { const j = await r.json(); if (r.ok) setInfo(j); else setErr(j.error); }).catch(() => setErr("Couldn't reach NEYU. Try again."));
  }, [token]);
  const go = async (scope: "all" | "news" | "reminders") => {
    setBusy(true);
    try {
      const r = await fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDone(scope === "all" ? "You won't get reminder or news emails any more." : scope === "news" ? "You won't get news emails any more." : "You won't get reminder emails any more.");
    } catch (e: any) { setErr(e.message || "Something went wrong."); } finally { setBusy(false); }
  };
  const btn = (primary: boolean): React.CSSProperties => ({ height: 46, borderRadius: 12, border: primary ? "none" : `1px solid ${C.line}`, background: primary ? C.teal : C.card, color: primary ? C.card : C.ink, fontSize: 15, cursor: "pointer", padding: "0 16px" });
  return (
    <main style={{ minHeight: "100vh", background: C.page, display: "grid", placeItems: "center", padding: "32px 16px", fontFamily: "inherit" }}>
      <section style={{ width: "100%", maxWidth: 440, background: C.card, borderRadius: 22, border: `1px solid ${C.line}`, padding: 28, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 40px rgba(29,35,39,.08)" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 600 }}>NEYU HEALTH</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-.02em" }}>Email preferences</h1>
        {err && <p role="alert" style={{ margin: 0, padding: "10px 12px", borderRadius: 12, background: C.peach, color: C.peachInk, fontSize: 14.5 }}>{err}</p>}
        {done && <p role="status" style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: C.wash, color: C.teal, fontSize: 15 }}>✓ {done} Sign-in codes and account notices still arrive — they keep your account safe.</p>}
        {info && !done && (
          <>
            <p style={{ margin: 0, color: C.ink2, fontSize: 15, lineHeight: 1.55 }}>Choose which emails <b>{info.email}</b> gets from NEYU Health.</p>
            <button disabled={busy} onClick={() => go("all")} style={btn(true)}>Unsubscribe from all reminders and news</button>
            {info.news && <button disabled={busy} onClick={() => go("news")} style={btn(false)}>Only stop news</button>}
            {info.reminders && <button disabled={busy} onClick={() => go("reminders")} style={btn(false)}>Only stop reminders</button>}
          </>
        )}
        <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>You can turn emails back on any time in My Health Space → Notifications. <a href="/my-health" style={{ color: C.teal }}>Open My Health Space</a></p>
      </section>
    </main>
  );
}
