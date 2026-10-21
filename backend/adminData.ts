// Read models for the admin console. Every function returns display-ready
// data (see src/lib/admin/types.ts). Health details are NOT included in the
// base patient record — they are only returned by the reveal* functions,
// which the API calls after logging a reason (privacy by design, HIA).

import { prisma } from "@backend/db";
import { cached } from "@backend/kv";
import { parseJSON } from "@backend/patientData";
import { emailConfigured } from "@backend/email";
import { METRIC_DEFS, isMetricKey } from "@/lib/portal/metrics";
import { physicians } from "@/data/physicians";
import { locations } from "@/data/content";
import {
  fmtTime, fmtDate, fmtFull, fmtShort, fmtDay, fmtAgo, fmtMonthYear, minsAgo, initials, ageFrom, maskIp, parseUA, fmtNum, cap, shortCode, isTestId,
} from "@backend/adminFormat";
import type {
  QueueItem, OverviewDTO, AnalyticsDTO, PatientRow, Patient360DTO, ApptDTO, TimelineDTO, RefDTO, AuditDTO, HealthRevealDTO, LabDTO,
  AiRow, AiDetailDTO, AiKind, VisitorRow, VisitorDTO, SettingsDTO, BootDTO, SearchDTO, ActivityItem, Consent, Metric, FunnelStep, DeviceDTO,
} from "@/lib/admin/types";

// ── Small helpers ────────────────────────────────────────────────────────
const H = 3600000, D = 86400000;
const isTestVisitor = (id: string | null | undefined) => !!id && id.startsWith("v_TEST");
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();

const PROVIDERS: Record<string, string> = { apple: "Apple Watch", iphone: "iPhone (Apple Health)", withings: "Withings", oura: "Oura Ring", whoop: "WHOOP", garmin: "Garmin", fitbit: "Fitbit", android: "Android (Health Connect)", gfit: "Google Fit", manual: "Entered by patient", import: "Imported file" };
const providerName = (p: string) => PROVIDERS[p] || cap(p);

function consentOf(s: { shareWearables: boolean; shareLabs: boolean; shareRecords: boolean; albaAccess: boolean } | null): Consent {
  return s ? { wearables: s.shareWearables, labs: s.shareLabs, clinical: s.shareRecords, alba: s.albaAccess } : { wearables: true, labs: true, clinical: true, alba: true };
}

function deviceStatus(d: { status: string; lastSyncAt: Date | null }): DeviceDTO["status"] {
  if (d.status === "pending") return "Waiting for first sync";
  if (d.status !== "connected") return "Disconnected";
  return !d.lastSyncAt || Date.now() - d.lastSyncAt.getTime() > 48 * H ? "Not syncing" : "Connected";
}

const physicianByName = (name: string) => physicians.find((p) => p.name === name);
const specialtyFor = (clinician: string) => physicianByName(clinician)?.disciplines[0] || "—";

export function refStatus(s: string): RefDTO["status"] {
  return ({ received: "Received", reviewed: "Reviewed", scheduled: "Scheduled", closed: "Closed" } as const)[s as "received"] || "Received";
}
const REF_TYPE: Record<string, string> = { manual: "Web form", automatic: "Auto-filled from text", scan: "Scanned referral" };
const list = (json: string | null) => parseJSON<string[]>(json, []).filter((x) => typeof x === "string");
const physicianNames = (slugs: string | null) => list(slugs).map((s) => physicians.find((p) => p.slug === s)?.name || s);
const urgentRef = (u: string | null) => /asap|urgent/i.test(u || "") && !/semi/i.test(u || "");

type RangeKey = "7D" | "30D" | "90D" | "1Y" | "Custom";
export function parseRange(range: string | null, from?: string | null, to?: string | null) {
  const now = new Date();
  const days = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 }[range as "7D"];
  let start: Date, end = now, key = (range || "30D") as RangeKey;
  if (key === "Custom" && from && to && !isNaN(Date.parse(from)) && !isNaN(Date.parse(to))) {
    start = new Date(from + "T00:00:00-06:00");
    end = new Date(to + "T23:59:59-06:00");
    if (end < start) [start, end] = [end, start];
  } else {
    if (!days) key = "30D";
    start = new Date(now.getTime() - (days || 30) * D);
  }
  const len = end.getTime() - start.getTime();
  const s = fmtDate(start), e = fmtDate(end);
  const label = s.slice(-4) === e.slice(-4) ? `${s.slice(0, -6)} – ${e}` : `${s} – ${e}`;
  return { key, start, end, prevStart: new Date(start.getTime() - len), prevEnd: start, label, suffix: key === "Custom" ? "period" : key };
}

// ── Visitor lookups ──────────────────────────────────────────────────────
async function visitorIdsFor(sessionIds: string[]) {
  const uniq = [...new Set(sessionIds.filter(Boolean))];
  if (!uniq.length) return new Map<string, string>();
  const rows = await prisma.visitor.findMany({ where: { sessionId: { in: uniq } }, select: { id: true, sessionId: true } });
  return new Map(rows.map((r) => [r.sessionId, r.id]));
}

// ── Work queue ───────────────────────────────────────────────────────────
const PRIO: Record<string, number> = { Emergency: 0, High: 1, Normal: 2, Low: 3 };

// Queue rules shared by the list and the badge counts. Unverified sign-ups older than
// 30 days drop off the queue (stale; the list would otherwise grow without end).
const UNVERIFIED = (now: number) => ({ emailVerifiedAt: null, accountStatus: "active", createdAt: { lte: new Date(now - 48 * H), gte: new Date(now - 30 * D) } });
const STALE_DEVICE = (now: number) => ({ status: "connected", OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(now - 48 * H) } }] });

/** Badge numbers without loading the rows (boot runs on every page load of the console). */
export async function queueCounts() {
  const now = Date.now();
  const [emergency, refs, resched, labs, prep, unverified, devices] = await Promise.all([
    prisma.symptomCheckLog.count({ where: { emergency: true, reviewedAt: null } }).then((n) => Math.min(n, 50)),
    prisma.referralSubmission.count({ where: { status: "received" } }).then((n) => Math.min(n, 200)),
    prisma.appointment.count({ where: { rescheduleRequestedAt: { not: null }, status: "scheduled" } }).then((n) => Math.min(n, 200)),
    prisma.labResult.count({ where: { status: "pending" } }).then((n) => Math.min(n, 200)),
    prisma.appointment.count({ where: { prepSavedAt: { not: null }, prepReviewedAt: null, status: "scheduled", startsAt: { gte: new Date(now - 12 * H) } } }),
    prisma.patient.count({ where: UNVERIFIED(now) }).then((n) => Math.min(n, 200)),
    prisma.deviceConnection.count({ where: STALE_DEVICE(now) }).then((n) => Math.min(n, 200)),
  ]);
  return { total: emergency + refs + resched + labs + prep + unverified + devices, emergency };
}

