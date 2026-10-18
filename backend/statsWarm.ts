// Keeps the heavy dashboard numbers ready (Phase 5). At 5,000 visitors a day a year of
// data is millions of rows, so Overview numbers, Analytics and Insights for the standard
// ranges are computed in the background and read from the cache:
//   7D / 30D  → refreshed every 10 minutes
//   90D / 1Y  → refreshed every hour
// A custom date range is computed when asked and cached for 2 minutes.
import { parseRange, analytics, overviewNumbers } from "@backend/adminData";
import { insights } from "@backend/siteInsights";
import { putCached, kv } from "@backend/kv";

export type StatsKind = "overview" | "analytics" | "insights";
export const SHORT_RANGES = ["7D", "30D"] as const;
export const LONG_RANGES = ["90D", "1Y"] as const;

/** Cache key + lifetime for one dashboard request. */
export function statsCache(kind: StatsKind, range: string | null, from?: string | null, to?: string | null) {
  const r = parseRange(range, from, to);
  if (r.key === "Custom") return { key: `stats:${kind}:Custom:${r.start.toISOString().slice(0, 10)}:${r.end.toISOString().slice(0, 10)}`, ttl: 120 };
  return { key: `stats:${kind}:${r.key}`, ttl: r.key === "7D" || r.key === "30D" ? 20 * 60 : 2 * 3600 };
}

const LOADERS: Record<StatsKind, (range: string) => Promise<unknown>> = {
  overview: (range) => overviewNumbers(range),
  analytics: (range) => analytics(range),
  insights: (range) => insights(range),
};

/** Recomputes the given ranges one after another (gentle on the database). */
export async function warmStats(ranges: readonly string[]) {
  const done: string[] = [];
  for (const range of ranges) {
    for (const kind of Object.keys(LOADERS) as StatsKind[]) {
      const c = statsCache(kind, range);
      await putCached(c.key, c.ttl, await LOADERS[kind](range));
      done.push(`${kind}:${range}`);
    }
  }
  await kv.set("stats.warmedAt", new Date().toISOString());
  return { warmed: done.length };
}
