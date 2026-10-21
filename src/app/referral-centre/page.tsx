"use client";

import React, { useState, useRef, useEffect } from "react";
import FileReady from "@/components/FileReady";
import { saveFile } from "@/lib/saveFile";
import AlbaOrb from "@/components/AlbaOrb";
import { N, NeyuPage, Section, Kicker, NeyuReads, IconTile, cardN, btn, gradText, FlowLines, wrapN } from "@/components/neyu/kit";
import { NIcon } from "@/components/neyu/icons";
import { SignalConvergence } from "@/components/neyu/fx";
import { physicians } from "@/data/physicians";
import { locations } from "@/data/content";

const SPECIALTIES = ["Cardiology", "Internal Medicine", "Endocrinology", "Geriatric Medicine"];

const DIAGNOSTIC_EXAMS = [
  "Exercise MPI", "Pharmacological MPI", "Bubble Echocardiogram", "Echocardiogram",
  "Carotid Ultrasound", "Exercise Stress Test", "Stress Echocardiogram",
  "24 Hour Holter Monitor", "48 Hour Holter Monitor", "5 Day Holter Monitor",
  "ECG - Electrocardiogram", "24 Hour BP Monitor", "ABI (Ankle Brachial Index)",
  "Abnormal ECG", "CAD / CHF", "Post PCI", "F/U Known Stable CAD",
  "Abnormal Treadmill Stress Test", "Functional Significance Coronary Stenosis",
  "Murmur", "Chest Pain", "Shortness of Breath", "Palpitations / Arrhythmias",
  "Edema / PND / Orthopnea", "Hypertension / Left Ventricular Hypertrophy",
  "Pulmonary Hypertension", "Cardiovascular Risk Assessment",
  "Syncope / Presyncope / Vertigo / Dizziness", "Stroke / TIA", "Carotid Bruit",
  "Follow-up of Known Carotid Stenosis", "Post-surgical Angiographic Intervention Follow-up",
];

const URGENCY_OPTIONS = ["ASAP", "Urgent", "Semi-Urgent", "Phone Consult"];

interface FormState {
  patientName: string;
  patientPhone: string;
  referringPhysician: string;
  referringPhone: string;
  referringAddress: string;
  urgency: string;
  specialties: string[];
  physicianSlugs: string[];
  exams: string[];
  clinicalNotes: string;
}

const EMPTY_FORM: FormState = {
  patientName: "", patientPhone: "", referringPhysician: "", referringPhone: "",
  referringAddress: "", urgency: "ASAP", specialties: [], physicianSlugs: [],
  exams: [], clinicalNotes: "",
};

type FillMethod = "manual" | "automatic" | "scan";