export async function loadQueue(): Promise<QueueItem[]> {
  const now = Date.now();
  const [emerg, refs, resched, labs, prep, unverified, devices] = await Promise.all([
    prisma.symptomCheckLog.findMany({ where: { emergency: true, reviewedAt: null }, orderBy: { createdAt: "desc" }, take: 50, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.referralSubmission.findMany({ where: { status: "received" }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.appointment.findMany({ where: { rescheduleRequestedAt: { not: null }, status: "scheduled" }, take: 200, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.labResult.findMany({ where: { status: "pending" }, include: { patient: { select: { id: true, firstName: true, lastName: true } } }, take: 200 }),
    prisma.appointment.findMany({ where: { prepSavedAt: { not: null }, prepReviewedAt: null, status: "scheduled", startsAt: { gte: new Date(now - 12 * H) } }, include: { patient: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { questions: true } } } }),
    prisma.patient.findMany({ where: UNVERIFIED(now), select: { id: true, firstName: true, lastName: true, createdAt: true, lockedUntil: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.deviceConnection.findMany({ where: STALE_DEVICE(now), take: 200, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
  ]);
  const vmap = await visitorIdsFor(emerg.filter((e) => !e.patient).map((e) => e.sessionId));
  const items: QueueItem[] = [];

  for (const e of emerg) {
    const vid = vmap.get(e.sessionId) || null;
    items.push({
      id: "sym:" + e.id, type: "urgent", label: "Emergency-flagged symptom check",
      who: e.patient ? fullName(e.patient) : `Visitor ${vid || "(unknown)"}`, whoId: e.patient?.id || vid, whoKind: e.patient ? "patient" : vid ? "visitor" : "none",
      test: isTestId(e.id), time: fmtShort(e.createdAt, true), mins: minsAgo(e.createdAt), priority: "Emergency",
      status: "New · unreviewed", owner: "Unassigned", action: "Review", detail: e.description, aiId: "symptom:" + e.id,
    });
  }
  for (const r of refs) {
    const spec = list(r.specialties)[0] || "Referral";
    items.push({
      id: "ref:" + r.id, type: "referrals", label: "New referral · " + spec, who: r.patientName || "(no name)", whoId: r.patientId, whoKind: r.patientId ? "patient" : "none",
      test: isTestId(r.id), time: fmtShort(r.createdAt, true), mins: minsAgo(r.createdAt), priority: urgentRef(r.urgency) ? "High" : "Normal",
      status: "Received · " + (r.urgency || "—"), owner: r.reviewedBy || "Unassigned", action: "Review",
      detail: `${shortCode("R", r.id)} from ${r.referringPhysician || "unknown physician"}`, refId: r.id,
    });
  }
  for (const a of resched) {
    items.push({
      id: "res:" + a.id, type: "appointments", label: "Reschedule request", who: fullName(a.patient), whoId: a.patient.id, whoKind: "patient", test: isTestId(a.patient.id),
      time: fmtShort(a.rescheduleRequestedAt!, true), mins: minsAgo(a.rescheduleRequestedAt), priority: a.startsAt.getTime() - now < 3 * D ? "High" : "Normal",
      status: "Requested", owner: "Front desk", action: "Resolve", detail: `Move ${fmtShort(a.startsAt, true).replace("Today, ", "today ")} visit with ${a.clinician}`, targetId: a.id,
    });
  }
  for (const l of labs) {
    items.push({
      id: "lab:" + l.id, type: "labs", label: "Pending lab", who: fullName(l.patient), whoId: l.patient.id, whoKind: "patient", test: isTestId(l.patient.id),
      time: fmtShort(l.createdAt, true), mins: minsAgo(l.createdAt), priority: l.expectedAt && l.expectedAt.getTime() < now ? "High" : "Normal",
      status: "Awaiting result", owner: "Unassigned", action: "Open labs", detail: `${l.name} · ${l.source}`, targetId: l.id,
    });
  }
  for (const a of prep) {
    const q = a._count.questions;
    items.push({
      id: "prep:" + a.id, type: "prep", label: "Visit-prep submission", who: fullName(a.patient), whoId: a.patient.id, whoKind: "patient", test: isTestId(a.patient.id),
      time: fmtShort(a.prepSavedAt!, true), mins: minsAgo(a.prepSavedAt), priority: a.startsAt.getTime() - now < 2 * D ? "High" : "Normal",
      status: "Submitted", owner: "Unassigned", action: "Mark reviewed", detail: `${q ? q + " question" + (q > 1 ? "s" : "") : "Sharing choices"} for ${fmtShort(a.startsAt)} visit`, targetId: a.id,
    });
  }
  for (const p of unverified) {
    const locked = !!p.lockedUntil && p.lockedUntil.getTime() > now;
    items.push({
      id: "acct:" + p.id, type: "accounts", label: "Unverified account", who: fullName(p), whoId: p.id, whoKind: "patient", test: isTestId(p.id),
      time: fmtShort(p.createdAt), mins: minsAgo(p.createdAt), priority: "Low", status: "Email not verified" + (locked ? " · locked" : ""),
      owner: "Unassigned", action: "Resend verification", detail: "Signed up " + fmtShort(p.createdAt), targetId: p.id,
    });
  }
  for (const d of devices) {
    const days = d.lastSyncAt ? Math.round((now - d.lastSyncAt.getTime()) / D) : null;
    items.push({
      id: "dev:" + d.id, type: "devices", label: "Device not syncing", who: fullName(d.patient), whoId: d.patient.id, whoKind: "patient", test: isTestId(d.patient.id),
      time: days == null ? "Never synced" : `${days} day${days === 1 ? "" : "s"}`, mins: minsAgo(d.lastSyncAt || d.connectedAt || d.createdAt), priority: days != null && days >= 4 ? "Normal" : "Low",
      status: d.lastSyncAt ? "Last sync " + fmtShort(d.lastSyncAt) : "No sync yet", owner: "Unassigned", action: "Send reminder", detail: providerName(d.provider), targetId: d.id,
    });
  }
  return items.sort((a, b) => PRIO[a.priority] - PRIO[b.priority] || a.mins - b.mins);
}

// ── Analytics ────────────────────────────────────────────────────────────
// Distinct people (browser sessions) are counted inside PostgreSQL — never loaded into
// memory (a year at 5,000 visitors a day is millions of rows).
const AI_TABLES = ["SymptomCheckLog", "AlbaConversation", "LongevityAssessment", "LabResultCheck"];
async function sessionCounts(start: Date, end: Date) {
  const inR = `"createdAt" >= $1 and "createdAt" < $2 and "sessionId" not like 'test\\_%'`;
  const ai = AI_TABLES.map((t) => `select "sessionId" from "${t}" where ${inR}`).join(" union ");
  const rows = await prisma.$queryRawUnsafe<{ visitors: bigint; ai: bigint }[]>(
    `with ai as (${ai}),
          everyone as (select "sessionId" from "PageVisit" where ${inR} union select "sessionId" from ai)
     select (select count(*) from everyone) visitors, (select count(*) from ai) ai`, start, end);
  return { visitors: Number(rows[0]?.visitors || 0), aiUsers: Number(rows[0]?.ai || 0) };
}
const notTest = { NOT: { id: { startsWith: "test_" } } };

async function periodCounts(start: Date, end: Date) {
  const inR = { gte: start, lt: end };
  const [sessions, signups, verified, devices, referrals, sc, al, la, lc, out] = await Promise.all([
    sessionCounts(start, end),
    prisma.patient.count({ where: { createdAt: inR, ...notTest } }),
    prisma.patient.count({ where: { emailVerifiedAt: inR, ...notTest } }),
    prisma.deviceConnection.count({ where: { connectedAt: inR, status: "connected", NOT: { patientId: { startsWith: "test_" } } } }),
    prisma.referralSubmission.count({ where: { createdAt: inR, ...notTest } }),
    prisma.symptomCheckLog.count({ where: { createdAt: inR, ...notTest } }),
    prisma.albaConversation.count({ where: { createdAt: inR, ...notTest } }),
    prisma.longevityAssessment.count({ where: { createdAt: inR, ...notTest } }),
    prisma.labResultCheck.count({ where: { createdAt: inR, ...notTest } }),
    prisma.outboundClick.count({ where: { createdAt: inR, NOT: { sessionId: { startsWith: "test_" } } } }),
  ]);
  return { visitors: sessions.visitors, aiUsers: sessions.aiUsers, signups, verified, devices, referrals, ai: sc + al + la + lc, sc, al, la, lc, out };
}

function delta(cur: number, prev: number, suffix: string) {
  if (!prev) return cur ? "New this period" : "No change";
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs previous ${suffix}`;
}

async function metricsAndFunnel(r: ReturnType<typeof parseRange>): Promise<{ metrics: Metric[]; funnel: FunnelStep[]; cur: Awaited<ReturnType<typeof periodCounts>> }> {
  const [cur, prev] = await Promise.all([periodCounts(r.start, r.end), periodCounts(r.prevStart, r.prevEnd)]);
  const metrics: Metric[] = ([
    ["Visitors", cur.visitors, prev.visitors], ["Sign-ups", cur.signups, prev.signups], ["Verified accounts", cur.verified, prev.verified],
    ["Connected devices", cur.devices, prev.devices], ["Referrals", cur.referrals, prev.referrals], ["AI activity", cur.ai, prev.ai], ["Went to partner sites", cur.out, prev.out],
  ] as [string, number, number][]).map(([label, n, p]) => ({ label, n: fmtNum(n), d: delta(n, p, r.suffix) }));

  // Cohort funnel for people who arrived in this range.
  const inR = { gte: r.start, lt: r.end };
  const cohort = { createdAt: inR, ...notTest };
  const [signedUp, verifiedN, deviceN, bookedN] = await Promise.all([
    prisma.patient.count({ where: cohort }),
    prisma.patient.count({ where: { ...cohort, emailVerifiedAt: { not: null } } }),
    prisma.patient.count({ where: { ...cohort, devices: { some: { status: "connected" } } } }),
    prisma.patient.count({ where: { ...cohort, appointments: { some: {} } } }),
  ]);
  const steps: [string, number][] = [
    ["Visitors", cur.visitors], ["Used an AI tool", cur.aiUsers], ["Signed up", signedUp],
    ["Verified", verifiedN], ["Connected device", deviceN], ["Booked visit", bookedN],
  ];
  const top = Math.max(steps[0][1], 1);
  const funnel = steps.map(([label, n], i) => ({
    label, n: fmtNum(n), notFirst: i > 0,
    pct: i === 0 ? "100%" : Math.min(100, Math.round((n / top) * 100)) + "%",
    conv: i === 0 ? "" : steps[i - 1][1] ? Math.round((n / steps[i - 1][1]) * 100) + "% of previous" : "—",
    w: Math.max(8, Math.min(100, (n / top) * 100)) + "%",
  }));
  return { metrics, funnel, cur };
}

/** Overview numbers and funnel only (heavy part, cached). */
export async function overviewNumbers(range: string | null, from?: string | null, to?: string | null) {
  const { metrics, funnel } = await metricsAndFunnel(parseRange(range, from, to));
  return { metrics, funnel };
}

export async function overview(range: string | null, from?: string | null, to?: string | null): Promise<OverviewDTO> {
  const r = parseRange(range, from, to);
  // Numbers come from the stats cache (kept warm in the background); the work queue and activity stay live.
  const { statsCache } = await import("@backend/statsWarm");
  const c = statsCache("overview", range, from, to);
  const [queue, mf, activity] = await Promise.all([loadQueue(), cached(c.key, c.ttl, () => overviewNumbers(range, from, to)), activityFeed(6)]);
  return { queue, metrics: mf.metrics, funnel: mf.funnel, rangeLabel: r.label, activity };
}

export async function analytics(range: string | null, from?: string | null, to?: string | null): Promise<AnalyticsDTO> {
  const r = parseRange(range, from, to);
  const inR = { gte: r.start, lt: r.end };
  const [mf, refs, pages, outs] = await Promise.all([
    metricsAndFunnel(r),
    prisma.referralSubmission.findMany({ where: { createdAt: r.key === "7D" ? inR : { gte: new Date(Date.now() - 84 * D) }, ...notTest }, select: { createdAt: true, specialties: true, urgency: true } }),
    prisma.pageVisit.groupBy({ by: ["path"], where: { createdAt: inR, NOT: { sessionId: { startsWith: "test_" } } }, _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 5 }),
    prisma.outboundClick.groupBy({ by: ["host"], where: { createdAt: inR, NOT: { sessionId: { startsWith: "test_" } } }, _count: { host: true }, orderBy: { _count: { host: "desc" } } }),
  ]);
  const bars = (rows: [string, number][]) => { const m = Math.max(1, ...rows.map((x) => x[1])); return rows.map(([label, v]) => ({ label, v: fmtNum(v), w: (v / m) * 100 + "%" })); };

  // Referrals by week (12 weeks) or by day (7D)
  const nb = r.key === "7D" ? 7 : 12, span = r.key === "7D" ? D : 7 * D, endT = r.key === "7D" ? r.end.getTime() : Date.now();
  const buckets = Array.from({ length: nb }, () => 0);
  refs.forEach((x) => { const i = nb - 1 - Math.floor((endT - x.createdAt.getTime()) / span); if (i >= 0 && i < nb) buckets[i]++; });
  const wmax = Math.max(1, ...buckets);
  const weekly = buckets.map((v, i) => {
    const s = new Date(endT - (nb - i) * span);
    return { v, h: Math.max(2, (v / wmax) * 100) + "%", label: r.key === "7D" ? s.toLocaleDateString("en-US", { timeZone: "America/Edmonton", weekday: "narrow" }) : String(i + 1), tip: `${v} referral${v === 1 ? "" : "s"} · ${r.key === "7D" ? "" : "week of "}${fmtShort(new Date(s.getTime() + (r.key === "7D" ? span : 0)))}` };
  });

  const inRange = refs.filter((x) => x.createdAt >= r.start && x.createdAt < r.end);
  const spec = new Map<string, number>(), urg = new Map<string, number>();
  inRange.forEach((x) => { const l = list(x.specialties); (l.length ? l : ["Not specified"]).forEach((s) => spec.set(s, (spec.get(s) || 0) + 1)); const u = x.urgency || "Not specified"; urg.set(u, (urg.get(u) || 0) + 1); });

  const PARTNER: Record<string, [string, string]> = {
    "bioarolabs.com": ["BioAro Labs", "Lab booking and results"], "bioarolabs.ca": ["BioAro Labs", "Lab booking and results"],
    "bioarodrugs.com": ["BioAro Drugs", "Prescriptions and refills"], "bioarodrugs.ca": ["BioAro Drugs", "Prescriptions and refills"],
    "albertahealthservices.ca": ["Alberta Health Services", "Emergency and public health info"],
  };
  const named = new Map<string, { label: string; domain: string; why: string; v: number }>();
  let other = 0;
  outs.forEach((o) => {
    const p = PARTNER[o.host];
    if (p) { const cur = named.get(p[0]) || { label: p[0], domain: o.host, why: p[1], v: 0 }; cur.v += o._count.host; named.set(p[0], cur); }
    else other += o._count.host;
  });
  const outRows = [...named.values()].sort((a, b) => b.v - a.v);
  if (other) outRows.push({ label: "Other sites", domain: "—", why: "Maps, insurers, other links", v: other });
  const outTotal = outRows.reduce((a, x) => a + x.v, 0), outMax = Math.max(1, ...outRows.map((x) => x.v));

  return {
    metrics: mf.metrics, funnel: mf.funnel, rangeLabel: r.label, weekly,
    bySpec: bars([...spec.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)),
    byUrg: bars([...urg.entries()].sort((a, b) => b[1] - a[1])),
    topPages: bars(pages.map((p) => [p.path, p._count.path])),
    aiUse: bars([["Neyu conversations", mf.cur.al], ["Symptom checks", mf.cur.sc], ["Assessments", mf.cur.la], ["Lab explainers", mf.cur.lc]]),
    outbound: outRows.map((o) => ({ label: o.label, domain: o.domain, why: o.why, v: fmtNum(o.v), w: (o.v / outMax) * 100 + "%", pct: outTotal ? Math.round((o.v / outTotal) * 100) + "%" : "0%" })),
    outTotalL: fmtNum(outTotal), outPctL: mf.cur.visitors ? Math.round((outTotal / mf.cur.visitors) * 100) + "% of visitors" : "—",
  };
}

// ── Recent activity (Overview) ───────────────────────────────────────────
export async function activityFeed(take = 6): Promise<ActivityItem[]> {
  const [refs, devs, convs, labs, res, pts] = await Promise.all([
    prisma.referralSubmission.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, patientName: true } }),
    prisma.deviceConnection.findMany({ where: { connectedAt: { not: null } }, orderBy: { connectedAt: { sort: "desc", nulls: "last" } }, take, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.albaConversation.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, createdAt: true, sessionId: true, patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.labResult.findMany({ orderBy: { createdAt: "desc" }, take, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.appointment.findMany({ where: { rescheduleRequestedAt: { not: null } }, orderBy: { rescheduleRequestedAt: "desc" }, take, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.patient.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, firstName: true, lastName: true, createdAt: true } }),
  ]);
  const vmap = await visitorIdsFor(convs.filter((c) => !c.patient).map((c) => c.sessionId));
  const items: ActivityItem[] = [
    ...refs.map((r) => ({ at: r.createdAt.getTime(), time: fmtDay(r.createdAt) === "Today" ? fmtTime(r.createdAt) : fmtDay(r.createdAt), title: "Referral received", who: `${r.patientName || "(no name)"} · ${shortCode("R", r.id)}`, icon: "ph-arrow-square-in", go: { ref: r.id } })),
    ...devs.map((d) => ({ at: d.connectedAt!.getTime(), time: fmtDay(d.connectedAt!) === "Today" ? fmtTime(d.connectedAt!) : fmtDay(d.connectedAt!), title: `Patient connected ${providerName(d.provider)}`, who: fullName(d.patient), icon: "ph-watch", go: { s: "patient" as const, id: d.patient.id, tab: "devices" } })),
    ...convs.map((c) => ({ at: c.createdAt.getTime(), time: fmtDay(c.createdAt) === "Today" ? fmtTime(c.createdAt) : fmtDay(c.createdAt), title: "Neyu conversation", who: c.patient ? fullName(c.patient) : `Visitor ${vmap.get(c.sessionId) || ""}`.trim(), icon: "ph-chat-circle-dots", go: { ai: "alba:" + c.id } })),
    ...labs.map((l) => ({ at: l.createdAt.getTime(), time: fmtDay(l.createdAt) === "Today" ? fmtTime(l.createdAt) : fmtDay(l.createdAt), title: l.status === "pending" ? "Pending lab added" : "Lab result added", who: fullName(l.patient), icon: "ph-flask", go: { s: "patient" as const, id: l.patient.id, tab: "labs" } })),
    ...res.map((a) => ({ at: a.rescheduleRequestedAt!.getTime(), time: fmtDay(a.rescheduleRequestedAt!) === "Today" ? fmtTime(a.rescheduleRequestedAt!) : fmtDay(a.rescheduleRequestedAt!), title: "Appointment reschedule requested", who: fullName(a.patient), icon: "ph-calendar-x", go: { s: "patient" as const, id: a.patient.id, tab: "appointments" } })),
    ...pts.map((p) => ({ at: p.createdAt.getTime(), time: fmtDay(p.createdAt) === "Today" ? fmtTime(p.createdAt) : fmtDay(p.createdAt), title: "New My Health Space account", who: fullName(p), icon: "ph-user-plus", go: { s: "patient" as const, id: p.id } })),
  ];
  return items.sort((a, b) => b.at - a.at).slice(0, take);
}

// ── Patients ─────────────────────────────────────────────────────────────
const patientListSelect = {
  id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
  lockedUntil: true, accountStatus: true,
  settings: { select: { shareWearables: true, shareLabs: true, shareRecords: true, albaAccess: true } },
  devices: { where: { status: "connected" }, select: { id: true, lastSyncAt: true } },
  careTeam: { select: { location: true }, take: 1 },
  sessions: { orderBy: { lastSeenAt: "desc" as const }, take: 1, select: { lastSeenAt: true } },
  appointments: { where: { status: "scheduled", startsAt: { gte: new Date(0) } }, orderBy: { startsAt: "asc" as const }, select: { startsAt: true, location: true } },
} as const;

type PatientListRow = Awaited<ReturnType<typeof loadPatientRows>>[number];
async function loadPatientRows(where: object = {}) {
  return prisma.patient.findMany({ where, select: patientListSelect, orderBy: { createdAt: "desc" }, take: 2000 });
}

function toPatientRow(p: PatientListRow): PatientRow {
  const now = Date.now();
  const next = p.appointments.find((a) => a.startsAt.getTime() >= now - 2 * H);
  const lastSeen = [p.sessions[0]?.lastSeenAt, p.lastLoginAt].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
  const acct = p.accountStatus === "deactivated" ? "Deactivated" : p.accountStatus === "deletion_requested" ? "Deletion requested" : "Active";
  return {
    id: p.id, name: fullName(p), initials: initials(p.firstName, p.lastName.replace(/\s*\(test\)\s*/i, "")), email: p.email, phone: p.phone || "—",
    age: ageFrom(p.dateOfBirth), verified: !!p.emailVerifiedAt, lastActive: fmtAgo(lastSeen), lastMins: minsAgo(lastSeen),
    devices: p.devices.length, staleDevice: p.devices.some((d) => !d.lastSyncAt || now - d.lastSyncAt.getTime() > 48 * H), consent: consentOf(p.settings),
    nextAppt: next ? fmtShort(next.startsAt, true).replace(/^Today, /, "Today, ") : "—", nextApptAt: next ? next.startsAt.getTime() : null,
    since: fmtMonthYear(p.createdAt), home: p.careTeam[0]?.location || next?.location || p.appointments[0]?.location || "—",
    locked: !!p.lockedUntil && p.lockedUntil.getTime() > now, acct, test: isTestId(p.id),
  };
}

export async function patientsList(): Promise<PatientRow[]> {
  return (await loadPatientRows()).map(toPatientRow);
}

function apptDTO(a: { id: string; title: string; clinician: string; location: string; startsAt: Date; status: string; prepShareTrends: boolean; prepShareResults: boolean; prepSavedAt: Date | null; rescheduleRequestedAt: Date | null; staffNotes: string | null }): ApptDTO {
  const upcoming = a.status === "scheduled" && a.startsAt.getTime() >= Date.now() - 2 * H;
  const prep = !a.prepSavedAt ? "Not yet shared" : a.prepShareTrends && a.prepShareResults ? "Wearables and labs shared" : a.prepShareResults ? "Labs only" : a.prepShareTrends ? "Wearables only" : "Not shared";
  return {
    id: a.id, clinician: a.clinician, specialty: specialtyFor(a.clinician), date: fmtDate(a.startsAt), time: fmtTime(a.startsAt), location: a.location, type: a.title,
    status: a.status === "completed" ? "Completed" : a.status === "cancelled" ? "Cancelled" : a.rescheduleRequestedAt ? "Reschedule requested" : "Confirmed",
    prep, notes: a.staffNotes || "", upcoming, startsAt: a.startsAt.toISOString(), rescheduleRequested: !!a.rescheduleRequestedAt, prepSubmitted: !!a.prepSavedAt,
  };
}

async function protocolRates(patientId: string, items: { id: string; startedAt: Date }[]) {
  const since = new Date(Date.now() - 30 * D);
  const logs = await prisma.protocolLog.groupBy({ by: ["itemId"], where: { patientId, doneAt: { gte: since } }, _count: { itemId: true } });
  const m = new Map(logs.map((l) => [l.itemId, l._count.itemId]));
  return new Map(items.map((it) => {
    const days = Math.min(30, Math.max(1, Math.ceil((Date.now() - Math.max(it.startedAt.getTime(), since.getTime())) / D)));
    return [it.id, { rate: Math.min(100, Math.round(((m.get(it.id) || 0) / days) * 100)), hasRate: Date.now() - it.startedAt.getTime() > D }];
  }));
}

export function auditDTO(e: { id: string; actor: string; role: string; kind: string; action: string; resource: string; subject: string | null; subjectId: string | null; subjectType: string | null; createdAt: Date; ip: string | null; result: string; reason: string | null; before: string | null; after: string | null }): AuditDTO {
  return {
    id: e.id, who: e.actor, role: e.role, kind: e.kind as AuditDTO["kind"], action: e.action, resource: e.resource, subject: e.subject || "—",
    subjectId: e.subjectId, subjectType: e.subjectType, ts: fmtFull(e.createdAt), ip: maskIp(e.ip), result: e.result, reason: e.reason || "", before: e.before || "", after: e.after || "",
  };
}

export function refDTO(r: {
  id: string; type: string; patientName: string | null; patientPhone: string | null; referringPhysician: string | null; referringPhone: string | null; referringAddress: string | null;
  urgency: string | null; specialties: string | null; physicianSlugs: string | null; exams: string | null; clinicalNotes: string | null; sourceText: string | null; sessionId: string;
  createdAt: Date; patientId: string | null; status: string; reviewedAt: Date | null; reviewedBy: string | null; scheduledAt: Date | null; staffNote: string | null;
}, history: RefDTO["history"] = [], visitorId: string | null = null): RefDTO {
  const req = physicianNames(r.physicianSlugs);
  return {
    id: r.id, code: shortCode("R", r.id), pid: r.patientId, patient: r.patientName || "(no name)", test: isTestId(r.id) || isTestId(r.patientId),
    type: REF_TYPE[r.type] || cap(r.type), urgency: r.urgency || "Not specified", specialty: list(r.specialties).join(", ") || "Not specified",
    requested: req.length ? req.join(", ") : "Any physician", referring: r.referringPhysician || "—", status: refStatus(r.status),
    received: fmtShort(r.createdAt, true), mins: minsAgo(r.createdAt), scheduled: r.scheduledAt ? fmtShort(r.scheduledAt, true) : "—",
    reviewer: r.reviewedBy || "—", exams: list(r.exams).join(", ") || "—", notes: r.clinicalNotes || "—", staffNote: r.staffNote || "",
    sourceText: r.sourceText || "", phone: r.patientPhone || "—", referringPhone: r.referringPhone || "—", referringAddress: r.referringAddress || "—", visitorId,
    history: history.length ? history : [{ status: "Received", when: fmtShort(r.createdAt, true), by: REF_TYPE[r.type] || "Referral Centre" }],
  };
}

async function refHistories(ids: string[]) {
  if (!ids.length) return new Map<string, RefDTO["history"]>();
  const ev = await prisma.adminAuditEvent.findMany({ where: { subjectType: "referral", subjectId: { in: ids }, kind: "Change", after: { startsWith: "Status: " } }, orderBy: { createdAt: "asc" }, select: { subjectId: true, after: true, createdAt: true, actor: true } });
  const m = new Map<string, RefDTO["history"]>();
  ev.forEach((e) => { const l = m.get(e.subjectId!) || []; l.push({ status: e.after!.replace("Status: ", ""), when: fmtShort(e.createdAt, true), by: e.actor }); m.set(e.subjectId!, l); });
  return m;
}

export async function patient360(id: string): Promise<Patient360DTO | null> {
  const p = await prisma.patient.findUnique({
    where: { id },
    select: {
      ...patientListSelect,
      appointments: { orderBy: { startsAt: "asc" }, select: { id: true, title: true, clinician: true, location: true, startsAt: true, status: true, prepShareTrends: true, prepShareResults: true, prepSavedAt: true, rescheduleRequestedAt: true, staffNotes: true, createdAt: true } },
      careTeam: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true, physicianSlug: true, location: true } },
      goals: { orderBy: { sortOrder: "asc" }, select: { label: true } },
      visitQuestions: { orderBy: { createdAt: "asc" }, select: { text: true, appointmentId: true } },
      protocolItems: { where: { endedAt: null }, orderBy: [{ slot: "asc" }, { sortOrder: "asc" }], select: { id: true, title: true, dose: true, slot: true, guidance: true, source: true, active: true, pausedAt: true, startedAt: true } },
      devices: { select: { id: true, provider: true, status: true, lastSyncAt: true, connectedAt: true, dataTypes: true } },
      sessions: { where: { expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, select: { id: true, userAgent: true, ip: true, lastSeenAt: true } },
      visitors: { select: { id: true, firstSeenAt: true, landingPath: true, userAgent: true, sessionId: true } },
      _count: { select: { labResults: true, symptomChecks: true, conversations: true, assessments: true, labChecks: true } },
      pushDevices: { select: { platform: true, createdAt: true } },
    },
  });
  if (!p) return null;
  const row = toPatientRow({ ...p, devices: p.devices.filter((d) => d.status === "connected"), careTeam: p.careTeam, sessions: p.sessions, appointments: p.appointments.filter((a) => a.status === "scheduled") } as any);
  const appts = p.appointments.map(apptDTO);
  const upcoming = appts.filter((a) => a.upcoming);
  const nextId = upcoming[0]?.id;
  const rates = await protocolRates(p.id, p.protocolItems.map((x) => ({ id: x.id, startedAt: x.startedAt })));

  const refs = await prisma.referralSubmission.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" } });
  const [audits, symptoms, convs, assessments, labChecks, labs, readings] = await Promise.all([
    prisma.adminAuditEvent.findMany({ where: { OR: [{ subjectType: "patient", subjectId: p.id }, { subjectType: "referral", subjectId: { in: refs.map((r) => r.id) } }] }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.symptomCheckLog.findMany({ where: { patientId: p.id }, select: { id: true, createdAt: true, emergency: true, reviewedAt: true } }),
    prisma.albaConversation.findMany({ where: { patientId: p.id }, select: { id: true, createdAt: true } }),
    prisma.longevityAssessment.findMany({ where: { patientId: p.id }, select: { id: true, createdAt: true } }),
    prisma.labResultCheck.findMany({ where: { patientId: p.id }, select: { id: true, createdAt: true } }),
    prisma.labResult.findMany({ where: { patientId: p.id }, select: { createdAt: true, source: true, panel: true, status: true } }),
    prisma.healthReading.findMany({ where: { patientId: p.id, source: "clinic" }, select: { id: true, metric: true, recordedAt: true } }),
  ]);
  const hist = await refHistories(refs.map((r) => r.id));
  const created = p.createdAt.getTime();
  const pre = (d: Date) => d.getTime() < created;

  // Timeline — everything that happened, newest first. Health values are not shown here.
  const tl: TimelineDTO[] = [];
  const add = (at: Date, title: string, source: string, icon: string, tone: TimelineDTO["tone"], detail: string) =>
    tl.push({ id: `t${tl.length}`, at: at.getTime(), date: fmtDate(at), time: fmtTime(at), title, source, icon, tone, detail, pre: pre(at) && !/^Signed up/.test(title) });
  add(p.createdAt, p.emailVerifiedAt ? "Signed up and verified" : "Signed up · verification pending", "My Health Space", "ph-user-check", "teal",
    p.visitors.length ? `Visitor ${p.visitors.map((v) => v.id).join(", ")} history merged into this record` : "Account created");
  p.visitors.forEach((v) => add(v.firstSeenAt, "First visit to the website", "Website", "ph-globe", "neutral", `Landed on ${v.landingPath || "/"} · visitor ${v.id}`));
  symptoms.forEach((s) => add(s.createdAt, s.emergency ? "Emergency-flagged symptom check" : "Symptom check", "Neyu", s.emergency ? "ph-warning-circle" : "ph-stethoscope", s.emergency ? "urgent" : "ai",
    s.emergency ? (s.reviewedAt ? "Reviewed by staff" : "Patient was shown emergency guidance. Not yet reviewed.") : "Details are in AI & Assessments"));
  convs.forEach((c) => add(c.createdAt, "Neyu conversation", "Neyu", "ph-chat-circle-dots", "ai", "Details are in AI & Assessments"));
  assessments.forEach((a) => add(a.createdAt, "Longevity assessment completed", "Neyu", "ph-clipboard-text", "ai", pre(a.createdAt) ? "Completed anonymously before sign-up" : "Details are in AI & Assessments"));
  labChecks.forEach((l) => add(l.createdAt, "Lab explainer used", "Neyu", "ph-flask", "ai", "Details are in AI & Assessments"));
  const labGroups = new Map<string, { at: Date; source: string; n: number; panels: Set<string>; pending: number }>();
  labs.forEach((l) => { const k = `${l.createdAt.toISOString().slice(0, 16)}|${l.source}`; const g = labGroups.get(k) || { at: l.createdAt, source: l.source, n: 0, panels: new Set(), pending: 0 }; g.n++; if (l.panel) g.panels.add(l.panel); if (l.status === "pending") g.pending++; labGroups.set(k, g); });
  labGroups.forEach((g) => add(g.at, g.pending === g.n ? "Pending lab ordered" : "Lab result received", g.source, "ph-flask", "teal", `${[...g.panels].join(" and ") || "Results"} · ${g.n} result${g.n > 1 ? "s" : ""}`));
  readings.forEach((r) => add(r.recordedAt, `Clinic reading added · ${isMetricKey(r.metric) ? METRIC_DEFS[r.metric].name : r.metric}`, "Clinic", "ph-heartbeat", "teal", "Value is in Health Data"));
  p.appointments.forEach((a) => {
    add(a.createdAt, "Appointment booked", "Staff", "ph-calendar-check", "teal", `${fmtDate(a.startsAt)}, ${fmtTime(a.startsAt)} with ${a.clinician} · ${a.location}`);
    if (a.rescheduleRequestedAt) add(a.rescheduleRequestedAt, "Appointment reschedule requested", "My Health Space", "ph-calendar-x", "teal", `${fmtDate(a.startsAt)} with ${a.clinician}`);
    if (a.prepSavedAt) add(a.prepSavedAt, "Visit prep submitted", "My Health Space", "ph-list-checks", "teal", `For ${fmtDate(a.startsAt)} visit`);
  });
  p.devices.forEach((d) => {
    if (d.connectedAt) add(d.connectedAt, `${providerName(d.provider)} connected`, "Wearable", "ph-watch", "neutral", parseJSON<string[]>(d.dataTypes, []).map((k) => (isMetricKey(k) ? METRIC_DEFS[k].name : k)).slice(0, 6).join(", ") || "Waiting for first sync");
    if (d.lastSyncAt) add(d.lastSyncAt, `${providerName(d.provider)} synced`, "Wearable", "ph-watch", "neutral", "Latest data received");
  });
  refs.forEach((r) => add(r.createdAt, "Referral received", "Referral", "ph-arrow-square-in", "teal", `${shortCode("R", r.id)} · ${list(r.specialties).join(", ") || "Referral"} · from ${r.referringPhysician || "unknown"}`));
  const SKIP = new Set(["Added lab result", "Booked appointment", "Added clinic reading"]);
  audits.filter((e) => (e.kind === "Change" || e.kind === "Account") && !SKIP.has(e.action)).forEach((e) =>
    add(e.createdAt, e.action, "Staff", e.kind === "Account" ? "ph-user-gear" : "ph-pencil-simple", "teal", `${e.resource}${e.after ? " · " + e.after : ""} · by ${e.actor}`));
  tl.sort((a, b) => b.at - a.at);

  const devices: DeviceDTO[] = p.devices.filter((d) => d.status !== "disconnected").map((d) => ({
    id: d.id, name: providerName(d.provider), status: deviceStatus(d), lastSync: fmtAgo(d.lastSyncAt),
    data: parseJSON<string[]>(d.dataTypes, []).map((k) => (isMetricKey(k) ? METRIC_DEFS[k].name : k)).join(", ") || "No data shared yet",
  }));

  return {
    ...row, upcoming, past: appts.filter((a) => !a.upcoming).reverse(),
    questions: p.visitQuestions.filter((q) => !q.appointmentId || q.appointmentId === nextId).map((q) => q.text),
    care: p.careTeam.map((c) => { const doc = c.physicianSlug ? physicians.find((x) => x.slug === c.physicianSlug) : physicianByName(c.name); return { id: c.id, name: c.name, role: c.role, specialty: doc?.disciplines[0] || (/RN|NP/.test(c.name) ? "Nursing" : "—"), location: c.location || doc?.location || "—" }; }),
    goals: p.goals.map((g) => g.label),
    protocol: p.protocolItems.map((x) => { const r = rates.get(x.id)!; return { id: x.id, name: x.title, dose: x.dose, timing: x.slot, guidance: x.guidance || "", source: x.source, status: x.pausedAt || !x.active ? "Paused" : "Active", rate: r.rate, hasRate: r.hasRate, start: fmtDate(x.startedAt), startIso: x.startedAt.toISOString().slice(0, 10) }; }),
    devices, sessions: p.sessions.map((s) => { const u = parseUA(s.userAgent); return { id: s.id, device: u.device, browser: u.browser, ip: maskIp(s.ip), last: fmtAgo(s.lastSeenAt), active: true }; }),
    labsN: p._count.labResults, aisN: p._count.symptomChecks + p._count.conversations + p._count.assessments + p._count.labChecks,
    healthHidden: !row.consent.wearables, labsHidden: !row.consent.labs,
    refs: refs.map((r) => refDTO(r, hist.get(r.id))), timeline: tl.slice(0, 80), audit: audits.map(auditDTO), visitorIds: p.visitors.map((v) => v.id), phones: p.pushDevices.map((d) => ({ platform: d.platform === "ios" ? "iPhone" : "Android", since: fmtDate(d.createdAt) })),
  };
}

// ── Reveal (logged by the API before these are called) ───────────────────
export async function revealHealth(patientId: string): Promise<HealthRevealDTO> {
  const since = new Date(Date.now() - 30 * D);
  const rows = await prisma.healthReading.findMany({ where: { patientId, recordedAt: { gte: new Date(Date.now() - 400 * D) } }, orderBy: { recordedAt: "desc" }, take: 3000 });
  const wear = rows.filter((r) => r.source !== "clinic");
  const latest = (m: string) => wear.find((r) => r.metric === m);
  const avg = (m: string) => { const xs = wear.filter((r) => r.metric === m && r.recordedAt >= since).map((r) => r.value); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const metrics: HealthRevealDTO["metrics"] = [];
  const push = (m: string, label: string, fmt: (v: number, t: string | null) => [string, string], note: (r: { recordedAt: Date }) => string) => {
    const r = latest(m); if (!r) return;
    const [value, unit] = fmt(r.value, r.valueText); metrics.push({ label, value, unit, note: note(r) });
  };
  const vsAvg = (m: string, v: number) => { const a = avg(m); if (a == null) return "Latest"; const d = Math.round(v - a); return d === 0 ? "Same as 30-day avg" : `${d > 0 ? "+" : "−"}${Math.abs(d)} vs 30-day avg`; };
  push("rhr", "Resting HR", (v) => [String(Math.round(v)), "bpm"], (r) => vsAvg("rhr", latest("rhr")!.value));
  push("hrv", "HRV", (v) => [String(Math.round(v)), "ms"], () => vsAvg("hrv", latest("hrv")!.value));
  push("spo2", "SpO₂", (v) => [String(Math.round(v)), "%"], (r) => fmtShort(r.recordedAt));
  push("sleep", "Sleep", (v) => [`${Math.floor(v)}h ${String(Math.round((v % 1) * 60)).padStart(2, "0")}m`, ""], (r) => fmtShort(r.recordedAt));
  push("steps", "Activity", (v) => [fmtNum(v), "steps"], (r) => fmtShort(r.recordedAt));
  push("bp", "Blood pressure", (v, t) => [t || String(v), "mmHg"], (r) => fmtShort(r.recordedAt));
  push("ecg", "ECG", (v, t) => [t || (v ? "Recorded" : "—"), ""], (r) => fmtShort(r.recordedAt) + " recording");
  const clinicAudit = await prisma.adminAuditEvent.findMany({ where: { subjectId: patientId, action: "Added clinic reading" }, select: { actor: true, createdAt: true, resource: true } });
  const readings = rows.filter((r) => r.source === "clinic").map((r) => {
    const def = isMetricKey(r.metric) ? METRIC_DEFS[r.metric] : null;
    const by = clinicAudit.find((a) => Math.abs(a.createdAt.getTime() - r.updatedAt.getTime()) < 120000)?.actor || "Clinic staff";
    return { id: r.id, type: def?.name || r.metric, value: r.valueText || String(r.value), unit: def?.unit || "", when: fmtFull(r.recordedAt), source: "Clinic device", by };
  });
  return { metrics, readings };
}

const fmtRef = (lo: number | null, hi: number | null, txt: string | null) => txt || (lo != null && hi != null ? `${lo}–${hi}` : hi != null ? `< ${hi}` : lo != null ? `> ${lo}` : "—");

export async function revealLabs(patientId: string): Promise<LabDTO[]> {
  const labs = await prisma.labResult.findMany({ where: { patientId }, orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] });
  return labs.map((l) => {
    const flag = l.value != null && l.refHigh != null && l.value > l.refHigh ? "above" : l.value != null && l.refLow != null && l.value < l.refLow ? "below" : null;
    return {
      id: l.id, test: l.name, value: l.valueText || (l.value != null ? String(l.value) : "—"), unit: l.valueText || l.value != null ? l.unit || "" : "", range: fmtRef(l.refLow, l.refHigh, l.refText),
      status: l.status === "pending" ? "Pending" : "Final", flag: l.status === "pending" ? null : flag, date: fmtDate(l.collectedAt || l.createdAt), panel: l.panel || "—", source: l.source,
      explanation: l.staffNote || "",
    };
  });
}

// ── AI activity ──────────────────────────────────────────────────────────
const AI_PREFIX: Record<AiKind, string> = { symptom: "SC", alba: "AL", assessment: "AS", lab: "LE" };

async function loadAi(where: { patientId?: string; sessionId?: string | { in: string[] } } = {}, take = 300): Promise<AiRow[]> {
  const pSel = { select: { id: true, firstName: true, lastName: true, createdAt: true } };
  const [sc, al, la, lc] = await Promise.all([
    prisma.symptomCheckLog.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { patient: pSel } }),
    prisma.albaConversation.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { patient: pSel, messages: { orderBy: { createdAt: "asc" }, take: 1, where: { role: "user" } } } }),
    prisma.longevityAssessment.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { patient: pSel } }),
    prisma.labResultCheck.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { patient: pSel } }),
  ]);
  const vmap = await visitorIdsFor([...sc, ...al, ...la, ...lc].filter((x) => !x.patient).map((x) => x.sessionId));
  const base = (kind: AiKind, x: { id: string; createdAt: Date; sessionId: string; patient: { id: string; firstName: string; lastName: string; createdAt: Date } | null }) => {
    const vid = vmap.get(x.sessionId) || null;
    return {
      key: `${kind}:${x.id}`, id: shortCode(AI_PREFIX[kind], x.id), kind, who: x.patient ? fullName(x.patient) : `Visitor ${vid || "(unknown)"}`,
      whoId: x.patient?.id || vid, isVisitor: !x.patient, test: isTestId(x.id) || isTestId(x.patient?.id) || isTestVisitor(vid),
      date: fmtDay(x.createdAt), time: fmtTime(x.createdAt), mins: minsAgo(x.createdAt), pre: !!x.patient && x.createdAt < x.patient.createdAt,
    };
  };
  const rows: AiRow[] = [
    ...sc.map((x) => ({ ...base("symptom", x), status: x.reviewedAt ? "Reviewed" : "New", emergency: x.emergency, line: x.description, title: "Symptom check" })),
    ...al.map((x) => ({ ...base("alba", x), status: "Completed", emergency: false, line: x.messages[0]?.text || `Started on ${x.pageContext || "the website"}`, title: "Neyu conversation" })),
    ...la.map((x) => ({ ...base("assessment", x), status: "Completed", emergency: false, line: x.summary, title: "Longevity Assessment" })),
    ...lc.map((x) => ({ ...base("lab", x), status: "Completed", emergency: false, line: x.overallSummary, title: "Lab explainer" })),
  ];
  return rows.sort((a, b) => a.mins - b.mins);
}

export const aiList = () => loadAi();

export async function revealAI(patientId: string): Promise<AiRow[]> {
  return loadAi({ patientId });
}

export async function aiDetail(key: string): Promise<AiDetailDTO | null> {
  const [kind, id] = key.split(":") as [AiKind, string];
  if (!id) return null;
  const pSel = { select: { id: true, firstName: true, lastName: true, createdAt: true } };
  const one = async () => {
    if (kind === "symptom") return prisma.symptomCheckLog.findUnique({ where: { id }, include: { patient: pSel } });
    if (kind === "alba") return prisma.albaConversation.findUnique({ where: { id }, include: { patient: pSel, messages: { orderBy: { createdAt: "asc" } } } });
    if (kind === "assessment") return prisma.longevityAssessment.findUnique({ where: { id }, include: { patient: pSel } });
    if (kind === "lab") return prisma.labResultCheck.findUnique({ where: { id }, include: { patient: pSel } });
    return null;
  };
  const x: any = await one();
  if (!x) return null;
  const vid = x.patient ? null : (await visitorIdsFor([x.sessionId])).get(x.sessionId) || null;
  const base: AiRow = {
    key, id: shortCode(AI_PREFIX[kind], x.id), kind, who: x.patient ? fullName(x.patient) : `Visitor ${vid || "(unknown)"}`, whoId: x.patient?.id || vid, isVisitor: !x.patient,
    test: isTestId(x.id) || isTestId(x.patient?.id) || isTestVisitor(vid), date: fmtDay(x.createdAt), time: fmtTime(x.createdAt), mins: minsAgo(x.createdAt),
    pre: !!x.patient && x.createdAt < x.patient.createdAt, status: "Completed", emergency: false, line: "", title: "",
  };
  const where = x.patient ? "My Health Space" : "Website";
  if (kind === "symptom") return { ...base, status: x.reviewedAt ? "Reviewed" : "New", emergency: x.emergency, line: x.description, title: "Symptom check", from: `${where} · Symptom checker`, desc: x.description, urgency: x.urgency, specialty: x.recommendedDiscipline || x.specialty, summary: x.summary, reviewedBy: x.reviewedBy || undefined, reviewedAt: x.reviewedAt ? fmtShort(x.reviewedAt, true) : undefined };
  if (kind === "alba") return { ...base, title: "Neyu conversation", line: x.messages[0]?.text || "", from: `${where} · ${x.pageContext || "Website"}`, messages: x.messages.map((m: any) => ({ from: m.role === "user" ? "patient" : m.role === "assistant" ? "alba" : "system", text: m.text })) };
  if (kind === "assessment") {
    const ans = parseJSON<Record<string, unknown>>(x.answers, {});
    const focus = parseJSON<unknown[]>(x.focusAreas, []).map((f: any) => (typeof f === "string" ? f : f?.title || f?.name || f?.area || "")).filter(Boolean);
    return {
      ...base, title: "Longevity Assessment", line: x.summary, from: `${where} · Longevity`, summary: x.summary, focus, next: x.suggestedNextStep,
      answers: Object.entries(ans).slice(0, 30).map(([q, a]) => ({ q: cap(q.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").trim().toLowerCase()), a: Array.isArray(a) ? a.join(", ") : typeof a === "object" && a ? JSON.stringify(a) : String(a ?? "—") })),
    };
  }
  const results = parseJSON<any[]>(x.results, []);
  return {
    ...base, title: "Lab explainer", line: x.overallSummary, from: `${where} · Lab explainer`, summary: x.overallSummary,
    provided: x.inputType === "image" ? "Uploaded a photo of a lab report." : "Typed their lab values.",
    results: results.slice(0, 40).map((r) => ({ t: String(r?.name || r?.test || r?.marker || "Result"), v: [r?.value, r?.unit].filter((v) => v != null && v !== "").join(" ") || "—", r: String(r?.referenceRange || r?.range || r?.reference || "—") })),
    explanation: x.overallSummary,
  };
}

// ── Visitors ─────────────────────────────────────────────────────────────
async function toolsBySession(sessionIds: string[]) {
  const where = { sessionId: { in: sessionIds } };
  const [sc, al, la, lc, rf] = await Promise.all([
    prisma.symptomCheckLog.findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] }),
    prisma.albaConversation.findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] }),
    prisma.longevityAssessment.findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] }),
    prisma.labResultCheck.findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] }),
    prisma.referralSubmission.findMany({ where, select: { sessionId: true, id: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const m = new Map<string, { tools: string[]; ref: string | null }>();
  const g = (s: string) => m.get(s) || (m.set(s, { tools: [], ref: null }), m.get(s)!);
  al.forEach((x) => g(x.sessionId).tools.push("Neyu"));
  sc.forEach((x) => g(x.sessionId).tools.push("Symptom check"));
  la.forEach((x) => g(x.sessionId).tools.push("Longevity assessment"));
  lc.forEach((x) => g(x.sessionId).tools.push("Lab explainer"));
  rf.forEach((x) => { const e = g(x.sessionId); if (!e.ref) e.ref = shortCode("R", x.id); });
  return m;
}

function visitorRow(v: { id: string; sessionId: string; firstSeenAt: Date; lastSeenAt: Date; pageCount: number; userAgent: string | null; patientId: string | null; patient: { firstName: string; lastName: string } | null }, t?: { tools: string[]; ref: string | null }): VisitorRow {
  const u = parseUA(v.userAgent);
  const lm = minsAgo(v.lastSeenAt);
  return {
    id: v.id, first: fmtShort(v.firstSeenAt, true), last: fmtShort(v.lastSeenAt, true), lastMins: lm, pages: v.pageCount, tools: t?.tools || [], referral: t?.ref || null,
    status: v.patientId ? "Converted" : lm <= 30 ? "Active" : "Idle", pid: v.patientId, pname: v.patient ? fullName(v.patient) : "", device: `${u.browser.replace(/ \d+$/, "")} · ${u.os}`, test: isTestVisitor(v.id),
  };
}

export async function visitorsList(): Promise<VisitorRow[]> {
  const vs = await prisma.visitor.findMany({ orderBy: { lastSeenAt: "desc" }, take: 500, include: { patient: { select: { firstName: true, lastName: true } } } });
  const tools = await toolsBySession(vs.map((v) => v.sessionId));
  return vs.map((v) => visitorRow(v, tools.get(v.sessionId)));
}

export async function visitorRecord(id: string): Promise<VisitorDTO | null> {
  const v = await prisma.visitor.findUnique({ where: { id }, include: { patient: { select: { firstName: true, lastName: true, createdAt: true } } } });
  if (!v) return null;
  const [tools, pages, ais, refs, audits] = await Promise.all([
    toolsBySession([v.sessionId]),
    prisma.pageVisit.findMany({ where: { sessionId: v.sessionId }, orderBy: { createdAt: "asc" }, take: 300, select: { path: true, createdAt: true } }),
    loadAi({ sessionId: v.sessionId }, 100),
    prisma.referralSubmission.findMany({ where: { sessionId: v.sessionId }, orderBy: { createdAt: "desc" } }),
    prisma.adminAuditEvent.findMany({ where: { subjectType: "visitor", subjectId: v.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const row = visitorRow(v, tools.get(v.sessionId));
  const pagesL = pages.map((p, i) => {
    const next = pages[i + 1];
    const secs = next ? Math.round((next.createdAt.getTime() - p.createdAt.getTime()) / 1000) : null;
    return { url: p.path, when: fmtShort(p.createdAt, true), dur: secs == null || secs > 1800 ? "—" : secs < 60 ? `${secs}s` : `${Math.round(secs / 60)} min` };
  }).reverse();
  const tlv = [
    { at: v.firstSeenAt.getTime(), t: fmtShort(v.firstSeenAt, true), title: "First visit", icon: "ph ph-globe", detail: `Landed on ${v.landingPath || "/"} · ${row.device}` },
    ...ais.map((a) => ({ at: Date.now() - a.mins * 60000, t: `${a.date}, ${a.time}`, title: a.title, icon: a.kind === "alba" ? "ph ph-chat-circle-dots" : a.kind === "symptom" ? "ph ph-stethoscope" : a.kind === "lab" ? "ph ph-flask" : "ph ph-clipboard-text", detail: a.line })),
    ...refs.map((r) => ({ at: r.createdAt.getTime(), t: fmtShort(r.createdAt, true), title: "Referral submitted", icon: "ph ph-arrow-square-in", detail: `${shortCode("R", r.id)} · ${r.patientName || "(no name)"}` })),
    ...(v.convertedAt && v.patient ? [{ at: v.convertedAt.getTime(), t: fmtShort(v.convertedAt, true), title: "Signed up · history merged", icon: "ph ph-user-check", detail: `Now ${fullName(v.patient)} (${v.patientId})` }] : []),
  ].sort((a, b) => a.at - b.at).map(({ at, ...x }) => x);
  return {
    ...row, pagesL, ais, refs: refs.map((r) => refDTO(r, [], v.id)), tlv, audit: audits.map(auditDTO),
    convertedOn: v.convertedAt ? fmtDate(v.convertedAt) : "",
  };
}

// ── Referrals ────────────────────────────────────────────────────────────
export async function referralsList(): Promise<RefDTO[]> {
  const refs = await prisma.referralSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  const [hist, vmap] = await Promise.all([refHistories(refs.map((r) => r.id)), visitorIdsFor(refs.map((r) => r.sessionId))]);
  return refs.map((r) => refDTO(r, hist.get(r.id), vmap.get(r.sessionId) || null));
}

export async function referralDetail(id: string): Promise<RefDTO | null> {
  const r = await prisma.referralSubmission.findUnique({ where: { id } });
  if (!r) return null;
  const [hist, vmap] = await Promise.all([refHistories([id]), visitorIdsFor([r.sessionId])]);
  return refDTO(r, hist.get(id), vmap.get(r.sessionId) || null);
}

// ── Audit log ────────────────────────────────────────────────────────────
export async function auditList(take = 500): Promise<AuditDTO[]> {
  return (await prisma.adminAuditEvent.findMany({ orderBy: { createdAt: "desc" }, take })).map(auditDTO);
}
export async function auditItem(id: string): Promise<AuditDTO | null> {
  const e = await prisma.adminAuditEvent.findUnique({ where: { id } });
  return e ? auditDTO(e) : null;
}

// ── Settings, boot, search ───────────────────────────────────────────────
export async function settings(): Promise<SettingsDTO> {
  const [patients, visitors, referrals, audit] = await Promise.all([prisma.patient.count(), prisma.visitor.count(), prisma.referralSubmission.count(), prisma.adminAuditEvent.count()]);
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "";
  return {
    emailConfigured: emailConfigured(), mailFrom: from.replace(/^.*<(.+)>$/, "$1") || "Not set", signupOpen: process.env.PORTAL_SIGNUP_OPEN !== "false",
    locations: locations.map((l) => ({ name: l.tag, address: l.address })), counts: { patients, visitors, referrals, audit },
  };
}

export async function boot(actor: string, role = "Admin (shared)"): Promise<BootDTO> {
  const [queue, ref, testP, activity] = await Promise.all([
    queueCounts(),
    prisma.referralSubmission.findFirst({ where: { status: "received" }, orderBy: { createdAt: "desc" }, select: { id: true, patientName: true, specialties: true, createdAt: true } }),
    prisma.patient.count({ where: { id: { startsWith: "test_" } } }),
    activityFeed(3),
  ]);
  return {
    actor, role, queueCount: queue.total, emergencyCount: queue.emergency,
    latestReferral: ref ? { id: ref.id, code: shortCode("R", ref.id), label: `${ref.patientName || "(no name)"} · ${list(ref.specialties)[0] || "Referral"} · ${fmtShort(ref.createdAt, true)}` } : null,
    emailConfigured: emailConfigured(), hasTestData: testP > 0, activity,
  };
}

export async function search(q: string): Promise<SearchDTO> {
  const s = q.trim();
  const contains = { contains: s, mode: "insensitive" as const }; // PostgreSQL text match is case-sensitive by default
  const digits = s.replace(/\D/g, "");
  const [pts, vis, refs] = await Promise.all([
    prisma.patient.findMany({
      where: s ? { OR: [{ firstName: contains }, { lastName: contains }, { email: { contains: s.toLowerCase() } }, { id: contains }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []), ...(s.includes(" ") ? [{ AND: [{ firstName: { contains: s.split(" ")[0], mode: "insensitive" as const } }, { lastName: { contains: s.split(" ").slice(1).join(" "), mode: "insensitive" as const } }] }] : [])] } : {},
      orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } }, take: s ? 5 : 3, select: { id: true, firstName: true, lastName: true, email: true, phone: true, emailVerifiedAt: true },
    }),
    prisma.visitor.findMany({ where: s ? { id: { contains: s.replace(/^v_/i, ""), mode: "insensitive" as const } } : {}, orderBy: { lastSeenAt: "desc" }, take: s ? 4 : 2, select: { id: true, firstSeenAt: true, pageCount: true, patientId: true, lastSeenAt: true } }),
    prisma.referralSubmission.findMany({
      where: s ? { OR: [{ patientName: contains }, { id: { endsWith: s.replace(/^R-/i, "").toLowerCase() } }, { referringPhysician: contains }] } : {},
      orderBy: { createdAt: "desc" }, take: s ? 4 : 2, select: { id: true, patientName: true, specialties: true, urgency: true, referringPhysician: true, status: true },
    }),
  ]);
  return {
    patients: pts.map((p) => ({ id: p.id, name: fullName(p), initials: initials(p.firstName, p.lastName.replace(/\s*\(test\)\s*/i, "")), sub: `${p.id} · ${p.email}${p.phone ? " · " + p.phone : ""}`, meta: p.emailVerifiedAt ? "Verified" : "Unverified" })),
    visitors: vis.map((v) => ({ id: v.id, sub: `First seen ${fmtShort(v.firstSeenAt, true)} · ${v.pageCount} pages`, meta: v.patientId ? "Converted" : minsAgo(v.lastSeenAt) <= 30 ? "Active" : "Idle" })),
    referrals: refs.map((r) => ({ id: r.id, title: `${shortCode("R", r.id)} · ${r.patientName || "(no name)"}`, sub: `${list(r.specialties).join(", ") || "Referral"} · ${r.urgency || "—"} · ${r.referringPhysician || "—"}`, meta: refStatus(r.status) })),
  };
}

// ── Service requests (Neyu version: virtual care, hypertension clinic, packages, membership, at-home) ──
export type ServiceRequestDTO = { id: string; when: string; service: string; choice: string; name: string; email: string; phone: string; postal: string; message: string; page: string; status: string };
export async function requestsList(take = 1000): Promise<ServiceRequestDTO[]> {
  const rows = await prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take });
  return rows.map((r) => ({ id: r.id, when: r.createdAt.toISOString(), service: r.service, choice: r.choice || "", name: r.name, email: r.email, phone: r.phone || "", postal: r.postal || "", message: r.message || "", page: r.page || "", status: r.status }));
}

