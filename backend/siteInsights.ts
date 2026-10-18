// Insights (Phase 4): what people view, search, click and ask Neyu; where they come from;
// how many become patients. Everything is anonymous — counts per page / word / topic, never
// a person. Test visitors (v_TEST…) and staff pages are left out.

import { prisma } from "@backend/db";
import { parseRange } from "@backend/adminData";
import { physicians } from "@/data/physicians";

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

// Neyu question topics (counted from what people ask; the questions themselves are not shown).
const TOPICS: [string, RegExp][] = [
  ["Blood pressure", /blood pressure|hypertens|\bbp\b|systolic|diastolic/i],
  ["Cholesterol & lipids", /cholesterol|ldl|hdl|lipid|triglycer|statin/i],
  ["Heart rhythm & palpitations", /palpitat|arrhythm|afib|a-fib|fibrillation|irregular heart|heart rate|racing heart/i],
  ["Chest pain", /chest (pain|tight|pressure)|angina/i],
  ["Heart failure & swelling", /heart failure|swelling|edema|oedema|short(ness)? of breath|breathless/i],
  ["Diabetes & blood sugar", /diabet|blood sugar|glucose|a1c|insulin/i],
  ["Weight & nutrition", /weight|diet|nutrition|food|calorie|protein|fasting/i],
  ["Sleep", /sleep|insomnia|apnea|snor/i],
  ["Stress & mood", /stress|anxi|mood|burnout/i],
  ["Exercise & fitness", /exercis|workout|walk|steps|fitness|vo2|cardio/i],
  ["Thyroid & hormones", /thyroid|tsh|hormone|testosterone|estrogen|menopause/i],
  ["Longevity & aging", /longevit|aging|ageing|lifespan|biological age/i],
  ["Genetics & DNA", /gene|genetic|dna|genom|hereditary/i],
  ["Lab results", /lab result|blood test|results?\b|ferritin|vitamin d|b12|crp/i],
  ["Booking & visits", /appointment|book|referral|visit|doctor|specialist|clinic hours/i],
  ["Cost & coverage", /cost|price|insurance|covered|ahs|fee|pay/i],
  ["Tests & imaging", /echo|ecg|ekg|holter|stress test|ultrasound|imaging|monitor/i],
];

function source(ref: string | null | undefined): string {
  if (!ref) return "Direct / typed";
  let h = "";
  try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { return "Other"; }
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

  const [totals, prevTotals, byDay, pages, searches, clicks, devices, signups, prevSignups, startedSignup, firstVisits, msgs] = await Promise.all([
    raw<{ views: bigint; visitors: bigint }>(`select count(*) views, count(distinct "sessionId") visitors from "PageVisit" where ${W} and ${site} ${notTest}`),
    raw<{ views: bigint; visitors: bigint }>(`select count(*) views, count(distinct "sessionId") visitors from "PageVisit" where ${PW} and ${site} ${notTest}`, true),
    raw<{ d: string; views: bigint; visitors: bigint }>(`select to_char(("createdAt" at time zone 'UTC') at time zone 'America/Edmonton', 'YYYY-MM-DD') d, count(*) views, count(distinct "sessionId") visitors from "PageVisit" where ${W} and ${site} ${notTest} group by 1 order by 1`),
    raw<{ path: string; n: bigint; people: bigint }>(`select path, count(*) n, count(distinct "sessionId") people from "PageVisit" where ${W} and ${site} ${notTest} group by path order by n desc limit 300`),
    raw<{ label: string; n: bigint }>(`select label, count(*) n from "SiteEvent" where type = 'search' and ${W} ${notTest} group by label order by n desc limit 15`),
    raw<{ label: string; target: string | null; n: bigint }>(`select label, max(target) target, count(*) n from "SiteEvent" where type = 'click' and ${W} ${notTest} group by label order by n desc limit 15`),
    raw<{ device: string | null; n: bigint }>(`select device, count(distinct "sessionId") n from "SiteEvent" where ${W} ${notTest} group by device`),
    prisma.patient.count({ where: { createdAt: { gte: r.start, lte: r.end }, NOT: { id: { startsWith: "test_" } } } }),
    prisma.patient.count({ where: { createdAt: { gte: r.prevStart, lt: r.prevEnd }, NOT: { id: { startsWith: "test_" } } } }),
    raw<{ n: bigint }>(`select count(distinct "sessionId") n from "PageVisit" where ${W} and path like '/my-health/sign-up%' ${notTest}`),
    prisma.visitor.findMany({ where: { firstSeenAt: { gte: r.start, lte: r.end }, NOT: { id: { startsWith: "v_TEST" } } }, select: { referrer: true, userAgent: true }, take: 20000 }),
    prisma.albaMessage.findMany({ where: { role: "user", createdAt: { gte: r.start, lte: r.end } }, select: { text: true }, take: 20000 }),
  ]);

  const n = (x: bigint | number | undefined) => Number(x || 0);
  const visitors = n(totals[0]?.visitors), views = n(totals[0]?.views);
  const pv = n(prevTotals[0]?.visitors);
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

  const srcMap = new Map<string, number>(); let mobile = 0;
  for (const v of firstVisits) { srcMap.set(source(v.referrer), (srcMap.get(source(v.referrer)) || 0) + 1); if (/Mobi|Android|iPhone|iPad/i.test(v.userAgent || "")) mobile++; }

  const topicMap = new Map<string, number>();
  for (const m of msgs) for (const [t, re] of TOPICS) if (re.test(m.text)) topicMap.set(t, (topicMap.get(t) || 0) + 1);

  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, n: v }));
  const started = n(startedSignup[0]?.n);
  return {
    rangeLabel: r.label,
    totals: {
      visitors, views, visitorsChange: change(visitors, pv), signups, signupsChange: change(signups, prevSignups),
      conversion: visitors ? Math.round((signups / visitors) * 1000) / 10 : 0,
      searches: searches.reduce((a, s) => a + n(s.n), 0), neyuQuestions: msgs.length,
      mobileShare: firstVisits.length ? Math.round((mobile / firstVisits.length) * 100) : null,
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
    devices: devices.map((d) => ({ label: d.device === "mobile" ? "Phone / tablet" : "Computer", n: n(d.n) })),
    neyuTopics: sorted(topicMap).slice(0, 12),
    funnel: [
      { label: "Visited the website", n: visitors },
      { label: "Opened sign-up", n: started },
      { label: "Created an account", n: signups },
    ],
  };
}

export type InsightsDTO = Awaited<ReturnType<typeof insights>>;
