// My Health Space — read models. Every screen's data is assembled here with
// narrow `select`s and indexed queries; routes and the server page only call
// these functions. Nothing here invents data: when a source is empty the
// DTO says so and the UI shows the prototype's empty state.

import { prisma } from "@backend/db";
import { METRIC_DEFS, isMetricKey, TREND_CATS, avg, fmt, fmtU, dayKey, addDays, daysBetween, fmtDay, type MetricKey } from "@/lib/portal/metrics";
import { DEVICE_CATALOG, PROVIDER_NAMES, WEARABLE_SOURCES, sharedLabels } from "@/lib/portal/devices";
import { physicians } from "@/data/physicians";
import type {
  ProfileDTO, TodayDTO, TrendsDTO, Series, ResultsDTO, ResultDTO, ProtocolDTO, HistoryItemDTO, HistoryDetailDTO,
  AppointmentsDTO, AppointmentDTO, ReferralDTO, DeviceDTO, SettingsDTO, SignalDTO, InsightDTO, DayItemDTO,
} from "@/lib/portal/types";

type Tz = string;
export const parseJSON = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; } };

const SOURCE_PRIORITY = ["apple", "oura", "whoop", "withings", "garmin", "fitbit", "android", "iphone", "gfit", "clinic", "manual", "import"];
// "Dr. Anmol Singh Kapoor" → "AK", "Maya Chen, NP" → "MC" (first + last name).
const initials = (name: string) => {
  const w = name.replace(/^Dr\.?\s*/i, "").split(",")[0].split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

function parts(d: Date, timeZone: Tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", hour12: false, year: "numeric" });
  const o: Record<string, string> = {};
  f.formatToParts(d).forEach((p) => (o[p.type] = p.value));
  return { weekday: o.weekday, month: o.month, day: Number(o.day), year: Number(o.year), hour: Number(o.hour) % 24 };
}
const timeLabel = (d: Date, timeZone: Tz) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
const longDate = (d: Date, timeZone: Tz) => new Intl.DateTimeFormat("en-US", { timeZone, month: "long", day: "numeric", year: "numeric" }).format(d);

export function relTime(d: Date | null): string {
  if (!d) return "never";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

// ── Consent (Privacy & Data) ─────────────────────────────────────────────
// A source that is switched off contributes nothing to any screen or to
// Neyu. Data is kept (not deleted) so switching back on restores it.
type Consent = { wearables: boolean; labs: boolean; records: boolean };
export async function getConsent(patientId: string): Promise<Consent> {
  const s = await prisma.patientSettings.findUnique({ where: { patientId }, select: { shareWearables: true, shareLabs: true, shareRecords: true } });
  return { wearables: s?.shareWearables ?? true, labs: s?.shareLabs ?? true, records: s?.shareRecords ?? true };
}
/** Reading sources allowed by consent (clinic-entered values are clinical records). */
export const readingSourceFilter = (c: Consent) => {
  const allowed = [...(c.wearables ? WEARABLE_SOURCES : []), "manual", "import", ...(c.records ? ["clinic"] : [])];
  return { source: { in: allowed } };
};

// ── Settings & profile ──────────────────────────────────────────────────
export async function getSettings(patientId: string): Promise<SettingsDTO> {
  const s = await prisma.patientSettings.upsert({ where: { patientId }, update: {}, create: { patientId } });
  const { shareWearables, shareLabs, shareRecords, albaAccess, learnUsage, aiInsights, notifDaily, notifWorth, notifProtocol, notifAppt, city, province, briefEmail, leaderboardName } = s;
  return { shareWearables, shareLabs, shareRecords, albaAccess, learnUsage, aiInsights, notifDaily, notifWorth, notifProtocol, notifAppt, city, province, briefEmail, leaderboardName };
}

export async function getProfile(patientId: string): Promise<ProfileDTO> {
  const consent = await getConsent(patientId);
  const p = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, createdAt: true, timezone: true, photoVersion: true,
      goals: { select: { label: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      careTeam: { select: { id: true, name: true, role: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { devices: { where: { status: "connected" } } } },
    },
  });
  let age: number | null = null;
  if (p.dateOfBirth) {
    const now = new Date(), b = p.dateOfBirth;
    age = now.getUTCFullYear() - b.getUTCFullYear() - (now.getUTCMonth() < b.getUTCMonth() || (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate()) ? 1 : 0);
  }
  return {
    id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null, age,
    memberSince: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: p.timezone }).format(p.createdAt),
    timezone: p.timezone,
    photoUrl: p.photoVersion > 0 ? `/api/portal/avatar?v=${p.photoVersion}` : null,
    goals: p.goals.map((g) => g.label),
    careTeam: (consent.records ? p.careTeam : []).map((c) => ({ id: c.id, init: initials(c.name), name: c.name, role: c.role })),
    connectedDevices: p._count.devices,
  };
}

// ── Health readings → daily series ──────────────────────────────────────
type SeriesMap = Map<MetricKey, Map<string, { v: number; text: string | null; source: string; at: Date }>>;