interface VisitPrepResult {
  whatToBring: string[];
  whatToExpect: string;
  prepTips: string[];
  estimatedDuration: string;
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

// Phone photos are shrunk to max 1600px JPEG before upload: faster on mobile
// data, under the server size limit, and iPhone HEIC photos become JPEG.
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new window.Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const data = c.toDataURL("image/jpeg", 0.85);
    return { base64: data.split(",")[1] || "", mimeType: "image/jpeg" };
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: (reader.result as string).split(",")[1] || "", mimeType: file.type || "image/jpeg" });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Loads /logo.png and returns a base64 PNG + its natural aspect ratio,
// so the PDF logo scales correctly without distortion.
function loadLogo(url: string): Promise<{ dataUrl: string; ratio: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ReferralCentre() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [freeText, setFreeText] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [readyFile, setReadyFile] = useState<{ blob: Blob; name: string } | null>(null);
  // Load the PDF library early so the download starts instantly on tap.
  useEffect(() => { import("jspdf").catch(() => {}); }, []);
  const [scannedFileName, setScannedFileName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tracks how the form was last filled, so we can log which flow the
  // patient/staff actually used when the PDF is generated.
  const [fillMethod, setFillMethod] = useState<FillMethod>("manual");

  // AI Visit-Prep Summary state
  const [visitPrep, setVisitPrep] = useState<VisitPrepResult | null>(null);
  const [visitPrepLoading, setVisitPrepLoading] = useState(false);
  const [visitPrepError, setVisitPrepError] = useState<string | null>(null);

  const applyAutofillResult = (data: any) => {
    // Typewriter: Neyu "types" each text field in, one after another.
    const TXT = ["patientName", "patientPhone", "referringPhysician", "referringPhone", "referringAddress", "clinicalNotes"] as const;
    const queue = TXT.filter((k) => typeof data[k] === "string" && data[k].trim()).map((k) => [k, String(data[k])] as const);
    let qi = 0, ci = 0;
    const tick = () => {
      if (qi >= queue.length) return;
      const [k, v] = queue[qi]; ci = Math.min(v.length, ci + (k === "clinicalNotes" ? 3 : 1));
      setForm((f) => ({ ...f, [k]: v.slice(0, ci) }));
      if (ci >= v.length) { qi++; ci = 0; }
      setTimeout(tick, 22);
    };
    setTimeout(tick, 120);
    setForm((f) => ({
      ...f,
      urgency: data.urgency || f.urgency,
      specialties: Array.isArray(data.specialties) ? data.specialties.filter((s: string) => SPECIALTIES.includes(s)) : f.specialties,
      exams: Array.isArray(data.exams) ? data.exams.filter((e: string) => DIAGNOSTIC_EXAMS.includes(e)) : f.exams,
    }));
  };

  const runAutofill = async () => {
    if (freeText.trim().length < 10) return;
    setAutofilling(true);
    setError(null);
    try {
      const res = await fetch("/api/referral-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: freeText }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      applyAutofillResult(data);
      setFillMethod("automatic");
    } catch {
      setError("Auto-fill failed. Please fill the form manually below.");
    } finally {
      setAutofilling(false);
    }
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("That photo is a bit large — try again with a smaller image or better lighting to reduce file size.");
      return;
    }
    setScanning(true);
    setError(null);
    setScannedFileName(file.name);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/referral-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      applyAutofillResult(data);
      setFillMethod("scan");
    } catch {
      setError("Couldn't read that photo. Try a clearer, well-lit shot of the referral document.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logSubmission = () => {
    // Fire-and-forget — never block or delay the PDF download for this.
    fetch("/api/log-referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: fillMethod,
        patientName: form.patientName,
        patientPhone: form.patientPhone,
        referringPhysician: form.referringPhysician,
        referringPhone: form.referringPhone,
        referringAddress: form.referringAddress,
        urgency: form.urgency,
        specialties: form.specialties,
        physicianSlugs: form.physicianSlugs,
        exams: form.exams,
        clinicalNotes: form.clinicalNotes,
        sourceText: fillMethod === "automatic" ? freeText : fillMethod === "scan" ? scannedFileName : undefined,
      }),
    }).catch(() => {});
  };

  const runVisitPrep = async () => {
    setVisitPrepLoading(true);
    setVisitPrepError(null);
    try {
      const res = await fetch("/api/visit-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialties: form.specialties,
          exams: form.exams,
          urgency: form.urgency,
          clinicalNotes: form.clinicalNotes,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setVisitPrep(data);
    } catch {
      setVisitPrepError("Couldn't generate a visit prep guide right now. Please try again.");
    } finally {
      setVisitPrepLoading(false);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      const GOLD: [number, number, number] = [110, 168, 182];
      const GOLD_DARK: [number, number, number] = [63, 111, 124];
      const GOLD_LIGHT: [number, number, number] = [220, 238, 241];
      const GRAPHITE_900: [number, number, number] = [26, 37, 40];
      const GRAPHITE_700: [number, number, number] = [84, 96, 85];
      const GRAPHITE_500: [number, number, number] = [124, 135, 128];
      const PEARL_50: [number, number, number] = [247, 249, 251];
      const PEARL_300: [number, number, number] = [201, 223, 228];

      const drawCheckbox = (x: number, y: number, checked: boolean, size = 7) => {
        doc.setDrawColor(...GRAPHITE_500);
        doc.setLineWidth(0.75);
        if (checked) {
          doc.setFillColor(...GOLD);
          doc.rect(x, y, size, size, "FD");
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(x, y, size, size, "FD");
        }
      };

      doc.setFillColor(...GRAPHITE_900);
      doc.rect(0, 0, pageWidth, 68, "F");
      doc.setTextColor(...GOLD);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Referral", pageWidth / 2, 43, { align: "center" });

      const addrColWidth = 160;
      const logoSlotWidth = 120;
      const rowY = 88;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAPHITE_700);
      if (locations[0]) {
        doc.text([locations[0].address, `T ${locations[0].phone}  F ${locations[0].fax}`], margin, rowY, { maxWidth: addrColWidth });
      }
      if (locations[1]) {
        doc.text([locations[1].address, `T ${locations[1].phone}  F ${locations[1].fax}`], pageWidth - margin, rowY, { align: "right", maxWidth: addrColWidth });
      }

      const logo = await loadLogo("/logo.png");
      if (logo) {
        let logoH = 44;
        let logoW = logoH * logo.ratio;
        if (logoW > logoSlotWidth) { logoW = logoSlotWidth; logoH = logoW / logo.ratio; }
        doc.addImage(logo.dataUrl, "PNG", pageWidth / 2 - logoW / 2, 76, logoW, logoH);
      }

      const boxY = 158;
      const boxH = 100;
      const boxW = (pageWidth - margin * 2 - 20) / 2;
      const boxGap = 20;

      const drawInfoBox = (x: number, title: string, lines: string[]) => {
        doc.setFillColor(...PEARL_50);
        doc.setDrawColor(...PEARL_300);
        doc.setLineWidth(0.75);
        doc.roundedRect(x, boxY, boxW, boxH, 4, 4, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...GOLD_DARK);
        doc.text(title, x + 14, boxY + 22);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...GRAPHITE_900);
        let ly = boxY + 42;
        lines.forEach((line) => { doc.text(line, x + 14, ly); ly += 16; });
      };

      drawInfoBox(margin, "PATIENT INFORMATION", [
        `Name: ${form.patientName || "—"}`,
        `Phone: ${form.patientPhone || "—"}`,
      ]);

      drawInfoBox(margin + boxW + boxGap, "REFERRING PHYSICIAN", [
        `Name: ${form.referringPhysician || "—"}`,
        `Phone: ${form.referringPhone || "—"}`,
        `Address: ${form.referringAddress || "—"}`,
      ]);
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAPHITE_500);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin + boxW + boxGap + 14, boxY + 90);

      let y = boxY + boxH + 34;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...GRAPHITE_900);
      doc.text("Urgency", pageWidth / 2, y, { align: "center" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const urgencyGap = 100;
      const urgencyStartX = pageWidth / 2 - (URGENCY_OPTIONS.length * urgencyGap) / 2;
      URGENCY_OPTIONS.forEach((u, i) => {
        const x = urgencyStartX + i * urgencyGap;
        drawCheckbox(x, y - 6.5, form.urgency === u);
        doc.setTextColor(...GRAPHITE_900);
        doc.text(u, x + 13, y);
      });

      y += 34;
      const colGap = 20;
      const colW = (pageWidth - margin * 2 - colGap) / 2;
      const colLeftX = margin;
      const colRightX = margin + colW + colGap;
      const headerH = 22;

      doc.setFillColor(...GOLD);
      doc.rect(colLeftX, y, colW, headerH, "F");
      doc.rect(colRightX, y, colW, headerH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GRAPHITE_900);
      doc.text("CONSULT", colLeftX + colW / 2, y + 15, { align: "center" });
      doc.text("CARDIAC DIAGNOSTIC EXAMINATION", colRightX + colW / 2, y + 15, { align: "center" });

      const listStartY = y + headerH + 20;
      const rowHeight = 13.5;

      let leftY = listStartY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...GRAPHITE_900);
      doc.text("Consultation Requested:", colLeftX, leftY);
      leftY += rowHeight;

      doc.setFont("helvetica", "normal");
      SPECIALTIES.forEach((s) => {
        drawCheckbox(colLeftX, leftY - 6.5, form.specialties.includes(s));
        doc.text(s, colLeftX + 13, leftY);
        leftY += rowHeight;
      });

      leftY += 8;
      physicians.forEach((p) => {
        drawCheckbox(colLeftX, leftY - 6.5, form.physicianSlugs.includes(p.slug));
        doc.text(p.name, colLeftX + 13, leftY);
        leftY += rowHeight;
      });

      leftY += 12;
      doc.setFont("helvetica", "bold");
      doc.text("Clinical Notes:", colLeftX, leftY);
      leftY += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(form.clinicalNotes || "—", colW);
      doc.text(notesLines, colLeftX, leftY);

      let rightY = listStartY;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lineHeight = 10.5;
      DIAGNOSTIC_EXAMS.forEach((examName) => {
        const lines = doc.splitTextToSize(examName, colW - 16);
        drawCheckbox(colRightX, rightY - 6.5, form.exams.includes(examName));
        doc.setTextColor(...GRAPHITE_900);
        doc.text(lines, colRightX + 13, rightY);
        rightY += lineHeight * lines.length + 3;
      });

      const footerH = 30;
      doc.setFillColor(...GRAPHITE_900);
      doc.rect(0, pageHeight - footerH, pageWidth, footerH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GOLD_LIGHT);
      doc.text("Please fax completed form - we will call the patient to book", margin, pageHeight - footerH / 2 + 3);
      doc.text("www.neyuhealth.com", pageWidth - margin, pageHeight - footerH / 2 + 3, { align: "right" });

      logSubmission();

      const name = `NEYU-Referral-${(form.patientName || "patient").replace(/[^\w\- ]+/g, "").trim() || "patient"}.pdf`;
      const blob = doc.output("blob");
      const r = await saveFile(blob, name, { fromTap: false });
      if (r === "needs-tap") setReadyFile({ blob, name });
    } catch (e) {
      console.error("Referral PDF failed", e);
      setError("Couldn't create the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const inp: React.CSSProperties = { height: 50, padding: "0 14px", borderRadius: 14, border: `1px solid ${N.line}`, background: "#fff", fontSize: 16, color: N.ink, width: "100%", boxSizing: "border-box" };
  const chipS = (on: boolean): React.CSSProperties => ({ minHeight: 38, padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13.5, textAlign: "left", border: `1px solid ${on ? "transparent" : N.line}`, background: on ? N.ink : "#fff", color: on ? "#fff" : N.ink2, display: "inline-flex", alignItems: "center", gap: 6, transition: "all .2s" });
  const fields = [form.patientName, form.patientPhone, form.referringPhysician, form.referringPhone, form.referringAddress, form.specialties.length || form.physicianSlugs.length ? "x" : "", form.exams.length || form.clinicalNotes ? "x" : ""];
  const done = fields.filter(Boolean).length, pct = Math.round((done / fields.length) * 100);
  const URG: Record<string, string> = { ASAP: "Seen as soon as possible", Urgent: "Within days", "Semi-Urgent": "Within weeks", "Phone Consult": "Physician-to-physician call" };
  // Called as a function (not <Step>), so inputs inside keep focus while typing.
  const step = (n: number, title: string, children: React.ReactNode) => (
    <div style={{ display: "grid", gap: 12 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 28, height: 28, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#2FBF94,#2273D6)" }}>{n}</span><b style={{ fontWeight: 500, fontSize: 18 }}>{title}</b></span>
      {children}
    </div>
  );
  return (
    <NeyuPage>
      <section style={{ position: "relative", overflow: "hidden", padding: "clamp(32px,6vw,80px) 0 clamp(24px,4vw,48px)", background: "radial-gradient(900px 480px at 90% 0%, rgba(34,115,214,.09), transparent 60%), radial-gradient(800px 500px at 0% 30%, rgba(47,191,148,.09), transparent 60%)" }}>
        <FlowLines opacity={0.45} />
        <div style={{ ...wrapN, position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(24px,4vw,56px)", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
            <Kicker label="For physicians · Referral Centre" badge="AI auto-fill" />
            <h1 style={{ margin: 0, fontSize: "clamp(40px,6vw,74px)", lineHeight: 1, letterSpacing: "-.045em", fontWeight: 500, color: N.ink }}>Refer a patient <span style={gradText}>in seconds.</span></h1>
            <p style={{ margin: 0, fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.6, color: N.ink2, maxWidth: 620 }}>Describe the patient in plain words or scan a referral — Neyu fills the NEYU referral form. Review it, download the PDF and fax it to either clinic. We call the patient to book.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
              {locations.map((l) => <div key={l.tag} style={{ ...cardN, padding: "12px 14px", display: "grid", gap: 4 }}><b style={{ fontWeight: 500, fontSize: 15 }}>{l.name}</b><span style={{ fontSize: 13.5, color: N.ink2, display: "flex", gap: 6, alignItems: "center" }}><NIcon name="doc" size={15} tone="grad" />Fax {l.fax}</span><span style={{ fontSize: 13.5, color: N.ink2, display: "flex", gap: 6, alignItems: "center" }}><NIcon name="phone" size={15} tone="grad" />{l.phone}</span></div>)}
            </div>
          </div>
          <div style={{ ...cardN, padding: 14 }}><SignalConvergence height={340} labels={["Patient", "Reason", "Urgency", "Specialty", "Tests", "Notes"]} hub="Referral" /></div>
        </div>
      </section>

      <Section tone="white" label="Referral form">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,520px),1fr))", gap: 20, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
            <div style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 12, background: "linear-gradient(160deg,#FFFFFF,#F1F9F7)", borderColor: "rgba(47,191,148,.3)" }}>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}><AlbaOrb size={26} /><b style={{ fontWeight: 500, fontSize: 18 }}>Automatic referral</b></span>
              <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={3} aria-label="Describe the patient and reason for referral" placeholder="Describe the patient and reason for referral in plain text — e.g. 'Chuks, chest pain for two weeks, needs urgent cardiology consult and an ECG.'" style={{ ...inp, height: "auto", padding: 14, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button onClick={runAutofill} disabled={freeText.trim().length < 10 || autofilling} style={{ ...btn("grad"), opacity: freeText.trim().length < 10 || autofilling ? 0.45 : 1 }}><NIcon name="spark" size={16} tone="light" />{autofilling ? "Neyu is filling the form…" : "Auto-fill from text"}</button>
                <span style={{ fontSize: 13, color: N.faint }}>or</span>
                <button onClick={() => fileInputRef.current?.click()} disabled={scanning} style={btn("ghost")}><NIcon name="camera" size={17} tone="grad" />{scanning ? "Reading photo…" : "Scan a referral photo"}</button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanFile} hidden />
              </div>
              {scannedFileName && !scanning && !error && <p style={{ margin: 0, fontSize: 13, color: N.muted }}>Scanned: {scannedFileName} — form updated below.</p>}
              {error && <p role="alert" style={{ margin: 0, fontSize: 14.5, color: "#A93A2C" }}>{error}</p>}
            </div>

            <div style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 22 }}>
              {step(1, "Patient", <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Patient name<input value={form.patientName} onChange={(e) => { setForm({ ...form, patientName: e.target.value }); setFillMethod("manual"); }} style={inp} autoComplete="off" /></label>
                  <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Patient phone<input value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} style={inp} type="tel" autoComplete="off" /></label>
                </div>
              </>)}
              {step(2, "Referring physician", <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Name<input value={form.referringPhysician} onChange={(e) => setForm({ ...form, referringPhysician: e.target.value })} style={inp} /></label>
                  <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Phone<input value={form.referringPhone} onChange={(e) => setForm({ ...form, referringPhone: e.target.value })} style={inp} type="tel" /></label>
                </div>
                <label style={{ display: "grid", gap: 6, fontSize: 14, color: N.ink2 }}>Clinic address<input value={form.referringAddress} onChange={(e) => setForm({ ...form, referringAddress: e.target.value })} style={inp} /></label>
              </>)}
              {step(3, "Urgency", <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 8 }}>
                  {URGENCY_OPTIONS.map((u) => { const on = form.urgency === u; return <button key={u} onClick={() => setForm({ ...form, urgency: u })} aria-pressed={on} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 16, cursor: "pointer", border: `1px solid ${on ? "rgba(31,167,180,.55)" : N.line}`, background: on ? "linear-gradient(160deg,#FFFFFF,#EEF7F6)" : "#fff", display: "grid", gap: 2 }}><b style={{ fontWeight: 600, fontSize: 14.5, color: N.ink }}>{u}</b><span style={{ fontSize: 12.5, color: N.muted }}>{URG[u]}</span></button>; })}
                </div>
              </>)}
              {step(4, "Consultation requested", <>
                <span style={{ fontSize: 13.5, color: N.muted }}>Specialty</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{SPECIALTIES.map((sp) => <button key={sp} onClick={() => setForm({ ...form, specialties: toggle(form.specialties, sp) })} aria-pressed={form.specialties.includes(sp)} style={chipS(form.specialties.includes(sp))}>{form.specialties.includes(sp) && <NIcon name="check" size={14} tone="light" />}{sp}</button>)}</div>
                <span style={{ fontSize: 13.5, color: N.muted }}>Physician (optional)</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{physicians.map((p) => <button key={p.slug} onClick={() => setForm({ ...form, physicianSlugs: toggle(form.physicianSlugs, p.slug) })} aria-pressed={form.physicianSlugs.includes(p.slug)} style={chipS(form.physicianSlugs.includes(p.slug))} title={`${p.disciplines.join(", ")} · ${p.location}`}>{form.physicianSlugs.includes(p.slug) && <NIcon name="check" size={14} tone="light" />}{p.name}</button>)}</div>
              </>)}
              {step(5, "Cardiac diagnostic examination", <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 2 }}>{DIAGNOSTIC_EXAMS.map((ex) => <button key={ex} onClick={() => setForm({ ...form, exams: toggle(form.exams, ex) })} aria-pressed={form.exams.includes(ex)} style={chipS(form.exams.includes(ex))}>{form.exams.includes(ex) && <NIcon name="check" size={14} tone="light" />}{ex}</button>)}</div>
              </>)}
              {step(6, "Clinical notes", <>
                <textarea value={form.clinicalNotes} onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })} rows={4} aria-label="Clinical notes" placeholder="History, current medications, relevant results…" style={{ ...inp, height: "auto", padding: 14, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
              </>)}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button onClick={generatePdf} disabled={generating || !form.patientName} style={{ ...btn("grad"), opacity: generating || !form.patientName ? 0.45 : 1 }}><NIcon name="upload" size={16} tone="light" style={{ transform: "rotate(180deg)" }} />{generating ? "Generating…" : "Download referral PDF"}</button>
                <button onClick={runVisitPrep} disabled={visitPrepLoading || form.specialties.length === 0} style={{ ...btn("ghost"), opacity: visitPrepLoading || form.specialties.length === 0 ? 0.5 : 1 }}><NIcon name="calendarCheck" size={17} tone="grad" />{visitPrepLoading ? "Preparing…" : "Patient visit-prep guide"}</button>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: N.faint }}>Email/fax sending isn't configured yet — download the PDF and fax it to the clinic. {form.specialties.length === 0 ? "Select a specialty to create a visit-prep guide." : ""}</p>
              {visitPrepError && <p role="alert" style={{ margin: 0, fontSize: 14.5, color: "#A93A2C" }}>{visitPrepError}</p>}
            </div>

            {visitPrep && (
              <div style={{ ...cardN, padding: "clamp(18px,3vw,28px)", display: "grid", gap: 14, animation: "fadeUp .3s ease" }}>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><IconTile icon="calendarCheck" active /><b style={{ fontWeight: 500, fontSize: 19 }}>What to expect at the appointment</b></span>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: N.ink2 }}>{visitPrep.whatToExpect}</p>
                {visitPrep.estimatedDuration && <span style={{ fontSize: 14, color: N.muted, display: "flex", gap: 6, alignItems: "center" }}><NIcon name="clock" size={15} tone="grad" />Estimated visit length: <b style={{ color: N.ink, fontWeight: 600 }}>{visitPrep.estimatedDuration}</b></span>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 14 }}>
                  {[["What to bring", visitPrep.whatToBring], ["Preparation tips", visitPrep.prepTips]].map(([t, list]) => (list as string[]).length > 0 && <div key={t as string} style={{ display: "grid", gap: 8 }}><span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{t as string}</span>{(list as string[]).map((x) => <span key={x} style={{ display: "flex", gap: 8, fontSize: 14.5, lineHeight: 1.5, color: N.ink2 }}><NIcon name="check" size={16} tone="#1F9E7A" style={{ marginTop: 2 }} />{x}</span>)}</div>)}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: N.faint }}>General guidance to help the patient prepare — the care team gives specific instructions when booking.</p>
              </div>
            )}
          </div>

          <aside style={{ position: "sticky", top: 90, display: "grid", gap: 14 }}>
            <div style={{ ...cardN, padding: 20, display: "grid", gap: 12 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b style={{ fontWeight: 500, fontSize: 17 }}>Referral preview</b><span style={{ fontSize: 13, color: N.muted }}>{pct}% complete</span></span>
              <div style={{ height: 6, borderRadius: 3, background: N.line2 }}><div style={{ height: "100%", width: pct + "%", borderRadius: 3, background: "linear-gradient(90deg,#2FBF94,#2273D6)", transition: "width .5s" }} /></div>
              <div style={{ borderRadius: 16, border: `1px solid ${N.line}`, padding: 14, display: "grid", gap: 8, background: "#FCFDFD", fontSize: 13.5, color: N.ink2 }}>
                <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: N.muted }}><span>NEYU HEALTH · REFERRAL</span><span>{new Date().toLocaleDateString("en-CA")}</span></span>
                <span><b style={{ color: N.ink, fontWeight: 600 }}>Patient:</b> {form.patientName || "—"} {form.patientPhone && `· ${form.patientPhone}`}</span>
                <span><b style={{ color: N.ink, fontWeight: 600 }}>From:</b> {form.referringPhysician || "—"}</span>
                <span><b style={{ color: N.ink, fontWeight: 600 }}>Urgency:</b> {form.urgency}</span>
                <span><b style={{ color: N.ink, fontWeight: 600 }}>Consult:</b> {[...form.specialties, ...physicians.filter((p) => form.physicianSlugs.includes(p.slug)).map((p) => p.name)].join(", ") || "—"}</span>
                <span><b style={{ color: N.ink, fontWeight: 600 }}>Exams:</b> {form.exams.join(", ") || "—"}</span>
              </div>
            </div>
            <div style={{ ...cardN, padding: 20, display: "grid", gap: 10 }}>
              <b style={{ fontWeight: 500, fontSize: 17 }}>What happens next</b>
              {[["referral", "You fax the referral to either clinic."], ["phone", "The clinic calls the patient to book."], ["stethoscope", "The specialist sees the patient and runs any tests onsite."], ["doc", "Findings and the plan are shared back with you."]].map(([ic, t], i) => <span key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.5, color: N.ink2 }}><IconTile icon={ic} size={32} /><span><span style={{ fontSize: 12, color: N.faint }}>0{i + 1} · </span>{t}</span></span>)}
            </div>
            <NeyuReads text="Neyu never sends anything on its own. Patient details stay on this page until you download the PDF." />
          </aside>
        </div>
      </Section>
      <FileReady file={readyFile} onClose={() => setReadyFile(null)} />
    </NeyuPage>
  );
}
