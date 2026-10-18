// Turns Apple Health / Health Connect data (read by the NEYU app) into the daily readings
// that /api/wearables/ingest stores. Pure functions — no phone needed — so they are unit-tested.
//
// One value per day (the phone's local day). Units are converted to what NEYU shows:
//   distance m → km · blood oxygen 0–1 → % · blood glucose mg/dL → mmol/L · sleep → hours.
// Sleep belongs to the morning you wake up: a night is counted on the day of (end + 6 h).
// When several apps recorded the same night (watch + phone), the one with the most sleep is used.

export type Reading = { metric: string; value: number | string; date: string; recordedAt: string };
export type Agg = { startDate: string; endDate?: string; value: number; values?: Partial<Record<"sum" | "average" | "min" | "max", number>> };
export type Sample = {
  value: number; startDate: string; endDate: string; sourceName?: string; sourceId?: string;
  sleepState?: string; stages?: { startDate: string; endDate: string; stage: string }[]; systolic?: number; diastolic?: number;
};
export type Workout = { duration: number; startDate: string; endDate: string };

const fmtDay = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };
const r2 = (v: number) => Math.round(v * 100) / 100;
const ok = (d: Date) => !isNaN(d.getTime());

/** Daily totals or averages the phone already summed (steps, distance, energy, resting HR). */
export function fromAggregated(metric: string, rows: Agg[], tz: string, pick: "sum" | "average", convert = (v: number) => v): Reading[] {
  const out = new Map<string, Reading>();
  for (const a of rows) {
    const start = new Date(a.startDate);
    const v = a.values?.[pick] ?? a.value;
    if (!ok(start) || typeof v !== "number" || !isFinite(v) || v <= 0) continue;
    const date = fmtDay(start, tz);
    out.set(date, { metric, value: r2(convert(v)), date, recordedAt: new Date(a.endDate || a.startDate).toISOString() });
  }
  return [...out.values()];
}

/** Single readings → one per day: the average (heart rate variability, blood oxygen) or the latest (weight, glucose). */
export function perDay(metric: string, rows: Sample[], tz: string, how: "average" | "latest" | "sum", convert = (v: number) => v): Reading[] {
  const days = new Map<string, { vals: number[]; last: Sample }>();
  for (const s of rows) {
    const t = new Date(s.endDate || s.startDate);
    if (!ok(t) || typeof s.value !== "number" || !isFinite(s.value)) continue;
    const date = fmtDay(t, tz), d = days.get(date);
    if (!d) days.set(date, { vals: [s.value], last: s });
    else { d.vals.push(s.value); if (new Date(d.last.endDate || d.last.startDate) <= t) d.last = s; }
  }
  return [...days.entries()].map(([date, d]) => {
    const v = how === "average" ? d.vals.reduce((a, b) => a + b, 0) / d.vals.length : how === "sum" ? d.vals.reduce((a, b) => a + b, 0) : d.last.value;
    return { metric, value: r2(convert(v)), date, recordedAt: new Date(d.last.endDate || d.last.startDate).toISOString() };
  });
}

/** Blood pressure: the latest reading of each day as "120/80". */
export function bloodPressure(rows: Sample[], tz: string): Reading[] {
  const days = new Map<string, Sample>();
  for (const s of rows) {
    if (!s.systolic || !s.diastolic) continue;
    const t = new Date(s.startDate);
    if (!ok(t)) continue;
    const date = fmtDay(t, tz), prev = days.get(date);
    if (!prev || new Date(prev.startDate) <= t) days.set(date, s);
  }
  return [...days.entries()].map(([date, s]) => ({ metric: "bp", value: `${Math.round(s.systolic!)}/${Math.round(s.diastolic!)}`, date, recordedAt: new Date(s.startDate).toISOString() }));
}

/** Workouts: how many and how many active minutes per day (Android has no "exercise minutes"). */
export function workouts(rows: Workout[], tz: string, withMinutes: boolean): Reading[] {
  const days = new Map<string, { n: number; min: number; last: string }>();
  for (const w of rows) {
    const t = new Date(w.startDate);
    if (!ok(t)) continue;
    const date = fmtDay(t, tz), d = days.get(date) || { n: 0, min: 0, last: w.endDate };
    d.n++; d.min += Math.max(0, (w.duration || 0) / 60); d.last = w.endDate > d.last ? w.endDate : d.last;
    days.set(date, d);
  }
  return [...days.entries()].flatMap(([date, d]) => [
    { metric: "workouts", value: d.n, date, recordedAt: new Date(d.last).toISOString() },
    ...(withMinutes && d.min >= 1 ? [{ metric: "active", value: Math.round(Math.min(d.min, 1440)), date, recordedAt: new Date(d.last).toISOString() }] : []),
  ]);
}

