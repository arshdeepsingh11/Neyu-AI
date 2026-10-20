"use client";
// "We updated our Terms / Privacy Policy" — shown in My Health Space until the patient agrees
// to the new versions. Their agreement is recorded with the version and date (Privacy & Data).
import React, { useEffect, useState } from "react";
import { api } from "./api";
import { C } from "./ui";
import { NIcon } from "@/components/neyu/icons";

type Review = { needed: boolean; policies: { kind: "terms" | "privacy"; version: string; url: string | null; summary: string }[] };
const NAME = { terms: "Terms of Use", privacy: "Privacy Policy" };

export default function PolicyUpdate() {
  const [r, setR] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Review>("/api/portal/privacy/review").then(setR).catch(() => {}); }, []);
  if (!r?.needed) return null;
  const agree = async () => {
    setBusy(true);
    try { setR(await api<Review>("/api/portal/privacy/review", { body: {} })); } catch { /* shown again next time */ } finally { setBusy(false); }
  };
  return (
    <section role="region" aria-label="Policy update" data-testid="policy-update" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "0 0 18px", padding: "14px 16px", borderRadius: 16, background: C.card, border: `1px solid ${C.line12}` }}>
      <NIcon name="ph-file-text" size={22} tone={C.teal} />
      <span style={{ flex: 1, minWidth: 220, fontSize: 14.5, lineHeight: 1.5, color: C.ink2 }}>
        We updated our {r.policies.map((p, i) => <React.Fragment key={p.kind}>{i ? " and " : ""}<a href={p.url || `/${p.kind}`} target="_blank" rel="noopener" style={{ color: C.teal, textDecoration: "underline" }}>{NAME[p.kind]}</a></React.Fragment>)}. Please read the changes and confirm you agree.
      </span>
      <button onClick={agree} disabled={busy} style={{ height: 40, padding: "0 16px", border: "none", borderRadius: 12, background: C.teal, color: C.card, fontSize: 14.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "I agree"}</button>
    </section>
  );
}
