// Insights (Phase 4): what people view, search, click and ask Neyu; where they come from;
// how many become patients. Everything is anonymous — counts per page / word / topic, never
// a person. Test visitors (v_TEST…) and staff pages are left out.

import { prisma } from "@backend/db";
import { parseRange } from "@backend/adminData";
import { physicians } from "@/data/physicians";
import { dayOf } from "@backend/dailyStats";

const DAY = 86400_000;

// Friendly names for pages and the interest area each belongs to.
const AREAS: [RegExp, string][] = [
  [/^\/specialties\/?/, "Specialties"], [/^\/diagnostics\/?/, "Diagnostics & tests"], [/^\/(physicians)\/?/, "Physicians"],
  [/^\/(care|virtual-care|hypertension-clinic|at-home|packages|membership|services)\/?/, "Care & services"],
  [/^\/(longevity|longevity-lab|prevention)\/?/, "Prevention & longevity"], [/^\/(genomics|lab-results)\/?/, "Labs & genomics"],
  [/^\/(cardiac-symptoms|explain-diagnosis)\/?/, "Symptoms & conditions"], [/^\/(neyu|nea)\/?/, "Neyu AI"],
  [/^\/(referral-centre)\/?/, "Referrals"], [/^\/(about|careers|contact|resources|explore)\/?/, "About & resources"],
];
const area = (p: string) => (p === "/" ? "Home" : AREAS.find(([re]) => re.test(p))?.[1] || "Other");
const pretty = (p: string) => {
  if (p === "/") return "Home";
  const parts = p.split("/").filter(Boolean);
  if (parts[0] === "physicians" && parts[1]) return physicians.find((d) => d.slug === parts[1])?.name || cap(parts[1]);
  return parts.map(cap).join(" › ");
};
function cap(s: string) { return s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()); }

function source(host: string | null | undefined): string {
  if (!host) return "Direct / typed";
  const h = host.toLowerCase().replace(/^www\./, "");
  if (/neyuhealth\.com$|anrahealth\.com$|localhost/.test(h)) return "Direct / typed";
  if (/chatgpt|openai|perplexity|claude\.ai|gemini\.google|copilot|you\.com/.test(h)) return "AI assistants (ChatGPT, Perplexity…)";
  if (/google\./.test(h)) return "Google";
  if (/bing\.|duckduckgo|yahoo|ecosia/.test(h)) return "Other search engines";
  if (/facebook|instagram|linkedin|twitter|x\.com|tiktok|youtube|reddit|t\.co$/.test(h)) return "Social media";
  return h;
}

