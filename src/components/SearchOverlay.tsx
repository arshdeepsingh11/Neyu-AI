"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/track";
import { SEARCH_INDEX, SEARCH_SUGGESTED, SPECS, DIAGS, PAGE_HREF, type NavLink } from "@/data/homeContent";
import { LAB_TESTS, WELLNESS } from "@/data/bioaroCatalog";
import { NEA_TREATMENTS } from "@/data/nea";
import { STUDIO } from "@/data/specialtyStudio";
import { physicians } from "@/data/physicians";
import { locations } from "@/data/content";
import { useRegion } from "@/components/RegionContext";
import { useAlba } from "@/components/AlbaContext";
import { useAnraNav } from "@/lib/useAnraNav";
import { NIcon } from "@/components/neyu/icons";

// Site search: pages, specialties, every care item and condition, diagnostics
// and their tests, physicians (by name, discipline or language), clinics,
// BioAro tests and products. Word-by-word matching with common synonyms
// ("echo", "bp", "sugar", "doctor"…). Neyu is always one tap away.
type Row = { label: string; kind: string; link: NavLink; words?: string };

const SYN: Record<string, string> = {
  echo: "echocardiogram echocardiography ultrasound", ecg: "electrocardiogram ekg rhythm", ekg: "ecg electrocardiogram",
  bp: "blood pressure hypertension", pressure: "hypertension", sugar: "diabetes glucose", glucose: "diabetes",
  doctor: "physician dr", doctors: "physician", dr: "physician", heart: "cardiology cardiac", cardiac: "cardiology heart",
  lung: "respiratory pulmonary breathing", lungs: "respiratory pulmonary", breathing: "respiratory pulmonary asthma",
  sleep: "apnea", kid: "pediatric child", kids: "pediatric child", child: "pediatric", children: "pediatric",
  blood: "lab bloodwork test", test: "tests lab diagnostics", tests: "lab diagnostics", dna: "genomics genetic",
  gene: "genomics genetic", genes: "genomics genetic", skin: "nea aesthetic", thyroid: "endocrinology", hormone: "endocrinology",
  diet: "nutrition food", food: "nutrition", weight: "obesity metabolic nutrition", cholesterol: "lipid ldl",
  ldl: "cholesterol lipid", holter: "monitor monitoring", referral: "refer", appointment: "book visit referral",
  book: "referral visit", address: "location clinic", where: "location clinic", phone: "contact", aging: "longevity",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function score(r: Row, q: string, tokens: string[][]) {
  const label = norm(r.label), all = label + " " + norm(r.kind) + " " + norm(r.words || "");
  const words = all.split(" ");
  // every query word (or one of its synonyms) must hit the start of some word
  let hit = 0;
  for (const alts of tokens) {
    if (!alts.some((t) => words.some((w) => w.startsWith(t)) || (t.length >= 4 && all.includes(t)))) return 0;
    hit++;
  }
  let s = hit * 10;
  if (label === q) s += 120; else if (label.startsWith(q)) s += 80; else if (label.includes(q)) s += 45;
  if (tokens.every((alts) => label.split(" ").some((w) => w.startsWith(alts[0])))) s += 30;
  if (/^(Specialty|Pillar|Service|Tool|Diagnostics|Physician)/.test(r.kind)) s += 6;
  return s;
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const go = useAnraNav();
  const { openAlba } = useAlba();
  const { region } = useRegion();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!open) setQ(""); else setTimeout(() => input.current?.focus(), 60); }, [open]);
  // Insights: what people search for (anonymous), once they stop typing.
  const logged = useRef(new Set<string>());
  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 3 || logged.current.has(term)) return;
    const t = setTimeout(() => { logged.current.add(term); track("search", term); }, 1500);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const index = useMemo<Row[]>(() => {
    const specWords = (name: string) => SPECS.find((x) => x.name === name);
    return [
      ...SEARCH_INDEX.map((i) => {
        const sp = specWords(i.label), dg = DIAGS.find((d) => d.name === i.label);
        return { ...i, words: sp ? `${sp.addresses} ${sp.tests.join(" ")}` : dg ? `${dg.desc} ${dg.tests.join(" ")}` : "" };
      }),
      ...Object.values(STUDIO).flatMap((c) => [
        ...c.care.map((x) => ({ label: x.name, kind: `${c.label} · Care`, words: x.desc, link: { label: x.name, href: `/specialties/${c.slug}?tab=care` } as NavLink })),
        ...c.conditions.map((x) => ({ label: x.split(" (")[0], kind: `${c.label} · Condition`, words: x, link: { label: x, href: `/specialties/${c.slug}` } as NavLink })),
      ]),
      ...DIAGS.flatMap((d) => d.tests.map((t) => ({ label: t, kind: `Test · ${d.name}`, words: d.desc, link: { label: t, href: d.href } as NavLink }))),
      ...physicians.map((p) => ({ label: p.name, kind: `Physician · ${p.disciplines.join(", ")}`, words: `doctor ${p.title} ${p.languages.join(" ")} ${p.location}`, link: { label: p.name, href: "/physicians#team" } as NavLink })),
      ...locations.map((l) => ({ label: l.name, kind: "Clinic · " + l.tag, words: `${l.address} ${l.phone} location address`, link: { label: l.name, href: PAGE_HREF.locations } as NavLink })),
      ...LAB_TESTS.map((t) => ({ label: t.name, kind: "BioAro test · " + t.cat, words: t.why, link: { label: t.name, href: PAGE_HREF.catalog } as NavLink })),
      ...WELLNESS.map((t) => ({ label: t.name, kind: "Wellness · " + t.cat, link: { label: t.name, href: t.url(region) } as NavLink })),
      ...NEA_TREATMENTS.map((t) => ({ label: t.name, kind: "Nea · " + t.cat, link: { label: t.name, href: "/specialties/skin-health#" + t.id } as NavLink })),
    ];
  }, [region]);

  const s = norm(q);
  const results = useMemo(() => {
    const seen = new Set<string>();
    const uniq = (r: Row) => { const k = norm(r.label); if (seen.has(k)) return false; seen.add(k); return true; };
    if (!s) return index.filter((i) => SEARCH_SUGGESTED.includes(i.label)).filter(uniq);
    const tokens = s.split(" ").filter(Boolean).map((t) => [t, ...(SYN[t] ? SYN[t].split(" ") : [])]);
    return index.map((r) => ({ r, sc: score(r, s, tokens) })).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).map((x) => x.r).filter(uniq).slice(0, 14);
  }, [index, s]);

  if (!open) return null;
  const ask = () => { onClose(); openAlba(q.trim() || undefined); };

  return (
    <div className="anra-chrome">
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,24,27,.32)" }} />
      <div role="dialog" aria-modal="true" aria-label="Search" style={{ position: "fixed", zIndex: 81, top: "calc(max(10px, min(8vh, 96px)) + env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", width: "min(680px,calc(100% - 16px))", maxHeight: "calc(100dvh - 120px - env(safe-area-inset-top))", display: "flex", flexDirection: "column", background: "#FBFAF7", borderRadius: 20, boxShadow: "0 40px 80px -30px rgba(20,24,27,.45)", overflow: "hidden", animation: "fadeUp .25s ease" }}>
        <form onSubmit={(e) => { e.preventDefault(); if (results[0] && s) { onClose(); go(results[0].link); } else ask(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 18px", borderBottom: "1px solid #E3DED5", flex: "none" }}>
          <NIcon name="ph-magnifying-glass" size={20} tone={"#5A626A"} />
          <input ref={input} type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search care, tests, doctors…" aria-label="Search" autoComplete="off" style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 18, padding: "10px 0", WebkitAppearance: "none" }} />
          <button type="button" onClick={onClose} aria-label="Close search" style={{ width: 40, height: 40, flex: "none", border: 0, background: "#EFECE6", borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer" }}><NIcon name="ph-x" size={18} tone="currentColor" /></button>
        </form>
        <div style={{ padding: "8px 10px 14px", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          {s && (
            <button onClick={ask} className="hv-sand" style={{ width: "100%", textAlign: "left", border: 0, background: "linear-gradient(120deg,rgba(47,191,148,.08),rgba(34,115,214,.08))", padding: "12px 12px", borderRadius: 12, display: "flex", gap: 10, minHeight: 48, alignItems: "center", cursor: "pointer", marginBottom: 6 }}>
              <NIcon name="spark" size={18} tone="grad" /><span style={{ fontSize: 15.5, color: "#14181B", minWidth: 0 }}>Ask Neyu: <b style={{ fontWeight: 600 }}>“{q.trim()}”</b></span>
            </button>
          )}
          <div style={{ padding: "8px 8px 6px", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#5A626A" }}>{s ? `Results · ${results.length}` : "Suggested"}</div>
          {results.map((r) => (
            <button key={r.label + r.kind} onClick={() => { onClose(); go(r.link); }} className="hv-sand" style={{ width: "100%", textAlign: "left", border: 0, background: "none", padding: "11px 10px", borderRadius: 10, display: "flex", justifyContent: "space-between", gap: 12, minHeight: 48, alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 16, color: "#14181B", minWidth: 0 }}>{r.label}</span><span style={{ fontSize: 12.5, color: "#5A626A", textAlign: "right", flex: "none", maxWidth: "45%" }}>{r.kind}</span>
            </button>
          ))}
          {s && results.length === 0 && <div style={{ padding: "24px 10px", textAlign: "center", color: "#5A626A" }}>No page matches “{q.trim()}”. Tap <b>Ask Neyu</b> above — it can answer questions about our care, tests and doctors.</div>}
        </div>
      </div>
    </div>
  );
}
