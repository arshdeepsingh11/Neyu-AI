// Lab retest reminders (BioAro results): latest final result per test +
// a standard interval (shorter when the last value was out of range).

import { prisma } from "@backend/db";
import { dayKey } from "@/lib/portal/metrics";
import { retestMonths } from "@/lib/portal/universe";
import type { RetestDTO } from "@/lib/portal/types";

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; };
const fmt = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz }).format(d);

/** Tests due within `withinDays` (or overdue), soonest first. */
export async function getRetests(patient: { id: string; timezone: string }, withinDays = 30): Promise<RetestDTO[]> {
  const rows = await prisma.labResult.findMany({ where: { patientId: patient.id, status: "final", collectedAt: { not: null } }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, select: { code: true, name: true, value: true, refLow: true, refHigh: true, collectedAt: true } });
  const seen = new Set<string>(), out: (RetestDTO & { t: number })[] = [];
  const now = Date.now(), today = dayKey(new Date(), patient.timezone);
  for (const r of rows) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    const oor = r.value != null && ((r.refLow != null && r.value < r.refLow) || (r.refHigh != null && r.value > r.refHigh));
    const m = retestMonths(r.code, r.name, oor);
    if (!m) continue;
    const due = addMonths(r.collectedAt!, m);
    if (due.getTime() - now > withinDays * 86400000) continue;
    out.push({ code: r.code, name: r.name, last: fmt(r.collectedAt!, patient.timezone), due: fmt(due, patient.timezone), overdue: dayKey(due, patient.timezone) < today, months: m, t: due.getTime() });
  }
  return out.sort((a, b) => a.t - b.t).map(({ t, ...x }) => x);
}

/** Same rule for one test (Results detail). */
export function retestFor(code: string, name: string, value: number | null, refLow: number | null, refHigh: number | null, collectedAt: Date | null, tz: string) {
  if (!collectedAt) return null;
  const oor = value != null && ((refLow != null && value < refLow) || (refHigh != null && value > refHigh));
  const m = retestMonths(code, name, oor);
  if (!m) return null;
  const due = addMonths(collectedAt, m);
  return { due: fmt(due, tz), overdue: due.getTime() < Date.now(), months: m };
}
