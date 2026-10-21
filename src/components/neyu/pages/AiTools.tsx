"use client";

// The two patient AI tools in the NEYU style — Lab Result Explainer (/lab-results)
// and Explain My Diagnosis (/explain-diagnosis). Same APIs, same safety copy;
// new calm layout with a live "Neyu is reading" visual and results laid out clearly.
import React, { useRef, useState } from "react";
import AlbaOrb from "@/components/AlbaOrb";
import { useAlba } from "@/components/AlbaContext";
import { N, PillarHero, Section, NeyuReads, cardN, btn, gradText, IconTile } from "../kit";
import { NIcon } from "../icons";
import { SignalConvergence } from "../fx";

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({ base64: String(r.result).split(",")[1] || "", mimeType: file.type || "image/jpeg" }); r.onerror = reject; r.readAsDataURL(file); });
}
const area: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 18, border: `1px solid ${N.line}`, background: "#FAFBFB", fontSize: 16, lineHeight: 1.55, color: N.ink, resize: "vertical", fontFamily: "inherit", outline: "none" };
function Reading({ label }: { label: string }) {
  return <div aria-live="polite" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15, color: N.deep }}><AlbaOrb size={24} />{label}<span style={{ display: "inline-flex", gap: 4 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: N.blue, animation: `pulseSoft 1s ${i * 0.18}s infinite` }} />)}</span></div>;
}

// ── Lab Result Explainer ─────────────────────────────────────
type LabItem = { testName: string; value: string; flag: "in-range" | "outside-range" | "unclear"; explanation: string };
type LabResult = { overallSummary: string; results: LabItem[]; disclaimer: string };
const FLAG: Record<string, { label: string; color: string; bg: string }> = { "in-range": { label: "In range", color: "#1B7F63", bg: "#E4F5EF" }, "outside-range": { label: "Outside range", color: "#8A5A12", bg: "#FBF0DC" }, unclear: { label: "Unclear", color: "#4B5B6A", bg: "#EEF1F2" } };