export async function insights(range: string | null, from?: string | null, to?: string | null) {
  const r = parseRange(range, from, to);
  const testSessions = (await prisma.visitor.findMany({ where: { id: { startsWith: "v_TEST" } }, select: { sessionId: true } })).map((v) => v.sessionId);
  // Plain positional SQL ($1 = start, $2 = end, $3 = test sessions as one array) — no
  // nested SQL fragments, so it behaves the same on every Prisma build.
  const notTest = `and "sessionId" <> all($3::text[])`;
  const site = `path not like '/admin%' and path not like '/my-health%' and path not like '/share/%'`;
  const W = `"createdAt" >= $1 and "createdAt" <= $2`, PW = `"createdAt" >= $1 and "createdAt" < $2`;
  const raw = <T,>(sql: string, prev = false) => prisma.$queryRawUnsafe<T[]>(sql, prev ? r.prevStart : r.start, prev ? r.prevEnd : r.end, testSessions);

  // Daily chart, pages, sources, devices, sign-up opens and Neyu topics come from the daily totals (DailyStat, kept up to date
  // every 10 minutes by the worker) — a year is ~15,000 small rows instead of millions.
  // Different visitors over the whole range: counted exactly from page views for up to a
  // month; for longer ranges from visitor records active in the range (same people, far
  // cheaper). "People" per page over long ranges adds up each day's visitors.
  const startDay = dayOf(r.start), endDay = dayOf(r.end);
  const exact = r.end.getTime() - r.start.getTime() <= 32 * DAY;
  const visitorsIn = async (from: Date, to: Date, prev: boolean) => exact
    ? Number((await raw<{ n: bigint }>(`select count(distinct "sessionId") n from "PageVisit" where ${prev ? PW : W} and ${site} ${notTest}`, prev))[0]?.n || 0)
    : prisma.visitor.count({ where: { lastSeenAt: { gte: from }, firstSeenAt: prev ? { lt: to } : { lte: to }, pageCount: { gt: 0 }, NOT: { id: { startsWith: "v_TEST" } } } });
  // Sums of the daily rows for one kind: key → [n, m].
  const daily = (kind: string) => prisma.$queryRawUnsafe<{ key: string; n: bigint; m: bigint }[]>(
    `select key, sum(n)::bigint n, sum(m)::bigint m from "DailyStat" where kind = $1 and day >= $2 and day <= $3 group by key`, kind, startDay, endDay);
  const [dayRows, pageRows, visitorsNow, visitorsPrev, searches, clicks, deviceRows, signups, prevSignups, signupRows, sourceRows, topicRows] = await Promise.all([
    prisma.dailyStat.findMany({ where: { kind: "page", key: "*", day: { gte: startDay, lte: endDay } }, select: { day: true, n: true, m: true } }),
    prisma.$queryRawUnsafe<{ path: string; n: bigint; people: bigint }[]>(
      `select key path, sum(n)::bigint n, sum(m)::bigint people from "DailyStat" where kind = 'page' and key <> '*' and day >= $1 and day <= $2 group by key order by n desc limit 300`, startDay, endDay),
    visitorsIn(r.start, r.end, false),
    visitorsIn(r.prevStart, r.prevEnd, true),
    raw<{ label: string; n: bigint; total: bigint }>(`select label, count(*) n, (sum(count(*)) over ())::bigint total from "SiteEvent" where type = 'search' and ${W} ${notTest} group by label order by n desc limit 15`),
    raw<{ label: string; target: string | null; n: bigint }>(`select label, max(target) target, count(*) n from "SiteEvent" where type = 'click' and ${W} ${notTest} group by label order by n desc limit 15`),
    daily("device"),
    prisma.patient.count({ where: { createdAt: { gte: r.start, lte: r.end }, NOT: { id: { startsWith: "test_" } } } }),
    prisma.patient.count({ where: { createdAt: { gte: r.prevStart, lt: r.prevEnd }, NOT: { id: { startsWith: "test_" } } } }),
    daily("signup"),
    daily("source"),
    daily("topic"),
  ]);
  const byDay = dayRows.map((x) => ({ d: x.day, views: x.n, visitors: x.m }));
  const pages = pageRows;

  const n = (x: bigint | number | undefined) => Number(x || 0);
  const visitors = visitorsNow, views = byDay.reduce((a, x) => a + x.views, 0);
  const pv = visitorsPrev;
  const change = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

  // Days with no visits still show on the chart.
  const days: { day: string; visitors: number; views: number }[] = [];
  const spanDays = Math.min(400, Math.max(1, Math.ceil((r.end.getTime() - r.start.getTime()) / DAY)));
  const map = new Map(byDay.map((x) => [x.d, x]));
  for (let i = spanDays - 1; i >= 0; i--) {
    const d = new Date(r.end.getTime() - i * DAY);
    const k = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton" }).format(d);
    const hit = map.get(k);
    days.push({ day: k, visitors: n(hit?.visitors), views: n(hit?.views) });
  }

  const areaMap = new Map<string, number>();
  for (const p of pages) areaMap.set(area(p.path), (areaMap.get(area(p.path)) || 0) + n(p.n));
  const topOf = (re: RegExp, skip?: RegExp) => pages.filter((p) => re.test(p.path) && !(skip && skip.test(p.path))).slice(0, 8).map((p) => ({ label: pretty(p.path), path: p.path, n: n(p.n), people: n(p.people) }));

  const srcMap = new Map<string, number>(); let mobile = 0, newVisitors = 0;
  for (const v of sourceRows) { const k = source(v.key); srcMap.set(k, (srcMap.get(k) || 0) + n(v.n)); mobile += n(v.m); newVisitors += n(v.n); }

  const topicMap = new Map<string, number>();
  let questions = 0;
  for (const t of topicRows) { if (t.key === "*") questions = n(t.n); else topicMap.set(t.key, n(t.n)); }

  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, n: v }));
  const started = n(signupRows[0]?.n);
  return {
    rangeLabel: r.label,
    totals: {
      visitors, views, visitorsChange: change(visitors, pv), signups, signupsChange: change(signups, prevSignups),
      conversion: visitors ? Math.round((signups / visitors) * 1000) / 10 : 0,
      searches: n(searches[0]?.total), neyuQuestions: questions,
      mobileShare: newVisitors ? Math.round((mobile / newVisitors) * 100) : null,
    },
    days,
    interests: sorted(areaMap).filter((x) => x.label !== "Other").slice(0, 10),
    topPages: pages.slice(0, 10).map((p) => ({ label: pretty(p.path), path: p.path, n: n(p.n), people: n(p.people) })),
    specialties: topOf(/^\/specialties\/.+/),
    services: topOf(/^\/(diagnostics\/.+|care|virtual-care|hypertension-clinic|at-home|packages|membership|longevity-lab|genomics|lab-results)$/),
    physicians: topOf(/^\/physicians\/.+/),
    searches: searches.map((s) => ({ label: s.label, n: n(s.n) })),
    clicks: clicks.map((c) => ({ label: c.label, target: c.target, n: n(c.n) })),
    sources: sorted(srcMap).slice(0, 8),
    devices: deviceRows.map((d) => ({ label: d.key === "mobile" ? "Phone / tablet" : "Computer", n: n(d.n) })),
    neyuTopics: sorted(topicMap).slice(0, 12),
    funnel: [
      { label: "Visited the website", n: visitors },
      { label: "Opened sign-up", n: started },
      { label: "Created an account", n: signups },
    ],
  };
}

export type InsightsDTO = Awaited<ReturnType<typeof insights>>;