async function loadSeries(patientId: string, fromDay: string, consent: Consent, metrics?: MetricKey[]): Promise<SeriesMap> {
  const rows = await prisma.healthReading.findMany({
    where: { patientId, day: { gte: fromDay }, ...readingSourceFilter(consent), ...(metrics ? { metric: { in: metrics } } : {}) },
    select: { metric: true, day: true, value: true, valueText: true, source: true, recordedAt: true },
    orderBy: { day: "asc" },
  });
  const map: SeriesMap = new Map();
  for (const r of rows) {
    const m = r.metric as MetricKey;
    if (!map.has(m)) map.set(m, new Map());
    const byDay = map.get(m)!;
    const cur = byDay.get(r.day);
    if (!cur || SOURCE_PRIORITY.indexOf(r.source) < SOURCE_PRIORITY.indexOf(cur.source)) {
      byDay.set(r.day, { v: r.value, text: r.valueText, source: r.source, at: r.recordedAt });
    }
  }
  // Sleep consistency derived from bedtimes when the source doesn't send it:
  // std-dev of the last 7 bedtimes (min 3), in minutes.
  const bed = map.get("bedtime");
  if (bed && !map.get("sleepVar")?.size) {
    const out = new Map<string, { v: number; text: null; source: string; at: Date }>();
    const days = [...bed.keys()].sort();
    days.forEach((d) => {
      const win = days.filter((x) => x <= d && daysBetween(x, d) < 7).map((x) => ((bed.get(x)!.v - 1080 + 1440) % 1440));
      if (win.length >= 3) {
        const a = avg(win);
        out.set(d, { v: Math.sqrt(avg(win.map((x) => (x - a) ** 2))), text: null, source: bed.get(d)!.source, at: bed.get(d)!.at });
      }
    });
    map.set("sleepVar", out);
  }
  return map;
}

const seriesOf = (map: SeriesMap, k: MetricKey): Series => [...(map.get(k)?.entries() || [])].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, x]) => [d, x.v]);
const valuesBetween = (s: Series, from: string, to: string) => s.filter(([d]) => d >= from && d <= to).map(([, v]) => v);