export function LabResults() {
  const [text, setText] = useState(""), [busy, setBusy] = useState<"" | "text" | "scan">(""), [file, setFile] = useState<string | null>(null), [err, setErr] = useState<string | null>(null), [res, setRes] = useState<LabResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const call = async (body: object, mode: "text" | "scan") => {
    setBusy(mode); setErr(null);
    try { const r = await fetch("/api/lab-explainer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(); setRes(await r.json()); }
    catch { setErr(mode === "scan" ? "Couldn't read that photo. Try a clearer, well-lit shot of the report." : "Something went wrong explaining those results. Please try again."); }
    finally { setBusy(""); if (fileRef.current) fileRef.current.value = ""; }
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { setErr("That photo is a bit large — try a smaller image or better lighting."); return; } setFile(f.name); const { base64, mimeType } = await fileToBase64(f); call({ imageBase64: base64, mimeType }, "scan"); };
  const counts = res ? (["in-range", "outside-range", "unclear"] as const).map((k) => [k, res.results.filter((r) => r.flag === k).length] as const) : [];
  return (
    <>
      <PillarHero kicker="Tools · Lab Result Explainer" title={<>Your lab results, <span style={gradText}>explained.</span></>}
        lead="Paste your values or scan a photo of your report. Neyu explains what each test generally measures and how your value compares — in plain language."
        page="/lab-results" suggestions={["What does a high hs-CRP mean?", "What is a normal TSH?", "Is an LDL of 3.4 high?"]}
        visual={<div style={{ ...cardN, padding: 14 }}><SignalConvergence height={340} labels={["Cholesterol", "Glucose", "Thyroid", "Kidney", "Liver", "Blood count"]} hub="Neyu" /></div>} />
      <Section tone="white" label="Explainer">
        <div style={{ maxWidth: 860, width: "100%", margin: "0 auto", display: "grid", gap: 16 }}>
          {!res ? (
            <div style={{ ...cardN, padding: "clamp(18px,3vw,30px)", display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8, fontSize: 14, color: N.ink2 }}>Paste your lab values
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={"e.g.\nTotal Cholesterol: 5.8 mmol/L\nLDL: 3.4 mmol/L\nHDL: 1.1 mmol/L\nTSH: 2.1 mIU/L"} style={area} />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button onClick={() => text.trim().length >= 5 && call({ description: text }, "text")} disabled={text.trim().length < 5 || !!busy} style={{ ...btn("grad"), opacity: text.trim().length < 5 || busy ? 0.45 : 1 }}><NIcon name="spark" size={16} tone="light" />Explain my results</button>
                <span style={{ fontSize: 13, color: N.faint }}>or</span>
                <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={btn("ghost")}><NIcon name="camera" size={17} tone="grad" />Scan a lab report photo</button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
              </div>
              {busy && <Reading label={busy === "scan" ? `Neyu is reading ${file || "your photo"}` : "Neyu is reading your results"} />}
              {err && <p role="alert" style={{ margin: 0, color: "#A93A2C", fontSize: 14.5 }}>{err}</p>}
              <p style={{ margin: 0, fontSize: 12.5, color: N.faint }}>General information, not a diagnosis. Your photos are processed to explain them and not stored on this page.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
              <NeyuReads title="Your results, explained" text={res.overallSummary} />
              {counts.some(([, n]) => n > 0) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{counts.filter(([, n]) => n > 0).map(([k, n]) => <span key={k} style={{ padding: "6px 12px", borderRadius: 999, background: FLAG[k].bg, color: FLAG[k].color, fontSize: 13.5, fontWeight: 600 }}>{n} {FLAG[k].label.toLowerCase()}</span>)}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,360px),1fr))", gap: 12 }}>
                {res.results.map((r, i) => { const f = FLAG[r.flag] || FLAG.unclear; return (
                  <div key={i} style={{ ...cardN, padding: 18, display: "grid", gap: 8, animation: `fadeUp .35s ${Math.min(i, 8) * 0.05}s both` }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><b style={{ fontWeight: 500, fontSize: 16.5 }}>{r.testName}{r.value && <span style={{ fontWeight: 400, color: N.muted }}> · {r.value}</span>}</b><span style={{ flex: "none", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, color: f.color, background: f.bg }}>{f.label}</span></span>
                    <span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{r.explanation}</span>
                  </div>
                ); })}
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: N.faint }}>{res.disclaimer}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/referral-centre" style={btn("grad")}>Book a consultation<NIcon name="arrow" size={16} tone="light" /></a><button onClick={() => { setText(""); setRes(null); setErr(null); setFile(null); }} style={btn("ghost")}>Check another result</button></div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

// ── Explain My Diagnosis ─────────────────────────────────────
type DxResult = { plainExplanation: string; keyFindings: { term: string; explanation: string }[]; commonQuestions: string[] };
export function ExplainDiagnosis() {
  const { openAlba } = useAlba();
  const [text, setText] = useState(""), [busy, setBusy] = useState(""), [file, setFile] = useState<string | null>(null), [err, setErr] = useState<string | null>(null), [res, setRes] = useState<DxResult | null>(null);
  const attachRef = useRef<HTMLInputElement>(null), scanRef = useRef<HTMLInputElement>(null);
  const call = async (body: object, mode: string) => {
    setBusy(mode); setErr(null);
    try { const r = await fetch("/api/explain-diagnosis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(); setRes(await r.json()); }
    catch { setErr(mode === "text" ? "Something went wrong. Please try again." : "Couldn't read that file. Try a clearer photo or PDF, or paste the text instead."); }
    finally { setBusy(""); if (attachRef.current) attachRef.current.value = ""; if (scanRef.current) scanRef.current.value = ""; }
  };
  const onFile = (mode: string) => async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { setErr("That file is a bit large — try a smaller file to reduce size."); return; } setFile(f.name); const { base64, mimeType } = await fileToBase64(f); call({ imageBase64: base64, mimeType }, mode); };
  return (
    <>
      <PillarHero kicker="Tools · Explain My Diagnosis" title={<>Medical words, <span style={gradText}>made clear.</span></>}
        lead="Type a diagnosis or a confusing line from your doctor's note — or attach or scan it. Neyu explains what it generally means and what you might ask."
        page="/explain-diagnosis" suggestions={["What is paroxysmal atrial fibrillation?", "What does 'LV hypertrophy' mean?", "What is diastolic dysfunction?"]}
        visual={<div style={{ ...cardN, padding: 14 }}><SignalConvergence height={340} labels={["Diagnosis", "Report", "Terms", "Questions", "Next steps", "Context"]} hub="Neyu" /></div>} />
      <Section tone="white" label="Explainer">
        <div style={{ maxWidth: 860, width: "100%", margin: "0 auto", display: "grid", gap: 16 }}>
          <div role="note" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "14px 16px", borderRadius: 18, background: "#FDF3F0", border: "1px solid #F0B9AC" }}>
            <NIcon name="alert" size={18} tone="#A93A2C" style={{ marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}><b style={{ color: "#A93A2C" }}>This is an AI-generated explanation based on general medical information — it may be wrong or incomplete.</b> Please talk to your family doctor for guidance specific to your situation.</p>
          </div>
          {!res ? (
            <div style={{ ...cardN, padding: "clamp(18px,3vw,30px)", display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8, fontSize: 14, color: N.ink2 }}>A diagnosis or a line from your report
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="e.g. ‘Paroxysmal atrial fibrillation’ or a line from your doctor's notes you'd like explained." style={area} />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button onClick={() => text.trim().length >= 2 && call({ text }, "text")} disabled={text.trim().length < 2 || !!busy} style={{ ...btn("grad"), opacity: text.trim().length < 2 || busy ? 0.45 : 1 }}><NIcon name="spark" size={16} tone="light" />Explain this</button>
                <span style={{ fontSize: 13, color: N.faint }}>or</span>
                <button onClick={() => attachRef.current?.click()} disabled={!!busy} style={btn("ghost")}><NIcon name="upload" size={17} tone="grad" />Attach</button>
                <button onClick={() => scanRef.current?.click()} disabled={!!busy} style={btn("ghost")}><NIcon name="camera" size={17} tone="grad" />Scan a photo</button>
                <input ref={attachRef} type="file" accept="image/*,application/pdf" onChange={onFile("attach")} hidden />
                <input ref={scanRef} type="file" accept="image/*" capture="environment" onChange={onFile("scan")} hidden />
              </div>
              {busy && <Reading label={busy === "text" ? "Neyu is reading" : `Neyu is reading ${file || "your file"}`} />}
              {err && <p role="alert" style={{ margin: 0, color: "#A93A2C", fontSize: 14.5 }}>{err}</p>}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
              <NeyuReads title="In plain language" text={res.plainExplanation} />
              {res.keyFindings?.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 12 }}>{res.keyFindings.map((k) => <div key={k.term} style={{ ...cardN, padding: 18, display: "grid", gap: 8 }}><span style={{ display: "flex", gap: 10, alignItems: "center" }}><IconTile icon="book" size={36} /><b style={{ fontWeight: 500, fontSize: 16.5 }}>{k.term}</b></span><span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{k.explanation}</span></div>)}</div>}
              {res.commonQuestions?.length > 0 && <div style={{ ...cardN, padding: 20, display: "grid", gap: 10 }}><b style={{ fontWeight: 500, fontSize: 18 }}>Questions you might ask your doctor</b>{res.commonQuestions.map((q, i) => <button key={q} onClick={() => openAlba(q)} style={{ display: "flex", gap: 10, textAlign: "left", border: 0, background: "transparent", cursor: "pointer", padding: 0, fontSize: 15, lineHeight: 1.5, color: N.ink }}><span style={{ color: N.tealText, fontWeight: 600 }}>{i + 1}</span>{q}</button>)}</div>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/referral-centre" style={btn("grad")}>Book a consultation<NIcon name="arrow" size={16} tone="light" /></a><button onClick={() => { setText(""); setRes(null); setErr(null); setFile(null); }} style={btn("ghost")}>Explain something else</button></div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
