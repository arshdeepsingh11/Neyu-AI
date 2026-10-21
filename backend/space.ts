// Neyu Health Intelligence — Historian + Analyst.
// Builds one longitudinal picture of the patient from the EXISTING tables
// (no duplicated data), then finds meaningful changes, data coverage and
// information gaps. Every finding carries its evidence (what data, how much,
// from where) and a confidence level. Rules-based on purpose: fast, free,
// predictable and never a diagnosis — AI only words things on top of this.

import { prisma } from "./db";
import { getConsent, readingSourceFilter, parseJSON } from "./patientData";
import { avg, dayKey, addDays, fmtU, type MetricKey } from "@/lib/portal/metrics";
import { PROVIDER_NAMES } from "@/lib/portal/devices";

type P = { id: string; firstName: string; lastName?: string; timezone: string; dateOfBirth?: Date | null };

// NEW · IMPROVED · WORSENED · STABLE · CHANGED · UNKNOWN · INSUFFICIENT_DATA
export type ChangeStatus = "new" | "improved" | "worsened" | "stable" | "changed" | "unknown" | "insufficient";
export type Confidence = "strong" | "limited" | "insufficient";
export interface Evidence { label: string; source?: string; date?: string; go?: string }
export interface ChangeItem { key: string; status: ChangeStatus; area: string; title: string; text: string; go?: string; source?: string; confidence: Confidence; basis: string; evidence: Evidence[] }
export type GapKind = "no_data" | "limited_data" | "outdated_data" | "incomplete_data";
export interface GapItem { area: string; kind: GapKind; text: string; why?: string; action?: { label: string; go: string } }
export type CoverageLevel = "strong" | "good" | "partial" | "limited" | "missing";
export interface Coverage { id: string; label: string; icon: string; level: CoverageLevel; detail: string; go: string }
export interface MapArea { id: string; label: string; icon: string; state: "known" | "partial" | "missing"; fact: string; change?: ChangeStatus; go: string }
export interface StoryEvent { id: string; type: string; date: string; title: string; summary?: string; source?: string; go?: string; icon: string }
export interface StoryMonth { month: string; label: string; events: StoryEvent[]; notes: ChangeItem[] }

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const LAB_SOURCE = (s: string) => s || "Laboratory";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthLabel = (m: string) => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const isoWeek = (d: string) => { const t = new Date(d + "T12:00:00Z"); const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3); const y = t.getUTCFullYear(); const w = 1 + Math.round((t.getTime() - Date.UTC(y, 0, 4)) / 6048e5 - ((new Date(Date.UTC(y, 0, 4)).getUTCDay() + 6) % 7 - 3) / 7); return `${y}-W${String(w).padStart(2, "0")}`; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : typeof v === "string" && v.trim() ? [v.trim()] : []);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// What a metric moving means. dir: 1 higher is better · -1 lower is better · 0 neutral (report as "changed").
const METRICS: { k: MetricKey; area: string; dir: 1 | -1 | 0; min: number; label: string; go: string; unit: string }[] = [
  { k: "steps", area: "Activity", dir: 1, min: 10, label: "average daily steps", go: "trend:steps", unit: "days of step data" },
  { k: "active", area: "Activity", dir: 1, min: 12, label: "active minutes", go: "trend:active", unit: "days of activity data" },
  { k: "sleep", area: "Sleep", dir: 1, min: 5, label: "sleep duration", go: "trend:sleep", unit: "nights of sleep data" },
  { k: "sleepVar", area: "Sleep", dir: -1, min: 25, label: "bedtime variation", go: "trend:sleepVar", unit: "nights of bedtime data" },
  { k: "rhr", area: "Heart", dir: 0, min: 4, label: "resting heart rate", go: "trend:rhr", unit: "days of heart-rate data" },
  { k: "hrv", area: "Heart", dir: 0, min: 8, label: "heart rate variability", go: "trend:hrv", unit: "days of HRV data" },
  { k: "weight", area: "Body", dir: 0, min: 2, label: "weight", go: "myhealth:profile", unit: "weigh-ins" },
];