// ── Today ────────────────────────────────────────────────────────────────
export async function getToday(patient: { id: string; firstName: string; timezone: string }): Promise<TodayDTO> {
  const tz = patient.timezone, now = new Date(), today = dayKey(now, tz), p = parts(now, tz);
  const c = await getConsent(patient.id);
  const none = Promise.resolve(0), noAppt = Promise.resolve(null), NONE = { id: { in: [] as string[] } };
  const [map, devices, protocolItems, logsToday, nextAppt, labCount, riskCount, careCount, historyCount] = await Promise.all([
    loadSeries(patient.id, addDays(today, -65), c),
    prisma.deviceConnection.findMany({ where: { patientId: patient.id, status: "connected", ...(c.wearables ? {} : NONE) }, select: { provider: true, lastSyncAt: true } }),
    prisma.protocolItem.findMany({ where: { patientId: patient.id, active: true, ...(c.records ? {} : NONE) }, select: { id: true, title: true, timeOfDay: true, slot: true }, orderBy: { sortOrder: "asc" } }),
    prisma.protocolLog.findMany({ where: { patientId: patient.id, day: today }, select: { itemId: true } }),
    !c.records ? noAppt : prisma.appointment.findFirst({ where: { patientId: patient.id, status: "scheduled", startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, select: { id: true, clinician: true, startsAt: true, title: true } }),
    !c.labs ? none : prisma.labResult.count({ where: { patientId: patient.id } }),
    prisma.longevityAssessment.count({ where: { patientId: patient.id } }),
    !c.records ? none : prisma.careTeamMember.count({ where: { patientId: patient.id } }),
    prisma.symptomCheckLog.count({ where: { patientId: patient.id } }),
  ]);

  const has = (k: MetricKey, days = 30) => valuesBetween(seriesOf(map, k), addDays(today, -days), today).length > 0;
  const hasWearable = devices.length > 0 && (["rhr", "hrv", "sleep", "steps"] as MetricKey[]).some((k) => has(k, 30));
  const doneSet = new Set(logsToday.map((l) => l.itemId));

  const greeting = `Good ${p.hour < 12 ? "morning" : p.hour < 17 ? "afternoon" : "evening"}, ${patient.firstName}`;
  const dateLabel = `${p.weekday}, ${p.month} ${p.day}`;
  const lastSync = devices.reduce<Date | null>((a, d) => (d.lastSyncAt && (!a || d.lastSyncAt > a) ? d.lastSyncAt : a), null);

  // Latest value within the last 2 days
  const latest = (k: MetricKey) => { const s = seriesOf(map, k); const l = s[s.length - 1]; return l && daysBetween(l[0], today) <= 1 ? l : null; };
  const rhrS = seriesOf(map, "rhr"), hrvS = seriesOf(map, "hrv"), sleepS = seriesOf(map, "sleep"), stepsS = seriesOf(map, "steps");

  const signals: SignalDTO[] = [];
  let picture: TodayDTO["picture"] = null;
  const insights: InsightDTO[] = [];

  if (hasWearable) {
    const rhr = latest("rhr"), hrv = latest("hrv"), sl = latest("sleep"), st = latest("steps");
    if (rhr) {
      const prev7 = avg(valuesBetween(rhrS, addDays(rhr[0], -7), addDays(rhr[0], -1)));
      const diff = Math.round(rhr[1] - prev7);
      signals.push({ k: "rhr", label: "Resting HR", value: fmt("rhr", rhr[1]), unit: "bpm", note: isNaN(prev7) ? "Your latest reading" : diff === 0 ? "Same as your 7-day average" : `${diff < 0 ? "↓" : "↑"} ${Math.abs(diff)} bpm vs 7-day average` });
    }
    if (hrv) {
      const cur = avg(valuesBetween(hrvS, addDays(today, -29), today)), prev = avg(valuesBetween(hrvS, addDays(today, -59), addDays(today, -30)));
      const pct = Math.round(((cur - prev) / prev) * 100);
      signals.push({ k: "hrv", label: "HRV", value: fmt("hrv", hrv[1]), unit: "ms", note: isNaN(pct) || !isFinite(pct) ? "Your latest reading" : pct === 0 ? "Steady this month" : `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% this month` });
    }
    if (sl) signals.push({ k: "sleep", label: "Sleep", value: fmt("sleep", sl[1]), unit: "", note: sl[1] >= 7 ? "Good" : sl[1] >= 6 ? "A little short" : "Short" });
    if (st) {
      const usual = avg(valuesBetween(stepsS, addDays(st[0], -30), addDays(st[0], -1)));
      const r = st[1] / usual;
      signals.push({ k: "steps", label: "Activity", value: fmt("steps", st[1]), unit: "steps", note: isNaN(r) ? "Today so far" : r > 1.15 ? "More than your usual day" : r < 0.85 ? "Less than your usual day" : "Similar to your usual day" });
    }

    // Today's picture — plain-language reading, never a diagnosis.
    const rhr30 = avg(valuesBetween(rhrS, addDays(today, -30), addDays(today, -1)));
    const sleep7 = avg(valuesBetween(sleepS, addDays(today, -7), addDays(today, -1)));
    const hrv7 = avg(valuesBetween(hrvS, addDays(today, -7), today)), hrv30 = avg(valuesBetween(hrvS, addDays(today, -30), today));
    const bits: string[] = [];
    if (!isNaN(hrv7) && !isNaN(hrv30)) bits.push(hrv7 >= hrv30 * 0.95 ? "Your recovery is steady" : "Your recovery is a little lower than usual");
    if (sl && !isNaN(sleep7)) bits.push(sl[1] >= sleep7 + 0.1 ? "sleep is slightly better than your 7-day average" : sl[1] <= sleep7 - 0.25 ? "sleep was shorter than your 7-day average" : "sleep is close to your 7-day average");
    if (rhr && !isNaN(rhr30)) bits.push(Math.abs(rhr[1] - rhr30) <= 3 ? "your resting heart rate is stable" : rhr[1] > rhr30 ? "your resting heart rate is a little higher than usual" : "your resting heart rate is lower than usual");
    const watch = (rhr && !isNaN(rhr30) && rhr[1] - rhr30 > 5) || (sl && sl[1] < 5.5);
    if (bits.length) {
      const text = bits.length > 1 ? bits.slice(0, -1).join(", ") + ", and " + bits[bits.length - 1] + "." : bits[0] + ".";
      picture = watch
        ? { status: "Worth watching", headline: "Take it a little easier today.", text: text.charAt(0).toUpperCase() + text.slice(1) }
        : { status: "Steady", headline: "You're doing well today.", text: text.charAt(0).toUpperCase() + text.slice(1) };
    }

    // Insight 1 — resting HR below 30-day average for N consecutive days (N ≥ 3)
    if (!isNaN(rhr30)) {
      let n = 0;
      for (let i = rhrS.length - 1; i >= 0 && daysBetween(rhrS[i][0], today) <= n + 1; i--) { if (rhrS[i][1] < rhr30) n++; else break; }
      if (n >= 3) insights.push({ tone: "lavender", eyebrow: "A small change worth noticing", metric: "rhr", cta: "See trend",
        text: `Your resting heart rate has stayed below your 30-day average for the last ${n} days.`,
        detail: "Resting heart rate often drifts a few beats with sleep, stress, hydration and training load. A lower run like this is usually associated with good recovery. One stretch of days is a pattern to watch, not a conclusion.",
        source: `Based on ${PROVIDER_NAMES[rhrS.length ? map.get("rhr")!.get(rhrS[rhrS.length - 1][0])!.source : "apple"]} · last 30 days` });
      else if (!isNaN(hrv7) && !isNaN(hrv30) && hrv7 > hrv30 * 1.06) insights.push({ tone: "lavender", eyebrow: "A small change worth noticing", metric: "hrv", cta: "See trend",
        text: "Your HRV has been above your 30-day average this week.",
        detail: "HRV is very personal, so your own trend matters more than any single number. A higher run is usually associated with good recovery.", source: "Based on your wearable · last 30 days" });
    }
    // Insight 2 — sleep below usual range for ≥3 nights before last night
    const usual = valuesBetween(sleepS, addDays(today, -30), addDays(today, -1));
    if (usual.length >= 10) {
      const sorted = [...usual].sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * 0.25)], hi = sorted[Math.floor(sorted.length * 0.75)];
      const before = sleepS.filter(([d]) => d < (sl ? sl[0] : today)).slice(-3);
      if (before.length === 3 && before.every(([, v]) => v < lo)) {
        const rh = (x: number) => { const t = Math.round((x * 60) / 15) * 15, h = Math.floor(t / 60), m = t % 60; return m ? `${h}h ${m}m` : `${h}h`; };
        insights.push({ tone: "peach", eyebrow: "Worth knowing", metric: "sleep", cta: "View sleep trend",
          text: `${sl ? "Before last night, your" : "Your"} sleep duration was below your usual range for 3 nights.`,
          stats: [{ label: "Your recent average", value: fmt("sleep", avg(before.map(([, v]) => v))) }, { label: "Your usual range", value: `${rh(lo)}–${rh(hi)}` }] });
      }
    }
  }

  // Your day — real events only, in time order.
  const dayItems: (DayItemDTO & { sort: number })[] = [];
  const minutes = (d: Date) => { const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).split(":").map(Number); return h * 60 + m; };
  const nowMin = minutes(now);
  const sleepToday = map.get("sleep")?.get(today), rhrToday = map.get("rhr")?.get(today), stepsToday = map.get("steps")?.get(today);
  if (sleepToday) dayItems.push({ time: timeLabel(sleepToday.at, tz), title: "Sleep completed", value: fmt("sleep", sleepToday.v), done: true, sort: minutes(sleepToday.at) });
  if (rhrToday) dayItems.push({ time: timeLabel(rhrToday.at, tz), title: "Resting heart rate", value: fmtU("rhr", rhrToday.v), done: true, sort: minutes(rhrToday.at) });
  if (stepsToday) dayItems.push({ time: timeLabel(stepsToday.at, tz), title: "Activity", value: `${fmt("steps", stepsToday.v)} steps`, done: true, sort: minutes(stepsToday.at) });
  const slotMin: Record<string, number> = { Morning: 540, Midday: 750, Evening: 1170 };
  protocolItems.forEach((it) => {
    const m = it.timeOfDay ? Number(it.timeOfDay.slice(0, 2)) * 60 + Number(it.timeOfDay.slice(3, 5)) : slotMin[it.slot] ?? 720;
    const h = Math.floor(m / 60), label = `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    const done = doneSet.has(it.id);
    dayItems.push({ time: label, title: it.title, value: done ? "Completed" : m > nowMin ? "Upcoming" : "Not yet", done, sort: m });
  });
  if (nextAppt && dayKey(nextAppt.startsAt, tz) === today) dayItems.push({ time: timeLabel(nextAppt.startsAt, tz), title: nextAppt.title, value: nextAppt.clinician, done: false, sort: minutes(nextAppt.startsAt) });
  dayItems.sort((a, b) => a.sort - b.sort);

  let nextStep: TodayDTO["nextStep"] = null;
  if (nextAppt) {
    const d = daysBetween(today, dayKey(nextAppt.startsAt, tz));
    nextStep = { kind: "appointment", appointmentId: nextAppt.id, text: `Your appointment with ${nextAppt.clinician} is ${d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}.` };
  } else if (riskCount === 0) nextStep = { kind: "assessment", text: "Complete your Health Risk Assessment to add your risk factors to your health picture." };

  const areas = [
    { label: "Heart", on: has("rhr") || has("hrv") || has("spo2") }, { label: "Sleep", on: has("sleep") }, { label: "Recovery", on: has("hrv") },
    { label: "Activity", on: has("steps") || has("active") }, { label: "Labs", on: labCount > 0 }, { label: "Nutrition", on: false },
    { label: "Protocol", on: protocolItems.length > 0 }, { label: "Risk", on: riskCount > 0 },
  ];
  const sources = [
    ...devices.map((d) => ({ label: PROVIDER_NAMES[d.provider] || d.provider, icon: DEVICE_CATALOG.find((x) => x.id === d.provider)?.icon || "ph ph-watch" })),
    ...(historyCount + riskCount > 0 || nextAppt ? [{ label: "NEYU", icon: "ph ph-first-aid-kit" }] : []),
    ...(labCount > 0 ? [{ label: "BioAro Labs", icon: "ph ph-flask" }] : []),
    ...(careCount > 0 ? [{ label: "Your care team", icon: "ph ph-users" }] : []),
  ];

  return {
    dateLabel, greeting, hasWearable, syncLabel: hasWearable ? `Updated ${relTime(lastSync)}` : null, picture, signals, insights, nextStep,
    dayItems: dayItems.map(({ sort, ...d }) => d), areas, sources,
  };
}

// ── Trends ──────────────────────────────────────────────────────────────
export async function getTrends(patient: { id: string; timezone: string }): Promise<TrendsDTO> {
  const today = dayKey(new Date(), patient.timezone);
  const map = await loadSeries(patient.id, addDays(today, -729), await getConsent(patient.id));
  const series: TrendsDTO["series"] = {}, sources: TrendsDTO["sources"] = {};
  (Object.keys(METRIC_DEFS) as MetricKey[]).filter((k) => METRIC_DEFS[k].chart).forEach((k) => {
    const s = seriesOf(map, k);
    if (s.length) { series[k] = s.map(([d, v]) => [d, Math.round(v * 100) / 100]); sources[k] = PROVIDER_NAMES[map.get(k)!.get(s[s.length - 1][0])!.source] || "Wearable"; }
  });
  const last = (k: MetricKey) => { const m = map.get(k); if (!m?.size) return null; const d = [...m.keys()].sort().pop()!; return { day: d, ...m.get(d)! }; };
  const rows: TrendsDTO["rows"] = { heart: [], recovery: [], activity: [] };
  const ecg = last("ecg"); if (ecg) rows.heart.push({ icon: "ph ph-heartbeat", name: "ECG", sub: `Recorded ${fmtDay(ecg.day)} · ${PROVIDER_NAMES[ecg.source] || ecg.source}`, value: ecg.text || "Recorded" });
  const bp = last("bp"); if (bp) rows.heart.push({ icon: "ph ph-drop", name: "Blood pressure", sub: `${bp.source === "clinic" ? "Entered" : "Recorded"} ${fmtDay(bp.day)}${bp.source === "clinic" ? " at clinic" : ` · ${PROVIDER_NAMES[bp.source] || bp.source}`}`, value: bp.text || `${Math.round(bp.v)}` });
  const tib = last("timeInBed"); if (tib && daysBetween(tib.day, today) <= 1) rows.recovery.push({ icon: "ph ph-bed", name: "Time in bed", sub: "Last night", value: fmt("timeInBed", tib.v) });
  const wk = valuesBetween(seriesOf(map, "workouts"), addDays(today, -6), today); if (wk.length) rows.activity.push({ icon: "ph ph-person-simple-run", name: "Workouts", sub: "This week", value: String(Math.round(wk.reduce((a, b) => a + b, 0))) });
  const en = map.get("activeEnergy")?.get(today); if (en) rows.activity.push({ icon: "ph ph-fire", name: "Active energy", sub: "Today, where available", value: `${Math.round(en.v)} kcal` });
  return { today, series, sources, rows };
}

// ── Results ─────────────────────────────────────────────────────────────
export async function getResults(patient: { id: string; timezone: string }): Promise<ResultsDTO> {
  if (!(await getConsent(patient.id)).labs) return { latestLabel: null, results: [] };
  const rows = await prisma.labResult.findMany({ where: { patientId: patient.id }, orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] });
  const byCode = new Map<string, typeof rows>();
  rows.forEach((r) => { if (!byCode.has(r.code)) byCode.set(r.code, []); byCode.get(r.code)!.push(r); });
  const results: ResultDTO[] = [];
  let latest: Date | null = null, latestSource = "";
  byCode.forEach((list) => {
    const finals = list.filter((r) => r.status === "final");
    const cur = finals[0] || list[0];
    if (cur.status === "final" && cur.collectedAt && (!latest || cur.collectedAt > latest)) { latest = cur.collectedAt; latestSource = cur.source; }
    const inRange = cur.value == null || (cur.refLow == null && cur.refHigh == null) ? null : (cur.refLow == null || cur.value >= cur.refLow) && (cur.refHigh == null || cur.value <= cur.refHigh);
    results.push({
      id: cur.id, code: cur.code, name: cur.name, fullName: cur.fullName, category: cur.category, value: cur.value, valueText: cur.valueText, unit: cur.unit,
      refLow: cur.refLow, refHigh: cur.refHigh, refText: cur.refText, inRange, collectedAt: cur.collectedAt?.toISOString() ?? null, source: cur.source,
      about: cur.about, guidance: cur.guidance, pending: cur.status !== "final", expectedAt: cur.expectedAt?.toISOString() ?? null,
      history: finals.filter((r) => r.value != null && r.collectedAt).map((r) => ({ date: r.collectedAt!.toISOString(), value: r.value! })).reverse(),
    });
  });
  results.sort((a, b) => Number(a.pending) - Number(b.pending) || (b.collectedAt || "").localeCompare(a.collectedAt || ""));
  return { latestLabel: latest ? `${longDate(latest, patient.timezone)} · ${latestSource}` : null, results };
}

// ── Protocol ────────────────────────────────────────────────────────────
export async function getProtocol(patient: { id: string; timezone: string }): Promise<ProtocolDTO> {
  const today = dayKey(new Date(), patient.timezone);
  if (!(await getConsent(patient.id)).records) return { streak: 0, items: [] };
  const [items, logs] = await Promise.all([
    prisma.protocolItem.findMany({ where: { patientId: patient.id, active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.protocolLog.findMany({ where: { patientId: patient.id, day: { gte: addDays(today, -120) } }, select: { itemId: true, day: true } }),
  ]);
  const perDay = new Map<string, Set<string>>();
  logs.forEach((l) => { if (!perDay.has(l.day)) perDay.set(l.day, new Set()); perDay.get(l.day)!.add(l.itemId); });
  // Consistency streak: consecutive days (ending today, or yesterday if today
  // isn't finished yet) where every active step was completed.
  const ids = items.map((i) => i.id);
  const complete = (d: string) => ids.length > 0 && ids.every((id) => perDay.get(d)?.has(id));
  let streak = 0, d = complete(today) ? today : addDays(today, -1);
  while (complete(d) && streak < 120) { streak++; d = addDays(d, -1); }
  return {
    streak,
    items: items.map((i) => ({ id: i.id, slot: i.slot, title: i.title, dose: i.dose, source: i.source, timeOfDay: i.timeOfDay, sections: parseJSON(i.sections, []), guidance: i.guidance, doneToday: !!perDay.get(today)?.has(i.id) })),
  };
}

// ── History ─────────────────────────────────────────────────────────────
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function getHistory(patientId: string): Promise<HistoryItemDTO[]> {
  const take = 100;
  const c = await getConsent(patientId);
  const [sym, convs, assess, labChecks, refs, labs, protos, appts] = await Promise.all([
    prisma.symptomCheckLog.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take, select: { id: true, description: true, urgency: true, recommendedDiscipline: true, emergency: true, createdAt: true } }),
    prisma.albaConversation.findMany({ where: { patientId, messages: { some: { role: "user" } } }, orderBy: { createdAt: "desc" }, take,
      select: { id: true, createdAt: true, messages: { where: { role: "user" }, orderBy: { createdAt: "asc" }, take: 1, select: { text: true } }, _count: { select: { messages: true } } } }),
    prisma.longevityAssessment.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, suggestedNextStep: true } }),
    prisma.labResultCheck.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, overallSummary: true } }),
    prisma.referralSubmission.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, specialties: true, status: true, referringPhysician: true } }),
    prisma.labResult.findMany({ where: { patientId, status: "final", collectedAt: { not: null } }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, take: 300, select: { id: true, collectedAt: true, panel: true, source: true, name: true } }),
    prisma.protocolItem.findMany({ where: { patientId }, orderBy: { startedAt: "desc" }, take, select: { id: true, title: true, source: true, startedAt: true } }),
    prisma.appointment.findMany({ where: { patientId, startsAt: { lte: new Date() } }, orderBy: { startsAt: "desc" }, take, select: { id: true, title: true, clinician: true, startsAt: true, status: true } }),
  ]);
  const out: HistoryItemDTO[] = [];
  sym.forEach((s) => out.push({ id: "s" + s.id, ref: { type: "symptom", id: s.id }, kind: "ai symptom", type: "AI Symptom Check", ai: true, icon: "ph ph-sparkle", go: null, at: s.createdAt.toISOString(),
    title: "Topic: " + clip(s.description, 60), sub: s.emergency ? "Guidance: urgent care advised" : `Guidance: ${s.urgency}${s.recommendedDiscipline ? " · " + s.recommendedDiscipline : ""}` }));
  convs.forEach((c) => out.push({ id: "c" + c.id, ref: { type: "alba", id: c.id }, kind: "ai", type: "Neyu conversation", ai: true, icon: "ph ph-sparkle", go: null, at: c.createdAt.toISOString(),
    title: "Topic: " + clip(c.messages[0]?.text || "Conversation", 60), sub: `${c._count.messages} messages` }));
  assess.forEach((a) => out.push({ id: "a" + a.id, ref: { type: "assessment", id: a.id }, kind: "assessments", type: "Assessment", ai: false, icon: "ph ph-clipboard-text", go: null, at: a.createdAt.toISOString(),
    title: "Risk Assessment completed", sub: "Health Risk Assessment" }));
  labChecks.forEach((l) => out.push({ id: "l" + l.id, ref: { type: "labcheck", id: l.id }, kind: "ai", type: "Lab Result Explainer", ai: true, icon: "ph ph-sparkle", go: null, at: l.createdAt.toISOString(),
    title: "Topic: Understanding lab results", sub: clip(l.overallSummary, 80) }));
  refs.forEach((r) => { const sp = parseJSON<string[]>(r.specialties, []); out.push({ id: "r" + r.id, ref: { type: "referral", id: r.id }, kind: "referrals", type: "Referral", ai: false, icon: "ph ph-arrows-split", go: "referrals", at: r.createdAt.toISOString(),
    title: `${sp[0] || "Specialist"} referral ${r.status === "received" ? "received" : r.status}`, sub: r.referringPhysician ? `From ${r.referringPhysician}` : "Referral Centre" }); });
  const panels = new Map<string, { at: Date; panel: string; source: string; n: number; id: string }>();
  labs.forEach((l) => { const k = l.collectedAt!.toISOString().slice(0, 10) + (l.panel || ""); const p = panels.get(k); if (p) p.n++; else panels.set(k, { at: l.collectedAt!, panel: l.panel || "Laboratory results", source: l.source, n: 1, id: l.id }); });
  panels.forEach((p) => out.push({ id: "p" + p.id, ref: { type: "labs", id: p.id }, kind: "results", type: "Lab results received", ai: false, icon: "ph ph-flask", go: "results", at: p.at.toISOString(),
    title: p.panel, sub: `${p.source} · ${p.n} result${p.n === 1 ? "" : "s"}` }));
  protos.forEach((p) => out.push({ id: "x" + p.id, ref: { type: "protocol", id: p.id }, kind: "protocols", type: "Protocol", ai: false, icon: "ph ph-check-circle", go: "protocol", at: p.startedAt.toISOString(),
    title: `${p.title} started`, sub: `Added by ${p.source}` }));
  appts.forEach((a) => out.push({ id: "v" + a.id, ref: { type: "appointment", id: a.id }, kind: "visits", type: "Appointment", ai: false, icon: "ph ph-calendar-blank", go: "appointments", at: a.startsAt.toISOString(),
    title: a.title, sub: a.clinician }));
  const hidden = new Set([...(c.labs ? [] : ["labs"]), ...(c.records ? [] : ["referral", "protocol", "appointment"])]);
  return out.filter((x) => !hidden.has(x.ref.type)).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 200);
}

export async function getHistoryDetail(patient: { id: string; timezone: string }, type: string, id: string): Promise<HistoryDetailDTO | null> {
  const tz = patient.timezone;
  if (type === "symptom") {
    const s = await prisma.symptomCheckLog.findFirst({ where: { id, patientId: patient.id } });
    if (!s) return null;
    return { eyebrow: "History", title: "AI Symptom Check", dateLabel: `${longDate(s.createdAt, tz)} · Completed`,
      sections: [{ h: "Topic", t: s.specialty }, { h: "What you shared", t: s.description }, { h: "Guidance given", t: s.emergency ? "Emergency signs were identified. You were advised to call 911 or go to the nearest emergency department." : s.summary }],
      note: "AI-generated guidance. Reviewed by your care team when shared. Not a diagnosis." };
  }
  if (type === "alba") {
    const c = await prisma.albaConversation.findFirst({ where: { id, patientId: patient.id }, include: { messages: { orderBy: { createdAt: "asc" }, select: { role: true, text: true } } } });
    if (!c) return null;
    return { eyebrow: "History", title: "Neyu conversation", dateLabel: `${longDate(c.createdAt, tz)} · Completed`, sections: [],
      messages: c.messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text })), note: "AI-generated. Not a diagnosis." };
  }
  if (type === "assessment") {
    const a = await prisma.longevityAssessment.findFirst({ where: { id, patientId: patient.id } });
    if (!a) return null;
    const focus = parseJSON<any[]>(a.focusAreas, []).map((f) => (typeof f === "string" ? f : f?.area || f?.title || "")).filter(Boolean);
    return { eyebrow: "History", title: "Health Risk Assessment", dateLabel: `${longDate(a.createdAt, tz)} · Completed`,
      sections: [{ h: "Summary", t: a.summary }, ...(focus.length ? [{ h: "Focus areas", t: focus.join(" · ") }] : []), { h: "Suggested next step", t: a.suggestedNextStep }],
      note: "Educational guidance. Not a diagnosis." };
  }
  if (type === "labcheck") {
    const l = await prisma.labResultCheck.findFirst({ where: { id, patientId: patient.id } });
    if (!l) return null;
    return { eyebrow: "History", title: "Lab Result Explainer", dateLabel: `${longDate(l.createdAt, tz)} · Completed`, sections: [{ h: "Summary", t: l.overallSummary }], note: "AI-generated explanation. Not a diagnosis." };
  }
  return null;
}

// ── Appointments ────────────────────────────────────────────────────────
export async function getAppointments(patient: { id: string; timezone: string }): Promise<AppointmentsDTO> {
  const now = new Date(), today = dayKey(now, patient.timezone);
  const c = await getConsent(patient.id);
  if (!c.records) return { upcoming: [], past: [], questions: [], prepSources: { trends: false, results: null, symptom: null } };
  const [appts, questions, readingCount, latestLab, sym] = await Promise.all([
    prisma.appointment.findMany({ where: { patientId: patient.id }, orderBy: { startsAt: "asc" }, include: { _count: { select: { questions: true } } } }),
    prisma.visitQuestion.findMany({ where: { patientId: patient.id, OR: [{ appointmentId: null }, { appointment: { startsAt: { gte: now } } }] }, orderBy: { createdAt: "asc" }, select: { id: true, text: true } }),
    prisma.healthReading.count({ where: { patientId: patient.id, day: { gte: addDays(today, -30) }, ...readingSourceFilter(c) } }),
    !c.labs ? Promise.resolve(null) : prisma.labResult.findFirst({ where: { patientId: patient.id, status: "final" }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, select: { collectedAt: true, source: true } }),
    prisma.symptomCheckLog.findFirst({ where: { patientId: patient.id, createdAt: { gte: new Date(now.getTime() - 60 * 86400000) } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, description: true } }),
  ]);
  const map = (a: (typeof appts)[number]): AppointmentDTO => ({
    id: a.id, title: a.title, clinician: a.clinician, location: a.location, startsAt: a.startsAt.toISOString(), durationMin: a.durationMin, status: a.status,
    summaryAvailable: a.summaryAvailable, rescheduleRequested: !!a.rescheduleRequestedAt, prepSaved: !!a.prepSavedAt, questionCount: a._count.questions,
    prep: { shareTrends: a.prepShareTrends, shareResults: a.prepShareResults, shareSymptoms: a.prepShareSymptoms },
  });
  return {
    upcoming: appts.filter((a) => a.status === "scheduled" && a.startsAt >= now).map(map),
    past: appts.filter((a) => a.startsAt < now || a.status !== "scheduled").reverse().map(map),
    questions,
    prepSources: {
      trends: readingCount > 0,
      results: latestLab?.collectedAt ? `${latestLab.source} · ${fmtDay(dayKey(latestLab.collectedAt, patient.timezone))}` : null,
      symptom: sym ? { label: `${fmtDay(dayKey(sym.createdAt, patient.timezone))} symptom check`, sub: clip(sym.description, 60) } : null,
    },
  };
}

// ── Referrals ───────────────────────────────────────────────────────────
export async function getReferrals(patient: { id: string; timezone: string }): Promise<ReferralDTO[]> {
  if (!(await getConsent(patient.id)).records) return [];
  const [refs, next] = await Promise.all([
    prisma.referralSubmission.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" }, select: { id: true, specialties: true, status: true, createdAt: true, reviewedAt: true, reviewedBy: true, scheduledAt: true } }),
    prisma.appointment.findFirst({ where: { patientId: patient.id, status: "scheduled", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, select: { id: true } }),
  ]);
  const tz = patient.timezone;
  const dt = (d: Date) => fmtDay(dayKey(d, tz));
  const statusLabel: Record<string, string> = { received: "Referral received", reviewed: "Reviewed", scheduled: "Appointment scheduled", closed: "Closed" };
  return refs.map((r) => {
    const sp = parseJSON<string[]>(r.specialties, []);
    return {
      id: r.id, title: `${sp[0] || "Specialist"} Referral`, status: statusLabel[r.status] || r.status, appointmentId: r.status === "scheduled" ? next?.id ?? null : null,
      steps: [
        { label: "Referral received", date: dt(r.createdAt), done: true },
        { label: "Reviewed", date: r.reviewedAt ? `${dt(r.reviewedAt)}${r.reviewedBy ? " · " + r.reviewedBy : ""}` : "Pending", done: !!r.reviewedAt },
        { label: "Appointment scheduled", date: r.scheduledAt ? `${dt(r.scheduledAt)} · ${timeLabel(r.scheduledAt, tz)}` : "Pending", done: !!r.scheduledAt },
      ],
    };
  });
}

// ── Devices ─────────────────────────────────────────────────────────────
/** Stored attempt log with metric keys turned into names ("steps" → "Steps"). */
function readableResult(raw?: string | null): DeviceDTO["lastResult"] {
  const r = raw ? parseJSON<DeviceDTO["lastResult"]>(raw, null) : null;
  if (!r) return null;
  return { ...r, metrics: (r.metrics || []).map((m) => (isMetricKey(m) ? METRIC_DEFS[m].name : m)) };
}

export async function getDevices(patientId: string): Promise<DeviceDTO[]> {
  const rows = await prisma.deviceConnection.findMany({ where: { patientId }, select: { provider: true, status: true, lastSyncAt: true, dataTypes: true, tokenHint: true, lastError: true, lastAttemptAt: true, lastResult: true } });
  const { oauthConfigured } = await import("@backend/oauth");
  return DEVICE_CATALOG.map((d) => {
    const r = rows.find((x) => x.provider === d.id);
    const available = d.mode === "shortcut" || d.mode === "app" || (d.mode === "oauth" && oauthConfigured(d.id));
    const status: DeviceDTO["status"] = !r || r.status === "disconnected" ? "off" : r.status === "waitlist" ? "waitlist" : r.status === "connected" ? "on" : "pending";
    const stale = status === "on" && !!r?.lastSyncAt && Date.now() - r.lastSyncAt.getTime() > 3 * 86400000;
    return { id: d.id, name: d.name, icon: d.icon, signals: d.signals.map((s) => s.label), available, status, lastSyncAt: r?.lastSyncAt?.toISOString() ?? null,
      dataTypes: r && r.status !== "waitlist" ? sharedLabels(d.id, parseJSON<string[]>(r.dataTypes, [])) : d.signals.map((s) => s.label), tokenHint: r?.tokenHint ?? null,
      mode: d.mode, blurb: d.blurb, beta: !!d.beta, stale, lastError: r?.lastError ?? null,
      lastAttemptAt: r?.lastAttemptAt?.toISOString() ?? null, lastResult: readableResult(r?.lastResult), guide: d.guide };
  });
}

export { TREND_CATS, physicians };
