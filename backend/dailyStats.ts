// Daily totals (Phase 5). The worker turns raw activity into a few rows per day
// (DailyStat) every 10 minutes for the last 3 days, and once for all history. Insights
// reads these rows, so a year loads in milliseconds instead of scanning millions of rows.
import { prisma } from "@backend/db";
import { TOPICS } from "@backend/neyuTopics";

const TZ = "America/Edmonton";
export const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

// Calgary midnight → UTC (timestamps are stored as UTC without a time zone).
const FROM = `(($1::date)::timestamp at time zone '${TZ}') at time zone 'UTC'`;
const TO = `(($2::date + 1)::timestamp at time zone '${TZ}') at time zone 'UTC'`;
const DAY = (col: string) => `to_char(("${col}" at time zone 'UTC') at time zone '${TZ}', 'YYYY-MM-DD')`;
const SITE = `path not like '/admin%' and path not like '/my-health%' and path not like '/share/%' and path not like '/api/%'`;

/** Recomputes DailyStat for every day from `fromDay` to `toDay` (inclusive). */
export async function rollupDays(fromDay: string, toDay: string) {
  const test = (await prisma.visitor.findMany({ where: { id: { startsWith: "v_TEST" } }, select: { sessionId: true } })).map((v) => v.sessionId);
  const notTest = `"sessionId" <> all($3::text[])`;
  type Tx = Pick<typeof prisma, "$executeRawUnsafe">;
  const ins = (tx: Tx, sql: string, ...extra: unknown[]) => tx.$executeRawUnsafe(
    `insert into "DailyStat" (day, kind, key, n, m, "updatedAt") ${sql}
     on conflict (day, kind, key) do update set n = excluded.n, m = excluded.m, "updatedAt" = now()`, fromDay, toDay, test, ...extra);
  const topicCols = TOPICS.map((_, i) => `count(*) filter (where text ~* $${i + 4})::int`);
  // One transaction: dashboards never see a day half-written.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`delete from "DailyStat" where day >= $1 and day <= $2`, fromDay, toDay);
    const counts: number[] = [];
    for (const [sql, extra] of [
      // Page views per page and for the whole site.
      [`select d, 'page', coalesce(path, '*'), count(*), count(distinct "sessionId"), now()
           from (select ${DAY("createdAt")} d, path, "sessionId" from "PageVisit"
                 where "createdAt" >= ${FROM} and "createdAt" < ${TO} and ${SITE} and ${notTest}) x
           group by grouping sets ((d, path), (d))`, []],
      // New visitors per referring site, and how many were on a phone or tablet.
      [`select ${DAY("firstSeenAt")}, 'source', coalesce(substring(referrer from '^[a-zA-Z]+://([^/:?#]+)'), ''), count(*),
                  count(*) filter (where "userAgent" ~* 'Mobi|Android|iPhone|iPad'), now()
           from "Visitor" where "firstSeenAt" >= ${FROM} and "firstSeenAt" < ${TO} and id not like 'v\\_TEST%' and $3::text[] is not null
           group by 1, 3`, []],
      // Visitors who searched or clicked, by device.
      [`select ${DAY("createdAt")}, 'device', coalesce(device, 'desktop'), count(distinct "sessionId"), 0, now()
           from "SiteEvent" where "createdAt" >= ${FROM} and "createdAt" < ${TO} and ${notTest} group by 1, 3`, []],
      // Visitors who opened sign-up.
      [`select ${DAY("createdAt")}, 'signup', '*', count(distinct "sessionId"), 0, now()
           from "PageVisit" where "createdAt" >= ${FROM} and "createdAt" < ${TO} and path like '/my-health/sign-up%' and ${notTest} group by 1`, []],
      // Neyu questions per topic (one row per topic per day, "*" = all questions).
      [`select d, 'topic', t.key, t.n, 0, now() from (
             select ${DAY("createdAt")} d, count(*)::int total, ${topicCols.map((c, i) => `${c} t${i}`).join(", ")}
             from "AlbaMessage" where role = 'user' and "createdAt" >= ${FROM} and "createdAt" < ${TO} and $3::text[] is not null group by 1) x,
           lateral (values ('*', total), ${TOPICS.map(([label], i) => `('${label.replace(/'/g, "''")}', t${i})`).join(", ")}) t(key, n)
           where t.n > 0`, TOPICS.map(([, re]) => re.source.replace(/\\b/g, "\\y"))],
    ] as [string, unknown[]][]) counts.push(await ins(tx, sql, ...extra));
    return counts.reduce((a, b) => a + b, 0);
  }, { timeout: 10 * 60_000, maxWait: 60_000 });
}

/** The last 3 days (run every 10 minutes). The first run also fills all history, a month at a time. */
export async function rollupRecent() {
  const now = new Date();
  // The last 3 days, so activity logged just before midnight is always counted.
  const rows = await rollupDays(dayOf(new Date(now.getTime() - 2 * 86400_000)), dayOf(now));
  let history = 0;
  // History is filled once: when page views older than 2 days exist but no daily rows for them.
  const twoDaysAgo = dayOf(new Date(now.getTime() - 2 * 86400_000));
  const filled = await prisma.dailyStat.findFirst({ where: { kind: "page", day: { lt: twoDaysAgo } }, select: { day: true } });
  const first = filled ? null : await prisma.pageVisit.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  if (first && dayOf(first.createdAt) < twoDaysAgo) {
    let cur = new Date(Date.UTC(first.createdAt.getUTCFullYear(), first.createdAt.getUTCMonth(), 1, 12));
    const stop = new Date(now.getTime() - 3 * 86400_000);
    while (cur <= stop) {
      const next = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1, 12));
      const end = new Date(Math.min(next.getTime() - 86400_000, stop.getTime()));
      history += await rollupDays(dayOf(cur), dayOf(end));
      cur = next;
    }
  }
  return { rows, history };
}