export async function loadAll(p: P, days = 60) {
  const today = dayKey(new Date(), p.timezone), from = addDays(today, -Math.max(days, 60));
  const c = await getConsent(p.id);
  const [readings, bps, labs, docs, meals, appts, prof, devices, logs, goals, checkIns, profChanges, plan] = await Promise.all([
    prisma.healthReading.findMany({ where: { patientId: p.id, day: { gte: from }, ...readingSourceFilter(c) }, select: { metric: true, day: true, value: true, valueText: true, source: true }, orderBy: { day: "asc" } }),
    prisma.bpReading.findMany({ where: { patientId: p.id, day: { gte: from } }, select: { sys: true, dia: true, day: true, takenAt: true, source: true }, orderBy: { takenAt: "desc" } }),
    c.labs ? prisma.labResult.findMany({ where: { patientId: p.id, status: "final" }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, take: 300, select: { id: true, code: true, name: true, category: true, value: true, valueText: true, unit: true, refLow: true, refHigh: true, refText: true, collectedAt: true, source: true, documentId: true } }) : Promise.resolve([]),
    prisma.healthDocument.findMany({ where: { patientId: p.id, status: "saved" }, orderBy: [{ docDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], select: { id: true, title: true, kind: true, provider: true, docDate: true, source: true, createdAt: true, summary: true, mime: true, extracted: true, pages: true } }),
    prisma.foodLog.findMany({ where: { patientId: p.id, day: { gte: addDays(today, -Math.max(days, 28)) } }, select: { day: true, meal: true, text: true, tags: true, at: true }, orderBy: { at: "desc" } }),
    c.records ? prisma.appointment.findMany({ where: { patientId: p.id }, orderBy: { startsAt: "desc" }, take: 60, select: { id: true, title: true, clinician: true, startsAt: true, status: true } }) : Promise.resolve([]),
    prisma.healthProfile.findUnique({ where: { patientId: p.id }, select: { data: true, updatedAt: true } }),
    prisma.deviceConnection.findMany({ where: { patientId: p.id, status: "connected" }, select: { provider: true } }).catch(() => [] as { provider: string }[]),
    prisma.lifestyleLog.findMany({ where: { patientId: p.id, day: { gte: addDays(today, -Math.max(days, 30)) } }, select: { kind: true, value: true, day: true } }),
    prisma.goal.findMany({ where: { patientId: p.id }, orderBy: { sortOrder: "asc" }, select: { label: true, createdAt: true } }),
    prisma.healthCheckIn.findMany({ where: { patientId: p.id, day: { gte: from } }, orderBy: { day: "desc" }, select: { id: true, day: true, feeling: true, energy: true, sleep: true, stress: true, activity: true, pain: true } }),
    prisma.profileChange.findMany({ where: { patientId: p.id, at: { gte: new Date(Date.now() - Math.max(days, 60) * 864e5) } }, orderBy: { at: "desc" }, take: 60, select: { label: true, oldValue: true, newValue: true, at: true } }),
    prisma.generatedNote.findUnique({ where: { patientId_kind_period: { patientId: p.id, kind: "plan", period: "current" } }, select: { createdAt: true } }),
  ]);
  const profile = parseJSON<Record<string, any>>(prof?.data, {});
  return { today, c, readings, bps, labs, docs, meals, appts, profile, profileUpdatedAt: prof?.updatedAt || null, devices, logs, goals, checkIns, profChanges, plan };
}
export type All = Awaited<ReturnType<typeof loadAll>>;

/** One value per day per metric (several devices can report the same day). */
function daily(a: All, k: MetricKey, fromDay: string, toDay: string) {
  const m = new Map<string, number[]>(), src = new Set<string>();
  a.readings.forEach((r) => { if (r.metric === k && r.day > fromDay && r.day <= toDay) { (m.get(r.day) || m.set(r.day, []).get(r.day)!).push(r.value); src.add(PROVIDER_NAMES[r.source] || r.source); } });
  return { values: [...m.values()].map((v) => avg(v)), days: m.size, sources: [...src] };
}
const labFlag = (l: { value: number | null; refLow: number | null; refHigh: number | null }) =>
  l.value == null ? "" : l.refHigh != null && l.value > l.refHigh ? "above range" : l.refLow != null && l.value < l.refLow ? "below range" : l.refLow != null || l.refHigh != null ? "in range" : "";
const conf = (cur: number, prev: number): Confidence => (cur >= 20 && prev >= 20 ? "strong" : cur >= 5 && prev >= 5 ? "limited" : "insufficient");

// ── ANALYST: meaningful changes (last `win` days vs the `win` days before) ──
export function changes(a: All, win = 30, end = a.today): ChangeItem[] {
  const out: ChangeItem[] = [];
  const m1 = addDays(end, -win), m2 = addDays(end, -2 * win), week = isoWeek(end);
  for (const m of METRICS) {
    const cur = daily(a, m.k, m1, end), prev = daily(a, m.k, m2, m1);
    if (!cur.days && !prev.days) continue;
    const c = conf(cur.days, prev.days);
    const basis = `${plural(cur.days, "day")} in the last ${win} days and ${plural(prev.days, "day")} before`;
    if (c === "insufficient") {
      if (cur.days) out.push({ key: `${m.k}:insufficient`, status: "insufficient", area: m.area, title: cap(m.label), text: `There ${cur.days === 1 ? "is" : "are"} ${cur.days} ${m.unit} so far — not enough history to show a trend yet.`, go: m.go, confidence: c, basis, evidence: [{ label: `${cur.days} ${m.unit} in the last ${win} days`, source: cur.sources.join(", ") }] });
      continue;
    }
    const ca = avg(cur.values), pa = avg(prev.values), d = pct(ca, pa);
    const big = m.k === "rhr" ? Math.abs(ca - pa) >= 3 : m.k === "sleepVar" ? Math.abs(ca - pa) >= 20 && Math.abs(d) >= m.min : Math.abs(d) >= m.min;
    const better = m.dir === 0 ? null : (ca - pa) * m.dir > 0;
    const status: ChangeStatus = !big ? "stable" : better === null ? "changed" : better ? "improved" : "worsened";
    const amount = m.k === "rhr" ? `${Math.abs(Math.round(ca - pa))} bpm` : m.k === "weight" ? `${Math.abs(ca - pa).toFixed(1)} kg` : m.k === "sleepVar" ? `${Math.abs(Math.round(ca - pa))} min` : `${Math.abs(Math.round(d))}%`;
    const text = m.k === "sleepVar"
      ? (!big ? "Your bedtimes have been about as regular as the month before." : ca > pa ? `Your sleep has become less consistent — bedtimes vary about ${amount} more than the month before.` : `Your sleep has become more consistent — bedtimes vary about ${amount} less than the month before.`)
      : big ? `Your ${m.label} ${ca > pa ? "increased" : "decreased"} ${amount} compared with the previous ${win} days (${fmtU(m.k, pa)} → ${fmtU(m.k, ca)}).` : `Your ${m.label} has stayed steady over the last ${win} days (about ${fmtU(m.k, ca)}).`;
    out.push({
      key: `${m.k}:${status}:${week}`, status, area: m.area, title: cap(m.label), text, go: m.go, source: cur.sources.join(", "), confidence: c,
      basis: `Based on ${basis}`,
      evidence: [
        { label: `${m.k === "sleepVar" ? "Bedtime variation" : cap(m.label)}: ${fmtU(m.k, pa)} → ${fmtU(m.k, ca)}`, go: m.go },
        { label: `${cur.days} ${m.unit} in the last ${win} days, ${prev.days} in the ${win} before`, source: cur.sources.join(", ") },
      ],
    });
  }
  // Home blood pressure — reported neutrally (no "better/worse" label).
  const bpC = a.bps.filter((b) => b.day > m1 && b.day <= end), bpP = a.bps.filter((b) => b.day <= m1 && b.day > m2);
  if (bpC.length >= 3 && bpP.length >= 3) {
    const sc = avg(bpC.map((b) => b.sys)), sp = avg(bpP.map((b) => b.sys)), dc = avg(bpC.map((b) => b.dia)), dp = avg(bpP.map((b) => b.dia));
    const diff = Math.round(sc - sp), c = conf(bpC.length, bpP.length) === "insufficient" ? "limited" : conf(bpC.length, bpP.length);
    out.push({
      key: `bp:${Math.abs(diff) < 4 ? "stable" : "changed"}:${week}`, status: Math.abs(diff) < 4 ? "stable" : "changed", area: "Blood pressure", title: "Blood pressure", go: "myhealth:heart", source: "Home readings", confidence: c,
      text: Math.abs(diff) < 4 ? `Your average home blood pressure readings are steady (about ${Math.round(sc)}/${Math.round(dc)}).` : `Your average home blood pressure readings ${diff < 0 ? "decreased" : "increased"} compared with the previous period (${Math.round(sp)}/${Math.round(dp)} → ${Math.round(sc)}/${Math.round(dc)}).`,
      basis: `Based on ${plural(bpC.length, "reading")} in the last ${win} days and ${bpP.length} before`,
      evidence: [{ label: `Average ${Math.round(sp)}/${Math.round(dp)} → ${Math.round(sc)}/${Math.round(dc)} mmHg`, go: "myhealth:heart" }, { label: `${bpC.length} readings now, ${bpP.length} in the previous ${win} days`, source: "Home blood pressure" }],
    });
  } else if (bpC.length) out.push({ key: "bp:insufficient", status: "insufficient", area: "Blood pressure", title: "Blood pressure", text: `There ${bpC.length === 1 ? "is" : "are"} ${plural(bpC.length, "home reading")} this month — a few more weeks of readings will show a trend.`, go: "myhealth:heart", confidence: "insufficient", basis: `${plural(bpC.length, "reading")}`, evidence: [{ label: `${plural(bpC.length, "reading")} in the last ${win} days`, source: "Home blood pressure" }] });

  // Labs: newest value per test in the last 90 days vs the one before.
  const seen = new Set<string>(), since = new Date(end + "T23:59:59Z").getTime() - 90 * 864e5, endMs = new Date(end + "T23:59:59Z").getTime();
  const sig = new Set<string>();
  for (const l of a.labs) {
    // same test from two copies of a report, or two codes for one test → count once
    const g = `${l.name.toLowerCase()}|${l.value ?? l.valueText}|${l.collectedAt?.toISOString().slice(0, 10)}`;
    if (seen.has(l.code) || sig.has(g)) continue; seen.add(l.code); sig.add(g);
    if (!l.collectedAt || l.collectedAt.getTime() < since || l.collectedAt.getTime() > endMs || out.filter((o) => o.area === "Labs").length >= 5) continue;
    const prev = a.labs.find((x) => x.code === l.code && x.id !== l.id && x.collectedAt && x.collectedAt < l.collectedAt!);
    const val = `${l.valueText ?? l.value ?? ""}${l.unit ? " " + l.unit : ""}`, date = l.collectedAt.toISOString().slice(0, 10);
    const ev: Evidence[] = [{ label: `${l.name} ${val} on ${date}${labFlag(l) ? ` (${labFlag(l)})` : ""}`, source: LAB_SOURCE(l.source), date, go: "result:" + l.id }];
    if (!prev || l.value == null || prev.value == null) {
      out.push({ key: `lab:${l.id}:new`, status: "new", area: "Labs", title: l.name, text: `New ${l.name} result: ${val}${labFlag(l) ? ` (${labFlag(l)} for this lab)` : ""}.${prev ? "" : " This is the first recorded result for this test, so there isn't a trend yet."}`, go: "result:" + l.id, source: LAB_SOURCE(l.source), confidence: "insufficient", basis: "1 result", evidence: ev });
      continue;
    }
    const pd = prev.collectedAt!.toISOString().slice(0, 10);
    ev.push({ label: `Previous ${l.name} ${prev.value}${l.unit ? " " + l.unit : ""} on ${pd}`, source: LAB_SOURCE(prev.source), date: pd, go: "result:" + prev.id });
    const wasIn = labFlag(prev) === "in range", isIn = labFlag(l) === "in range";
    const moved = Math.abs(pct(l.value, prev.value)) >= 5;
    out.push({ key: `lab:${l.id}:cmp`, status: wasIn !== isIn || moved ? "changed" : "stable", area: "Labs", title: l.name, go: "result:" + l.id, source: LAB_SOURCE(l.source), confidence: "limited", basis: "2 results",
      text: `${l.name} is ${val} (${date}), compared with ${prev.value}${l.unit ? " " + l.unit : ""} on ${pd}.${wasIn !== isIn ? ` It is now ${isIn ? "within" : "outside"} the lab's reference range.` : ""}`, evidence: ev });
  }
  // New reports
  a.docs.filter((d) => d.createdAt.getTime() > new Date(end + "T23:59:59Z").getTime() - win * 864e5 && d.createdAt.getTime() <= endMs).slice(0, 3).forEach((d) => {
    const dt = (d.docDate || d.createdAt).toISOString().slice(0, 10);
    out.push({ key: `doc:${d.id}`, status: "new", area: "Records", title: d.title, text: `New report added: ${d.title}${d.provider ? ` from ${d.provider}` : ""} (${dt}).`, go: "doc:" + d.id, source: d.provider || "Uploaded document", confidence: "strong", basis: "1 report", evidence: [{ label: `${d.title} · ${dt}`, source: d.provider || "Uploaded document", date: dt, go: "doc:" + d.id }] });
  });
  // Food (weekly pattern)
  const wk = a.meals.filter((f) => f.day > addDays(end, -7) && f.day <= end), pw = a.meals.filter((f) => f.day <= addDays(end, -7) && f.day > addDays(end, -14));
  if (wk.length >= 4) {
    const veg = (xs: typeof wk) => xs.filter((f) => /vegetable|fruit|fibre/.test(f.tags)).length / Math.max(1, xs.length);
    const v = veg(wk), pv = pw.length >= 4 ? veg(pw) : null;
    out.push({ key: `food:${week}`, status: pv == null ? "unknown" : v - pv > 0.1 ? "improved" : pv - v > 0.1 ? "worsened" : "stable", area: "Nutrition", title: "Food", go: "food", source: "Your food log", confidence: wk.length >= 10 ? "strong" : "limited",
      text: `You logged ${wk.length} meals this week; ${Math.round(v * 100)}% included fruit, vegetables or fibre${pv != null ? ` (last week ${Math.round(pv * 100)}%)` : ""}.`, basis: `${wk.length} meals this week${pw.length ? `, ${pw.length} last week` : ""}`,
      evidence: [{ label: `${wk.length} meals logged in the last 7 days`, source: "Food log", go: "food" }] });
  }
  // Weekly check-ins (how the patient says they feel)
  const ci = a.checkIns.filter((x) => x.day > m1 && x.day <= end), cp = a.checkIns.filter((x) => x.day <= m1 && x.day > m2);
  if (ci.length >= 2 && cp.length >= 2) {
    const f1 = avg(ci.map((x) => x.feeling)), f0 = avg(cp.map((x) => x.feeling));
    out.push({ key: `checkin:${week}`, status: Math.abs(f1 - f0) < 0.5 ? "stable" : f1 > f0 ? "improved" : "worsened", area: "Check-ins", title: "How you've been feeling", go: "story", source: "Neyu check-ins", confidence: "limited",
      text: `In your check-ins you rated how you feel ${f1.toFixed(1)}/5 on average, compared with ${f0.toFixed(1)}/5 the month before.`, basis: `${ci.length} check-ins now, ${cp.length} before`, evidence: [{ label: `${ci.length + cp.length} weekly check-ins`, source: "Neyu check-in" }] });
  }
  const order: Record<ChangeStatus, number> = { new: 0, worsened: 1, changed: 2, improved: 3, unknown: 4, stable: 5, insufficient: 6 };
  return out.sort((x, y) => order[x.status] - order[y.status]);
}

// ── Data coverage: how much Neyu knows (NOT how healthy someone is) ──────
export function coverage(a: All): Coverage[] {
  const dayCount = (k: MetricKey, d: number) => daily(a, k, addDays(a.today, -d), a.today).days;
  const lvl = (n: number, s: number, g: number, p: number): CoverageLevel => (n >= s ? "strong" : n >= g ? "good" : n >= p ? "partial" : n > 0 ? "limited" : "missing");
  const yr = Date.now() - 365 * 864e5;
  const labs12 = new Set(a.labs.filter((l) => l.collectedAt && l.collectedAt.getTime() > yr).map((l) => l.code)).size;
  const steps = dayCount("steps", 60), sleep = dayCount("sleep", 60), rhr = dayCount("rhr", 60), weight = dayCount("weight", 180);
  const bp30 = a.bps.filter((b) => b.day > addDays(a.today, -30)).length, meals14 = a.meals.filter((m) => m.day > addDays(a.today, -14)).length;
  const meds = list(a.profile.medications), cond = list(a.profile.conditions), fam = list(a.profile.familyHistory);
  const docsYr = a.docs.filter((d) => (d.docDate || d.createdAt).getTime() > yr).length;
  const outdated = (fresh: number, any: boolean) => (!fresh && any ? " · nothing recent" : "");
  return [
    { id: "heart", label: "Heart", icon: "heartPulse", level: lvl(rhr + bp30 + a.docs.filter((d) => d.kind === "ecg" || d.kind === "cardiology").length * 10, 50, 25, 8), detail: `${rhr} days of heart rate · ${bp30} BP readings this month`, go: "myhealth:heart" },
    { id: "labs", label: "Labs", icon: "flask", level: lvl(labs12, 12, 6, 2), detail: `${labs12} tests in the last 12 months${outdated(labs12, a.labs.length > 0)}`, go: "records:labs" },
    { id: "activity", label: "Activity", icon: "steps", level: lvl(steps, 45, 25, 8), detail: `${steps} of the last 60 days`, go: "trend:steps" },
    { id: "sleep", label: "Sleep", icon: "moon", level: lvl(sleep, 45, 25, 8), detail: `${sleep} of the last 60 nights`, go: "trend:sleep" },
    { id: "nutrition", label: "Nutrition", icon: "apple", level: lvl(meals14, 28, 14, 5), detail: `${meals14} meals in the last 2 weeks`, go: "food" },
    { id: "weight", label: "Weight", icon: "scale", level: weight ? lvl(weight, 20, 8, 3) : a.profile.weightKg ? "limited" : "missing", detail: weight ? `${weight} weigh-ins in 6 months` : a.profile.weightKg ? "One self-reported value" : "No weight on record", go: "myhealth:profile" },
    { id: "meds", label: "Medications", icon: "pill", level: meds.length ? "good" : "missing", detail: meds.length ? `${meds.length} listed by you` : "None listed", go: "myhealth:profile" },
    { id: "history", label: "Medical history", icon: "doc", level: cond.length || list(a.profile.surgeries).length ? "good" : a.appts.length ? "partial" : "missing", detail: cond.length ? `${cond.length} conditions listed` : "No conditions listed", go: "myhealth:profile" },
    { id: "family", label: "Family history", icon: "users", level: fam.length >= 2 ? "good" : fam.length ? "partial" : "missing", detail: fam.length ? `${fam.length} noted` : "Not added", go: "myhealth:profile" },
    { id: "reports", label: "Reports", icon: "folder", level: lvl(docsYr, 6, 3, 1), detail: `${a.docs.length} reports · ${docsYr} this year`, go: "records" },
    { id: "goals", label: "Goals", icon: "target", level: a.goals.length >= 3 ? "good" : a.goals.length ? "partial" : "missing", detail: a.goals.length ? `${a.goals.length} goals` : "No goals set", go: "plan" },
  ];
}

// ── What's missing 2.0: information gaps, never a medical need ───────────
export function gaps(a: All): GapItem[] {
  const g: GapItem[] = [];
  const yr = Date.now() - 365 * 864e5;
  const anyLab = a.labs.length > 0 || a.docs.some((d) => d.kind === "lab");
  const recentLab = a.labs.some((l) => l.collectedAt && l.collectedAt.getTime() > yr) || a.docs.some((d) => d.kind === "lab" && (d.docDate || d.createdAt).getTime() > yr);
  if (!anyLab) g.push({ area: "Labs", kind: "no_data", text: "Your Health Space doesn't contain any blood test results yet.", why: "Lab results let Neyu compare values over time.", action: { label: "Add a report", go: "add" } });
  else if (!recentLab) g.push({ area: "Labs", kind: "outdated_data", text: "The most recent blood test in your Health Space is more than a year old.", action: { label: "Add a report", go: "add" } });
  const wear = a.devices.length || a.readings.some((r) => !["manual", "import"].includes(r.source));
  const steps60 = daily(a, "steps", addDays(a.today, -60), a.today).days, sleep60 = daily(a, "sleep", addDays(a.today, -60), a.today).days;
  if (!wear && !steps60) g.push({ area: "Activity & sleep", kind: "no_data", text: "No wearable or Apple Health is connected, so activity and sleep trends aren't available.", action: { label: "Connect a device", go: "devices" } });
  else if (sleep60 > 0 && sleep60 < 10) g.push({ area: "Sleep", kind: "limited_data", text: `Your Health Space has limited recent sleep data (${sleep60} nights in 60 days).` });
  const bp30 = a.bps.filter((b) => b.day > addDays(a.today, -30)).length;
  if (!a.bps.length) g.push({ area: "Blood pressure", kind: "no_data", text: "No home blood pressure readings have been added yet.", action: { label: "Add a reading", go: "myhealth:heart" } });
  else if (bp30 < 4) g.push({ area: "Blood pressure", kind: "limited_data", text: `There ${bp30 === 1 ? "is" : "are"} only ${plural(bp30, "blood pressure reading")} this month.`, why: "A few readings a week make averages more reliable.", action: { label: "Add a reading", go: "myhealth:heart" } });
  if (!list(a.profile.medications).length) g.push({ area: "Medications", kind: "incomplete_data", text: "Your medication list is empty. If you take any, adding them makes your doctor summary complete.", action: { label: "Update profile", go: "myhealth:profile" } });
  if (!list(a.profile.familyHistory).length) g.push({ area: "Family history", kind: "no_data", text: "Your record doesn't include any family health history yet.", action: { label: "Update profile", go: "myhealth:profile" } });
  if (!a.docs.some((d) => d.kind === "ecg" || d.kind === "cardiology") && !a.readings.some((r) => r.metric === "ecg")) g.push({ area: "Heart", kind: "no_data", text: "No ECG or heart report has been added to your record.", action: { label: "Add a report", go: "add" } });
  const m14 = a.meals.filter((m) => m.day > addDays(a.today, -14)).length;
  if (!m14) g.push({ area: "Nutrition", kind: a.meals.length ? "outdated_data" : "no_data", text: a.meals.length ? "No meals logged in the last two weeks." : "Your Health Space has no nutrition information yet.", action: { label: "Log a meal", go: "food" } });
  else if (m14 < 5) g.push({ area: "Nutrition", kind: "limited_data", text: `Your Health Space has limited recent nutrition information (${m14} meals in 2 weeks).`, action: { label: "Log a meal", go: "food" } });
  if (!a.profile.weightKg && !a.readings.some((r) => r.metric === "weight")) g.push({ area: "Body", kind: "no_data", text: "Your record doesn't include a weight.", action: { label: "Update profile", go: "myhealth:profile" } });
  return g;
}

function map(a: All, ch: ChangeItem[], cov: Coverage[]): MapArea[] {
  const st = (id: string): MapArea["state"] => { const l = cov.find((c) => c.id === id)?.level || "missing"; return l === "strong" || l === "good" ? "known" : l === "missing" ? "missing" : "partial"; };
  const chOf = (area: string) => ch.find((c) => c.area === area && c.status !== "insufficient" && c.status !== "stable")?.status;
  const last = (k: MetricKey) => { const r = [...a.readings].reverse().find((x) => x.metric === k); return r ? fmtU(k, r.value) : ""; };
  const metab = a.labs.filter((l) => /metabolic/i.test(l.category) || /hba1c|glucose|insulin|trig/i.test(l.code + l.name));
  const bpState: MapArea["state"] = a.bps.filter((b) => b.day > addDays(a.today, -30)).length >= 4 ? "known" : a.bps.length ? "partial" : "missing";
  const imaging = a.docs.filter((d) => d.kind === "imaging");
  const area = (id: string, label: string, icon: string, state: MapArea["state"], fact: string, go: string, change?: ChangeStatus): MapArea => ({ id, label, icon, state, fact, go, change });
  const c = (id: string) => cov.find((x) => x.id === id)!;
  return [
    area("heart", "Heart", "heartPulse", st("heart"), a.readings.some((r) => r.metric === "rhr") ? `Resting HR ${last("rhr")}` : c("heart").detail, "myhealth:heart", chOf("Heart")),
    area("bp", "Blood pressure", "gauge", bpState, a.bps.length ? `Latest ${a.bps[0].sys}/${a.bps[0].dia}` : "No readings yet", "myhealth:heart", chOf("Blood pressure")),
    area("metabolic", "Metabolic", "drop", metab.length ? "known" : "missing", metab.length ? `${metab[0].name} ${metab[0].valueText ?? metab[0].value ?? ""} ${metab[0].unit ?? ""}`.trim() : "No glucose or HbA1c results", "records:labs"),
    area("labs", "Labs", "flask", st("labs"), c("labs").detail, "records:labs", chOf("Labs")),
    area("activity", "Activity", "steps", st("activity"), c("activity").detail, "trend:steps", chOf("Activity")),
    area("sleep", "Sleep", "moon", st("sleep"), c("sleep").detail, "trend:sleep", chOf("Sleep")),
    area("nutrition", "Nutrition", "apple", st("nutrition"), c("nutrition").detail, "food", chOf("Nutrition")),
    area("body", "Body", "scale", st("weight"), c("weight").detail, "myhealth:profile", chOf("Body")),
    area("meds", "Medications", "pill", st("meds"), c("meds").detail, "myhealth:profile"),
    area("family", "Family history", "users", st("family"), c("family").detail, "myhealth:profile"),
    area("imaging", "Imaging", "scan", imaging.length ? "known" : "missing", imaging.length ? plural(imaging.length, "report") : "No imaging reports", "records"),
    area("lifestyle", "Lifestyle", "leaf", a.logs.length >= 5 || a.checkIns.length >= 2 ? "known" : a.logs.length || a.checkIns.length || a.profile.exerciseDays != null ? "partial" : "missing", a.logs.length ? `${a.logs.length} check-ins this month` : "No check-ins yet", "myhealth:lifestyle"),
  ];
}

export async function getSpace(p: P) {
  const a = await loadAll(p);
  const ch = changes(a), cov = coverage(a);
  const areas = map(a, ch, cov);
  const sources = new Set<string>();
  a.readings.forEach((r) => sources.add(PROVIDER_NAMES[r.source] || r.source));
  a.labs.forEach((l) => sources.add(LAB_SOURCE(l.source)));
  a.docs.forEach((d) => sources.add(d.provider || "Uploaded documents"));
  if (a.meals.length) sources.add("Your food log");
  if (a.bps.length) sources.add("Home blood pressure");
  if (a.checkIns.length) sources.add("Neyu check-ins");
  return {
    changes: ch, gaps: gaps(a), areas, coverage: cov,
    known: areas.filter((x) => x.state === "known").length,
    counts: { docs: a.docs.length, labs: a.labs.length, meals: a.meals.length, sources: sources.size },
    sources: [...sources].filter((s) => s && s !== "manual"),
  };
}

// ── HISTORIAN: the health story, month by month ─────────────────────────
export async function getHealthStory(p: P, months = 12) {
  const a = await loadAll(p, months * 31 + 31);
  const ev: StoryEvent[] = [];
  const d10 = (d: Date) => d.toISOString().slice(0, 10);
  // Bloodwork: one event per collection date + source
  const groups = new Map<string, typeof a.labs>();
  a.labs.forEach((l) => { if (!l.collectedAt) return; const k = d10(l.collectedAt) + "|" + l.source; (groups.get(k) || groups.set(k, []).get(k)!).push(l); });
  groups.forEach((ls, k) => { const [date, src] = k.split("|"); const flagged = ls.filter((l) => /range/.test(labFlag(l)) && labFlag(l) !== "in range"); ev.push({ id: "lab:" + ls[0].id, type: "LAB_RESULT", date, title: ls.length > 1 ? `Bloodwork added — ${plural(ls.length, "test")}` : `${ls[0].name} result added`, summary: ls.slice(0, 4).map((l) => `${l.name} ${l.valueText ?? l.value ?? ""}${l.unit ? " " + l.unit : ""}`).join(" · ") + (flagged.length ? ` · ${flagged.length} outside the lab's range` : ""), source: LAB_SOURCE(src), go: "result:" + ls[0].id, icon: "flask" }); });
  a.docs.forEach((d) => { if (d.kind === "lab" && a.labs.some((l) => l.documentId === d.id)) return; const date = d10(d.docDate || d.createdAt); ev.push({ id: "doc:" + d.id, type: d.kind === "ecg" ? "ECG" : d.kind === "imaging" ? "IMAGING" : "REPORT", date, title: `${d.title} added`, summary: d.summary ? d.summary.split(/(?<=\.)\s/)[0] : undefined, source: d.provider || "Uploaded document", go: "doc:" + d.id, icon: d.kind === "imaging" ? "scan" : d.kind === "ecg" ? "pulse" : "doc" }); });
  a.appts.filter((x) => x.startsAt.getTime() < Date.now()).forEach((x) => ev.push({ id: "appt:" + x.id, type: "APPOINTMENT", date: d10(x.startsAt), title: x.title, summary: `With ${x.clinician}`, source: "NEYU Health", go: "appointments", icon: "calendar" }));
  a.checkIns.forEach((c) => ev.push({ id: "ci:" + c.id, type: "CHECK_IN", date: c.day, title: "Weekly check-in", summary: `Feeling ${["", "poor", "not great", "okay", "good", "great"][c.feeling]}${c.energy ? ` · energy ${c.energy}/5` : ""}${c.sleep ? ` · sleep ${c.sleep}/5` : ""}${c.stress ? ` · stress ${c.stress}/5` : ""}`, source: "Neyu check-in", icon: "chat" }));
  a.profChanges.forEach((c, i) => ev.push({ id: "pc:" + i, type: "PROFILE", date: d10(c.at), title: `Profile updated: ${c.label}`, summary: c.newValue ? `Now: ${c.newValue}${c.oldValue ? ` (was ${c.oldValue})` : ""}` : `Removed${c.oldValue ? ` (was ${c.oldValue})` : ""}`, source: "Entered by you", go: "myhealth:profile", icon: "user" }));
  if (a.plan) ev.push({ id: "plan", type: "HEALTH_PLAN", date: d10(a.plan.createdAt), title: "AI health plan created", source: "Neyu", go: "plan", icon: "target" });
  a.goals.forEach((g, i) => ev.push({ id: "goal:" + i, type: "GOAL", date: d10(g.createdAt), title: `Goal set: ${g.label}`, source: "Entered by you", go: "plan", icon: "target" }));
  // Device data starts
  const firstBy = new Map<string, string>(); a.readings.forEach((r) => { if (!firstBy.has(r.source)) firstBy.set(r.source, r.day); });
  firstBy.forEach((day, src) => { if (!["manual", "import"].includes(src)) ev.push({ id: "dev:" + src, type: "DEVICE_SYNC", date: day, title: `${PROVIDER_NAMES[src] || src} data starts`, source: PROVIDER_NAMES[src] || src, go: "devices", icon: "watch" }); });
  // Meals summary per month
  const mealsByMonth = new Map<string, number>(), lastMeal = new Map<string, string>();
  a.meals.forEach((m) => { const k = m.day.slice(0, 7); mealsByMonth.set(k, (mealsByMonth.get(k) || 0) + 1); if (!lastMeal.has(k) || m.day > lastMeal.get(k)!) lastMeal.set(k, m.day); });
  // Months
  const cur = a.today.slice(0, 7), out: StoryMonth[] = [];
  let m = cur;
  for (let i = 0; i < months; i++) {
    const end = i === 0 ? a.today : addDays(`${m}-01`, 0).slice(0, 7) + "-" + String(new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0");
    const days = Number(end.slice(8, 10));
    const notes = changes(a, Math.max(days, 14), end).filter((c) => (c.status !== "stable" && c.status !== "insufficient" && c.status !== "unknown") && !["Records", "Labs"].includes(c.area) && c.confidence !== "insufficient").slice(0, 4);
    const events = ev.filter((e) => e.date.slice(0, 7) === m).sort((x, y) => y.date.localeCompare(x.date));
    if (mealsByMonth.get(m)) events.push({ id: "food:" + m, type: "FOOD", date: lastMeal.get(m)!, title: `${plural(mealsByMonth.get(m)!, "meal")} logged this month`, source: "Food log", go: "food", icon: "apple" });
    if (events.length || notes.length) out.push({ month: m, label: monthLabel(m), events, notes });
    const [y, mo] = m.split("-").map(Number); m = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
  }
  // This month at a glance (Monthly Story 2.0)
  const ch = changes(a), cov = coverage(a), gp = gaps(a);
  const thisMonth = out.find((x) => x.month === cur);
  const strongData = cov.filter((c) => c.level === "strong" || c.level === "good").map((c) => c.label.toLowerCase());
  const weakData = cov.filter((c) => c.level === "limited" || c.level === "missing").map((c) => c.label.toLowerCase());
  const glance = {
    month: monthLabel(cur),
    changed: ch.filter((c) => ["changed", "improved", "worsened"].includes(c.status)).slice(0, 3),
    wentWell: ch.filter((c) => c.status === "improved").slice(0, 2),
    newInfo: (thisMonth?.events || []).filter((e) => ["LAB_RESULT", "REPORT", "ECG", "IMAGING", "APPOINTMENT"].includes(e.type)).slice(0, 3),
    noticing: ch.filter((c) => c.status === "worsened" || (c.status === "changed" && c.confidence === "strong")).slice(0, 2),
    data: `${strongData.length ? `Good data for ${strongData.slice(0, 4).join(", ")}` : "Not much data yet"}${weakData.length ? `; limited or missing: ${weakData.slice(0, 4).join(", ")}` : ""}.`,
    next: gp[0]?.action ? { text: gp[0].text, label: gp[0].action.label, go: gp[0].action.go } : a.appts.some((x) => x.startsAt.getTime() > Date.now()) ? { text: "You have an upcoming appointment.", label: "Prepare a Doctor Report", go: "assessment" } : { text: "Review your goals and plan for next month.", label: "Open your plan", go: "plan" },
  };
  return { months: out, glance, totalEvents: ev.length };
}

// ── DOCTOR PREP: Doctor Assessment / Doctor Visit Mode data ──────────────
export async function getAssessment(p: P, days: number) {
  const a = await loadAll(p, days);
  const from = addDays(a.today, -days), fromMs = Date.now() - days * 864e5;
  const avgOf = (k: MetricKey) => { const d = daily(a, k, from, a.today); return d.days ? { avg: fmtU(k, avg(d.values)), days: d.days } : null; };
  const weights = a.readings.filter((r) => r.metric === "weight" && r.day > from);
  const bps = a.bps.filter((b) => b.day > from);
  const labs = (() => { const seen = new Set<string>(); return a.labs.filter((l) => { if (seen.has(l.code) || !l.collectedAt || l.collectedAt.getTime() < fromMs) return false; seen.add(l.code); return true; }); })();
  const wk = a.meals.filter((m) => m.day > from);
  const tagCount = (re: RegExp) => wk.filter((m) => re.test(m.tags)).length;
  const prof = a.profile;
  const age = p.dateOfBirth ? Math.floor((Date.now() - p.dateOfBirth.getTime()) / (365.25 * 864e5)) : null;
  const questions = await prisma.visitQuestion.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" }, take: 8, select: { text: true } }).catch(() => [] as { text: string }[]);
  const ch = changes(a, Math.min(30, Math.max(14, Math.round(days / 3))));
  const pctOf = (n: number) => (wk.length ? Math.round((n / wk.length) * 100) : 0);
  // Eating habits in words
  const breakfastDays = new Set(wk.filter((m) => m.meal === "breakfast").map((m) => m.day)).size, loggedDays = new Set(wk.map((m) => m.day)).size;
  const eating: string[] = [];
  if (prof.diet) eating.push(`Eating pattern: ${prof.diet}.`);
  if (wk.length) {
    eating.push(`${wk.length} meals logged over ${plural(loggedDays, "day")}; ${pctOf(tagCount(/vegetable|fruit/))}% included fruit or vegetables, ${pctOf(tagCount(/protein/))}% protein, ${pctOf(tagCount(/fibre|whole-grain/))}% fibre or whole grains, ${pctOf(tagCount(/processed|sugary|fried/))}% processed, fried or sugary.`);
    if (loggedDays >= 5) eating.push(`Breakfast logged on ${breakfastDays} of ${loggedDays} days.`);
    const common = Object.entries(wk.reduce<Record<string, number>>((m, f) => { f.text.toLowerCase().split(/,| and | with /).map((x) => x.trim()).filter((x) => x.length > 2).forEach((x) => (m[x] = (m[x] || 0) + 1)); return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 4).filter((x) => x[1] > 1).map((x) => x[0]);
    if (common.length) eating.push(`Most often: ${common.join(", ")}.`);
  }
  const alcohol = a.logs.filter((l) => l.kind === "alcohol" && l.day > from).reduce((s, l) => s + l.value, 0);
  if (alcohol) eating.push(`${alcohol} alcoholic drinks logged in this period.`);
  // Physical activity in words
  const act: string[] = [], st = avgOf("steps"), am = avgOf("active"), wo = a.readings.filter((r) => r.metric === "workouts" && r.day > from).reduce((s, r) => s + r.value, 0);
  if (st) act.push(`Average ${st.avg} a day (${st.days} days of data).`);
  if (am) act.push(`Average ${am.avg} of brisk activity a day.`);
  if (wo) act.push(`${Math.round(wo)} workouts recorded.`);
  if (prof.exerciseDays != null) act.push(`Reports exercising ${prof.exerciseDays} days a week${prof.exerciseTypes ? ` (${prof.exerciseTypes})` : ""}.`);
  if (prof.sedentaryHours != null) act.push(`About ${prof.sedentaryHours} h sitting per day (self-reported).`);
  // Check-ins
  const ci = a.checkIns.filter((x) => x.day > from);
  const checkins = ci.length ? `${plural(ci.length, "weekly check-in")}: feeling ${avg(ci.map((x) => x.feeling)).toFixed(1)}/5 on average${ci.some((x) => x.stress) ? `, stress ${avg(ci.filter((x) => x.stress).map((x) => x.stress!)).toFixed(1)}/5` : ""}${ci.some((x) => x.pain) ? `, pain ${avg(ci.filter((x) => x.pain).map((x) => x.pain!)).toFixed(1)}/5` : ""}.` : null;
  // Reports in range — short summaries with dates (from Neyu's earlier reading; no new AI call)
  const reports = a.docs.filter((d) => (d.docDate || d.createdAt).getTime() > fromMs).map((d) => {
    const ex = parseJSON<{ values?: { name: string; value: string; unit?: string; flag?: string }[]; keyPoints?: string[] }>(d.extracted, {});
    const flagged = (ex.values || []).filter((v) => v.flag && v.flag !== "normal").slice(0, 4).map((v) => `${v.name} ${v.value}${v.unit ? " " + v.unit : ""} (${v.flag})`);
    const first = (d.summary || "").split(/(?<=\.)\s/).slice(0, 2).join(" ");
    return { id: d.id, date: (d.docDate || d.createdAt).toISOString().slice(0, 10), title: d.title, kind: d.kind, provider: d.provider, summary: first || (ex.keyPoints || []).slice(0, 2).join(" ") || "Original report attached.", flagged };
  }).sort((x, y) => y.date.localeCompare(x.date));
  const newInfo = [
    ...reports.map((r) => `${r.date} — ${r.title}${r.provider ? ` (${r.provider})` : ""}`),
    ...labs.filter((l) => !l.documentId).map((l) => `${l.collectedAt!.toISOString().slice(0, 10)} — ${l.name} ${l.valueText ?? l.value ?? ""} ${l.unit ?? ""}`.trim()),
  ].slice(0, 10);
  return {
    generatedAt: new Date().toISOString(), days, from,
    patient: { name: `${p.firstName} ${p.lastName || ""}`.trim(), age, sex: prof.sex || null, dob: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null, heightCm: prof.heightCm || null, occupation: prof.occupation || null },
    activity: [
      ["Steps (daily average)", avgOf("steps")], ["Active minutes (daily)", avgOf("active")], ["Active energy (daily)", avgOf("activeEnergy")], ["Sleep (nightly average)", avgOf("sleep")],
      ["Resting heart rate", avgOf("rhr")], ["Heart rate variability", avgOf("hrv")], ["Blood oxygen", avgOf("spo2")],
      ["Home blood pressure", bps.length ? { avg: `${Math.round(avg(bps.map((b) => b.sys)))}/${Math.round(avg(bps.map((b) => b.dia)))} mmHg`, days: bps.length } : null],
      ["Weight", weights.length ? { avg: `${fmtU("weight", weights[0].value)} → ${fmtU("weight", weights[weights.length - 1].value)}`, days: weights.length } : prof.weightKg ? { avg: `${prof.weightKg} kg (self-reported)`, days: 0 } : null],
    ].filter((x) => x[1]).map(([label, v]: any) => ({ label, value: v.avg, n: v.days })),
    labs: labs.map((l) => ({ name: l.name, value: `${l.valueText ?? l.value ?? ""}`, unit: l.unit || "", ref: l.refText || (l.refLow != null || l.refHigh != null ? `${l.refLow ?? ""}–${l.refHigh ?? ""}` : ""), flag: labFlag(l), date: l.collectedAt!.toISOString().slice(0, 10), source: LAB_SOURCE(l.source) })),
    reports, newInfo, eating, physical: act, checkins,
    profileChanges: a.profChanges.filter((c) => c.at.getTime() > fromMs).slice(0, 12).map((c) => ({ date: c.at.toISOString().slice(0, 10), text: `${c.label}: ${c.newValue ?? "removed"}${c.oldValue ? ` (was ${c.oldValue})` : ""}` })),
    history: [
      ...a.appts.filter((x) => x.startsAt.getTime() > fromMs && x.startsAt.getTime() < Date.now()).map((x) => ({ date: x.startsAt.toISOString().slice(0, 10), text: `${x.title} with ${x.clinician}` })),
      ...reports.map((r) => ({ date: r.date, text: `${r.title}${r.provider ? ` — ${r.provider}` : ""}` })),
    ].sort((x, y) => y.date.localeCompare(x.date)),
    conditions: list(prof.conditions), medications: list(prof.medications), allergies: list(prof.allergies), surgeries: list(prof.surgeries), familyHistory: list(prof.familyHistory),
    nutrition: wk.length ? { meals: wk.length, veg: tagCount(/vegetable|fruit/), protein: tagCount(/protein/), fibre: tagCount(/fibre|whole-grain/), processed: tagCount(/processed|sugary|fried/), diet: prof.diet || null } : prof.diet ? { meals: 0, veg: 0, protein: 0, fibre: 0, processed: 0, diet: prof.diet } : null,
    lifestyle: { exerciseDays: prof.exerciseDays ?? null, smoking: prof.smoking || null, alcohol, sleepQuality: prof.sleepQuality ?? null },
    changes: ch.filter((c) => c.status !== "insufficient" && c.status !== "unknown").slice(0, 8),
    goals: a.goals.map((g) => g.label),
    questions: questions.map((q) => q.text),
    documents: a.docs.map((d) => ({ id: d.id, title: d.title, kind: d.kind, provider: d.provider, date: (d.docDate || d.createdAt).toISOString().slice(0, 10), inRange: (d.docDate || d.createdAt).getTime() > fromMs, mime: d.mime, pages: d.pages })),
    sources: [...new Set([...a.readings.map((r) => PROVIDER_NAMES[r.source] || r.source), ...labs.map((l) => LAB_SOURCE(l.source)), ...a.docs.map((d) => d.provider || "Uploaded documents"), ...(wk.length ? ["Patient food log"] : []), ...(bps.length ? ["Home blood pressure monitor"] : []), ...(ci.length ? ["Neyu weekly check-ins"] : []), ...(Object.keys(prof).length ? ["Patient-entered health profile"] : [])])].filter((s) => s && s !== "manual"),
  };
}
export type Assessment = Awaited<ReturnType<typeof getAssessment>>;

// ── Usage (what the patient looks at) — for Neyu's context ─────────────────
export async function usageSummary(patientId: string): Promise<string> {
  const ev = await prisma.activityEvent.findMany({ where: { patientId, at: { gte: new Date(Date.now() - 14 * 864e5) } }, orderBy: { at: "desc" }, take: 400, select: { kind: true, target: true, ms: true, at: true } });
  if (!ev.length) return "";
  const time = new Map<string, number>();
  ev.filter((e) => e.kind === "view").forEach((e) => time.set(e.target, (time.get(e.target) || 0) + e.ms));
  const top = [...time.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, ms]) => `${t} ${Math.max(1, Math.round(ms / 60000))} min`);
  const clicks = ev.filter((e) => e.kind === "click").slice(0, 10).map((e) => e.target);
  return `How the patient used My Health Space (last 14 days): most time on ${top.join(", ")}${clicks.length ? `. Recent actions: ${[...new Set(clicks)].join("; ")}` : ""}.`;
}
