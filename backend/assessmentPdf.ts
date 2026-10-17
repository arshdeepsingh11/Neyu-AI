// Doctor Assessment PDF: a clean, printable patient health summary (DM Sans)
// followed by the ORIGINAL reports the patient chose, attached unchanged.
import { docBytes } from "@backend/storage";
import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { prisma } from "./db";
import type { Assessment } from "./space";

const W = 612, H = 792, M = 54; // US Letter, 0.75in margins
const INK = rgb(0.11, 0.14, 0.16), INK2 = rgb(0.29, 0.32, 0.35), MUTED = rgb(0.45, 0.48, 0.51), LINE = rgb(0.88, 0.89, 0.9);
const TEAL = rgb(0.11, 0.56, 0.82), WASH = rgb(0.93, 0.97, 0.99), AMBER = rgb(0.6, 0.38, 0.05), AMBERW = rgb(1, 0.96, 0.88);

export interface PdfOptions { sections: string[]; docIds: string[]; observations: string[]; questions: string[]; summary?: string; countOnly?: boolean }

/** Builds the PDF. With countOnly, returns just the number of summary pages (no originals embedded). */
export async function buildAssessmentPdf(patientId: string, a: Assessment, o: PdfOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Doctor Assessment — ${a.patient.name}`); pdf.setAuthor("NEYU Health · My Health Space"); pdf.setSubject("AI-generated patient health summary. Not a medical diagnosis.");
  pdf.registerFontkit(fontkit);
  let reg: PDFFont, med: PDFFont;
  try {
    const dir = path.join(process.cwd(), "public", "fonts");
    reg = await pdf.embedFont(readFileSync(path.join(dir, "dm-sans-400.woff")), { subset: true });
    med = await pdf.embedFont(readFileSync(path.join(dir, "dm-sans-500.woff")), { subset: true });
  } catch { reg = await pdf.embedFont(StandardFonts.Helvetica); med = await pdf.embedFont(StandardFonts.HelveticaBold); }
  const cs = new Set(reg.getCharacterSet());
  const T = (s: unknown) => String(s ?? "").replace(/[→]/g, "to").replace(/[≥]/g, ">=").replace(/[≤]/g, "<=").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").split("").filter((c) => c === " " || cs.has(c.codePointAt(0)!)).join("");
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try { logo = await pdf.embedPng(readFileSync(path.join(process.cwd(), "public", "logo.png"))); } catch {}

  const on = (s: string) => o.sections.includes(s);
  const generated = new Date(a.generatedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const rangeLabel = a.days >= 3650 ? "All available history" : a.days >= 365 ? "Last 12 months" : a.days >= 180 ? "Last 6 months" : a.days >= 90 ? "Last 3 months" : "Last 30 days";

  let page!: PDFPage, y = 0;
  const pages: PDFPage[] = [];
  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page); y = H - M;
    if (pages.length > 1) { page.drawText(T(`Doctor Assessment · ${a.patient.name}`), { x: M, y: H - 34, size: 8.5, font: reg, color: MUTED }); page.drawLine({ start: { x: M, y: H - 42 }, end: { x: W - M, y: H - 42 }, thickness: 0.5, color: LINE }); y = H - 66; }
  };
  const need = (h: number) => { if (y - h < M + 24) newPage(); };
  const wrap = (s: string, f: PDFFont, size: number, w: number) => {
    const out: string[] = [];
    T(s).split("\n").forEach((para) => {
      let line = "";
      para.split(/\s+/).forEach((word) => { const t = line ? line + " " + word : word; if (f.widthOfTextAtSize(t, size) > w && line) { out.push(line); line = word; } else line = t; });
      out.push(line);
    });
    return out;
  };
  const text = (s: string, opt: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; w?: number; gap?: number } = {}) => {
    const size = opt.size ?? 10, f = opt.f ?? reg, x = opt.x ?? M, w = opt.w ?? W - M - x, lh = size * 1.42;
    wrap(s, f, size, w).forEach((l) => { need(lh); page.drawText(l, { x, y: y - size, size, font: f, color: opt.color ?? INK2 }); y -= lh; });
    y -= opt.gap ?? 0;
  };
  const heading = (s: string, sub?: string) => {
    need(56); y -= 14;
    page.drawRectangle({ x: M, y: y - 14, width: 3, height: 14, color: TEAL });
    page.drawText(T(s), { x: M + 10, y: y - 12, size: 13, font: med, color: INK }); y -= 22;
    if (sub) text(sub, { size: 8.5, color: MUTED, gap: 2 });
    y -= 4;
  };
  const rows = (items: [string, string][], col = 190) => items.forEach(([k, v]) => {
    const lines = wrap(v, reg, 10, W - M * 2 - col);
    need(lines.length * 14 + 8);
    page.drawText(T(k), { x: M, y: y - 10, size: 10, font: reg, color: MUTED });
    lines.forEach((l, i) => page.drawText(l, { x: M + col, y: y - 10 - i * 14, size: 10, font: reg, color: INK }));
    y -= lines.length * 14 + 6; page.drawLine({ start: { x: M, y: y + 1 }, end: { x: W - M, y: y + 1 }, thickness: 0.4, color: LINE }); y -= 6;
  });
  const bullets = (xs: string[], empty = "None recorded.") => (xs.length ? xs : [empty]).forEach((s) => { need(14); page.drawCircle({ x: M + 3, y: y - 6.5, size: 1.6, color: xs.length ? TEAL : MUTED }); text(s, { x: M + 12, gap: 2, color: xs.length ? INK2 : MUTED }); });

  // ── Cover / header ─────────────────────────────────────────────────────
  newPage();
  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: WASH });
  if (logo) { const s = 34 / logo.height; page.drawImage(logo, { x: M, y: H - 70, width: logo.width * s, height: 34 }); }
  page.drawText(T("DOCTOR ASSESSMENT"), { x: M, y: H - 98, size: 9, font: med, color: TEAL });
  page.drawText(T(a.patient.name || "Patient"), { x: M, y: H - 124, size: 24, font: med, color: INK });
  const meta = [a.patient.age != null ? `Age ${a.patient.age}` : "", a.patient.sex || "", a.patient.dob ? `DOB ${a.patient.dob}` : "", rangeLabel, `Prepared ${generated}`].filter(Boolean).join("   ·   ");
  page.drawText(T(meta), { x: M, y: H - 142, size: 9, font: reg, color: INK2 });
  y = H - 172;
  // Safety banner
  const banner = "AI-generated patient health summary prepared by the patient with Neyu (NEYU Health). It organises information the patient has shared and is not a medical diagnosis. Values are reproduced from their sources; original reports are attached unchanged at the end.";
  const bl = wrap(banner, reg, 8.8, W - M * 2 - 24);
  page.drawRectangle({ x: M, y: y - bl.length * 12.5 - 14, width: W - M * 2, height: bl.length * 12.5 + 14, color: AMBERW, borderColor: rgb(0.95, 0.85, 0.6), borderWidth: 0.6 });
  bl.forEach((l, i) => page.drawText(l, { x: M + 12, y: y - 17 - i * 12.5, size: 8.8, font: reg, color: AMBER }));
  y -= bl.length * 12.5 + 26;

  if (o.summary) {
    heading("30-second summary", "The most important recent information, prepared with Neyu (AI). Please verify against the data below.");
    text(o.summary, { size: 10.5, color: INK, gap: 4 });
  }
  if (on("newinfo") && a.newInfo.length) { heading("New information in this period"); bullets(a.newInfo); }
  if (on("overview")) {
    heading("Patient overview");
    rows([
      ["Name", a.patient.name], ...(a.patient.dob ? [["Date of birth", a.patient.dob] as [string, string]] : []), ...(a.patient.sex ? [["Sex", String(a.patient.sex)] as [string, string]] : []),
      ...(a.patient.heightCm ? [["Height", `${a.patient.heightCm} cm`] as [string, string]] : []), ...(a.patient.occupation ? [["Occupation", String(a.patient.occupation)] as [string, string]] : []),
      ["Conditions (patient-reported)", a.conditions.join("; ") || "None recorded"], ["Allergies", a.allergies.join("; ") || "None recorded"],
      ...(a.surgeries.length ? [["Past surgeries", a.surgeries.join("; ")] as [string, string]] : []), ["Family history", a.familyHistory.join("; ") || "None recorded"],
    ]);
  }
  if (on("medications")) { heading("Medications", "As listed by the patient. Please confirm with the patient."); bullets(a.medications); }
  if (on("observations") || o.observations.length) {
    heading("Summary observations", "AI-generated from the data in this report. For the clinician's review; not a diagnosis.");
    bullets(o.observations, "Not enough information for observations.");
  }
  if (on("activity")) {
    heading("Recent health activity", `${rangeLabel} · daily averages from connected devices and home readings`);
    a.activity.length ? rows(a.activity.map((r) => [r.label, `${r.value}${r.n ? `   (${r.n} ${r.label.includes("pressure") ? "readings" : "days"})` : ""}`])) : text("No device or home readings in this period.", { color: MUTED });
    const ls = a.lifestyle;
    const lsr: [string, string][] = [];
    if (ls.exerciseDays != null) lsr.push(["Exercise (self-reported)", `${ls.exerciseDays} days per week`]);
    if (ls.smoking) lsr.push(["Smoking / vaping", String(ls.smoking)]);
    if (ls.alcohol) lsr.push(["Alcohol (last 30 days, logged)", `${ls.alcohol} drinks`]);
    if (ls.sleepQuality != null) lsr.push(["Sleep quality (1–5)", String(ls.sleepQuality)]);
    if (lsr.length) { y -= 4; rows(lsr); }
  }
  if (on("labs")) {
    heading("Laboratory results", "Most recent value per test in this period. Flags are as printed by the laboratory or against the stated range.");
    if (!a.labs.length) text("No laboratory results in this period.", { color: MUTED });
    else {
      const cols = [M, M + 165, M + 305, M + 395];
      need(20);
      ["Test", "Result", "Reference", "Date · source"].forEach((h, i) => page.drawText(T(h), { x: cols[i], y: y - 9, size: 8.5, font: med, color: MUTED }));
      y -= 16;
      a.labs.forEach((l) => {
        need(28);
        const flag = l.flag && l.flag !== "in range" ? `  (${l.flag})` : "";
        page.drawText(T(l.name).slice(0, 38), { x: cols[0], y: y - 10, size: 9.5, font: reg, color: INK });
        page.drawText(T(`${l.value} ${l.unit}${flag}`).slice(0, 30), { x: cols[1], y: y - 10, size: 9.5, font: flag ? med : reg, color: flag ? AMBER : INK });
        page.drawText(T(l.ref || "—").slice(0, 22), { x: cols[2], y: y - 10, size: 9, font: reg, color: INK2 });
        page.drawText(T(`${l.date} · ${l.source}`).slice(0, 34), { x: cols[3], y: y - 10, size: 8.5, font: reg, color: MUTED });
        y -= 18; page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.4, color: LINE });
      });
    }
  }
  if (on("reports")) {
    heading("Reports — short summaries", "From each report in this period, read by Neyu. The original report is the medical record; attached originals follow.");
    if (!a.reports.length) text("No reports in this period.", { color: MUTED });
    a.reports.forEach((r) => {
      need(46);
      page.drawText(T(`${r.date}  ·  ${r.title}`).slice(0, 80), { x: M, y: y - 10, size: 10, font: med, color: INK }); y -= 15;
      if (r.provider) { page.drawText(T(r.provider).slice(0, 80), { x: M, y: y - 9, size: 8.5, font: reg, color: MUTED }); y -= 13; }
      text(r.summary, { size: 9.5, gap: 1 });
      if (r.flagged.length) text(`Flagged on the report: ${r.flagged.join("; ")}`, { size: 9, color: AMBER, gap: 1 });
      y -= 6;
    });
  }
  if (on("lifestyle")) {
    heading("Daily life", "Eating habits, physical activity and how the patient has been feeling — from logs, devices and check-ins.");
    text("Eating habits", { f: med, size: 10, color: INK }); bullets(a.eating, "No food information in this period.");
    y -= 4; text("Physical activity", { f: med, size: 10, color: INK }); bullets(a.physical, "No activity information in this period.");
    if (a.checkins) { y -= 4; text("Weekly check-ins", { f: med, size: 10, color: INK }); bullets([a.checkins]); }
  }
  if (on("profile")) { heading("Recent changes to the patient profile", "What the patient updated in their health profile, with dates."); bullets(a.profileChanges.map((c) => `${c.date} — ${c.text}`), "No profile changes in this period."); }
  if (on("trends")) {
    heading("What changed", "Compared with the previous period, using the patient's own data.");
    bullets(a.changes.map((c) => `${c.status === "insufficient" || c.status === "new" ? "" : c.status[0].toUpperCase() + c.status.slice(1) + ": "}${c.text}`), "Not enough history to compare yet.");
  }
  if (on("nutrition")) {
    heading("Nutrition overview", "High-level pattern from the patient's food log (not a full diet record).");
    const n = a.nutrition;
    if (!n) text("No food log in this period.", { color: MUTED });
    else rows([...(n.diet ? [["Eating pattern", String(n.diet)] as [string, string]] : []), ...(n.meals ? [["Meals logged", String(n.meals)], ["With fruit or vegetables", `${Math.round((n.veg / n.meals) * 100)}%`], ["With protein", `${Math.round((n.protein / n.meals) * 100)}%`], ["With fibre / whole grains", `${Math.round((n.fibre / n.meals) * 100)}%`], ["Processed, fried or sugary", `${Math.round((n.processed / n.meals) * 100)}%`]] as [string, string][] : [])]);
  }
  if (on("history")) { heading("Medical history in this period", "Visits and reports recorded in the patient's Health Space."); bullets(a.history.map((h) => `${h.date} — ${h.text}`), "No visits or reports recorded in this period."); }
  if (on("goals")) { heading("Patient goals"); bullets(a.goals, "No goals set."); }
  if (on("questions")) { heading("Questions for the doctor", "Written by the patient, some suggested by Neyu from the data above."); bullets(o.questions, "No questions added."); }
  if (on("sources")) {
    heading("Data sources");
    bullets(a.sources, "Patient-entered information only.");
    const chosen = a.documents.filter((d) => o.docIds.includes(d.id));
    if (chosen.length) { y -= 6; text("Original reports attached (unchanged):", { f: med, size: 10, color: INK }); bullets(chosen.map((d) => `${d.title}${d.provider ? ` — ${d.provider}` : ""} · ${d.date}`)); }
  }

  if (o.countOnly) return new Uint8Array([pages.length]);
  // ── Original reports, attached unchanged ──────────────────────────────
  const docs = o.docIds.length ? await prisma.healthDocument.findMany({ where: { patientId, id: { in: o.docIds.slice(0, 20) } }, select: { id: true, title: true, provider: true, docDate: true, createdAt: true, mime: true, data: true, storageKey: true } }) : [];
  for (const d of docs) {
    const sep = pdf.addPage([W, H]);
    sep.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WASH });
    sep.drawText(T("ORIGINAL REPORT · ATTACHED UNCHANGED"), { x: M, y: H / 2 + 40, size: 9, font: med, color: TEAL });
    sep.drawText(T(d.title).slice(0, 60), { x: M, y: H / 2 + 10, size: 22, font: med, color: INK });
    sep.drawText(T(`${d.provider || "Added by the patient"} · ${(d.docDate || d.createdAt).toISOString().slice(0, 10)}`), { x: M, y: H / 2 - 14, size: 11, font: reg, color: INK2 });
    sep.drawText(T("The following pages are the original document as received or scanned. Nothing has been altered."), { x: M, y: H / 2 - 40, size: 9.5, font: reg, color: MUTED });
    try {
      const bytes = await docBytes(d);
      if (d.mime === "application/pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        (await pdf.copyPages(src, src.getPageIndices())).forEach((pg) => pdf.addPage(pg));
      } else if (/image\/(jpeg|png)/.test(d.mime)) {
        const img = d.mime === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const pg = pdf.addPage([W, H]); const s = Math.min((W - 48) / img.width, (H - 48) / img.height);
        pg.drawImage(img, { x: (W - img.width * s) / 2, y: (H - img.height * s) / 2, width: img.width * s, height: img.height * s });
      } else sep.drawText(T("This file type can't be embedded. Open it in My Health Space."), { x: M, y: H / 2 - 60, size: 9.5, font: reg, color: AMBER });
    } catch { sep.drawText(T("This original could not be embedded (it may be protected). Open it in My Health Space."), { x: M, y: H / 2 - 60, size: 9.5, font: reg, color: AMBER }); }
  }

  // Footer on summary pages
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.4, color: LINE });
    pg.drawText(T(`AI-generated patient health summary · not a diagnosis · NEYU Health My Health Space · ${generated}`), { x: M, y: 27, size: 7.5, font: reg, color: MUTED });
    pg.drawText(T(`${i + 1} / ${pages.length}`), { x: W - M - 24, y: 27, size: 7.5, font: reg, color: MUTED });
  });
  return pdf.save();
}