const ASLEEP = new Set(["asleep", "rem", "deep", "light"]);
type Span = [number, number];
const merge = (spans: Span[]) => {
  const s = [...spans].sort((a, b) => a[0] - b[0]), out: Span[] = [];
  for (const x of s) { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push([...x] as Span); }
  return out;
};
const total = (spans: Span[]) => merge(spans).reduce((a, [s, e]) => a + (e - s), 0);

/**
 * Sleep from iPhone (one sample per stage: inBed / asleep / rem / deep / light / awake) or
 * Android (one sample per night with optional stages). → sleep hours, bedtime, time in bed.
 */
export function sleep(rows: Sample[], tz: string): Reading[] {
  // night → source → { asleep spans, in-bed spans }
  const nights = new Map<string, Map<string, { asleep: Span[]; bed: Span[] }>>();
  const add = (src: string, startIso: string, endIso: string, kind: "asleep" | "bed") => {
    const s = new Date(startIso).getTime(), e = new Date(endIso).getTime();
    if (!isFinite(s) || !isFinite(e) || e <= s || e - s > 20 * 3600_000) return;
    const night = fmtDay(new Date(e + 6 * 3600_000), tz);
    const m = nights.get(night) || new Map(); nights.set(night, m);
    const v = m.get(src) || { asleep: [], bed: [] }; m.set(src, v);
    v[kind].push([s, e]);
  };
  for (const r of rows) {
    const src = r.sourceId || r.sourceName || "phone";
    if (r.sleepState) { // iPhone: one stage per sample
      if (ASLEEP.has(r.sleepState)) add(src, r.startDate, r.endDate, "asleep");
      else if (r.sleepState === "inBed") add(src, r.startDate, r.endDate, "bed");
      continue;
    }
    // Android: a whole night, with stages when the app recorded them
    add(src, r.startDate, r.endDate, "bed");
    const st = (r.stages || []).filter((x) => ASLEEP.has(x.stage));
    if (st.length) st.forEach((x) => add(src, x.startDate, x.endDate, "asleep"));
    else if (!(r.stages || []).length) add(src, r.startDate, r.endDate, "asleep");
  }
  const out: Reading[] = [];
  for (const [date, sources] of nights) {
    // Per source: the main sleep = the longest block (parts less than 3 h apart belong together),
    // so an afternoon nap isn't added to the night.
    let best: Span[] | null = null, bestBed: Span[] = [], bestMs = 0;
    for (const v of sources.values()) {
      const blocks: Span[][] = [];
      for (const sp of merge(v.asleep)) { const b = blocks[blocks.length - 1]; if (b && sp[0] - b[b.length - 1][1] <= 3 * 3600_000) b.push(sp); else blocks.push([sp]); }
      for (const b of blocks) {
        const ms = total(b);
        if (ms > bestMs) { best = b; bestMs = ms; const lo = b[0][0] - 3 * 3600_000, hi = b[b.length - 1][1] + 3 * 3600_000; bestBed = merge(v.bed).filter(([s, e]) => e > lo && s < hi); }
      }
    }
    if (!best || bestMs < 30 * 60_000) continue; // under 30 minutes: a nap or a stray record
    const first = best[0][0], last = best[best.length - 1][1], end = new Date(last).toISOString();
    out.push({ metric: "sleep", value: r2(bestMs / 3600_000), date, recordedAt: end });
    out.push({ metric: "bedtime", value: new Date(first).toISOString(), date, recordedAt: end });
    const bed = bestBed.length ? total(bestBed) : last - first;
    out.push({ metric: "timeInBed", value: r2(Math.max(bed, bestMs) / 3600_000), date, recordedAt: end });
  }
  return out;
}

export const convert = {
  km: (m: number) => m / 1000,
  percent: (v: number) => (v <= 1 ? v * 100 : v),
  mmol: (mgdl: number) => mgdl / 18.016,
};
