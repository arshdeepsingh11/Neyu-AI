// Social layer of My Health Space:
//  • Family care — a patient invites a family member (caregiver) who gets a
//    read-only summary. The patient owns the account and can revoke any time.
//  • Share with my doctor — an expiring read-only link, scope chosen by the
//    patient, every view counted and logged.
//  • Challenges — team or company goals with a join code and a leaderboard.

import { randomBytes } from "crypto";
import { prisma } from "@backend/db";
import { sha256 } from "@backend/patientAuth";
import { avg, fmt, dayKey, addDays, daysBetween } from "@/lib/portal/metrics";
import { bpLevel, bpUrgent, BP_TEXT, CHALLENGE_METRICS } from "@/lib/portal/universe";
import type { FamilyDTO, CareSummaryDTO, ShareLinkDTO, ChallengeDTO } from "@/lib/portal/types";
import { getConsent, readingSourceFilter, parseJSON } from "@backend/patientData";
import { HttpError } from "@backend/apiHelpers";
import { sendMail, simpleEmail } from "@backend/email";
import { audit } from "@backend/audit";

type P = { id: string; firstName: string; lastName?: string; email?: string; timezone: string };
const fmtDate = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz }).format(d);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Family care ─────────────────────────────────────────────────────────
export async function getFamily(p: P & { email: string }): Promise<FamilyDTO> {
  const [mine, caring, invites] = await Promise.all([
    prisma.careLink.findMany({ where: { ownerId: p.id, status: { in: ["pending", "active"] } }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, relation: true, status: true, createdAt: true, acceptedAt: true, caregiver: { select: { firstName: true, lastName: true } } } }),
    prisma.careLink.findMany({ where: { caregiverId: p.id, status: "active" }, select: { id: true, ownerId: true, relation: true, acceptedAt: true, owner: { select: { firstName: true, lastName: true } } } }),
    prisma.careLink.findMany({ where: { email: p.email.toLowerCase(), status: "pending", NOT: { ownerId: p.id } }, select: { id: true, relation: true, owner: { select: { firstName: true, lastName: true } } } }),
  ]);
  return {
    caregivers: mine.map((l) => ({ id: l.id, email: l.email, name: l.caregiver ? `${l.caregiver.firstName} ${l.caregiver.lastName}` : null, relation: l.relation, status: l.status, since: fmtDate(l.acceptedAt || l.createdAt, p.timezone) })),
    caringFor: caring.map((l) => ({ id: l.id, ownerId: l.ownerId, name: `${l.owner.firstName} ${l.owner.lastName}`, relation: l.relation, since: fmtDate(l.acceptedAt!, p.timezone) })),
    invites: invites.map((l) => ({ id: l.id, from: `${l.owner.firstName} ${l.owner.lastName}`, relation: l.relation })),
  };
}

export async function inviteCaregiver(p: P & { email: string }, emailRaw: string, relation: string, base: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  if (email === p.email.toLowerCase()) throw new HttpError(400, "That's your own email — invite a family member instead.");
  const count = await prisma.careLink.count({ where: { ownerId: p.id, status: { in: ["pending", "active"] } } });
  if (count >= 5) throw new HttpError(400, "You can have up to 5 family members.");
  const existing = await prisma.careLink.findFirst({ where: { ownerId: p.id, email, status: { in: ["pending", "active"] } } });
  if (existing) throw new HttpError(409, existing.status === "active" ? "This person already has access." : "An invite is already waiting for this email.");
  const token = "anra_care_" + randomBytes(18).toString("base64url");
  const link = await prisma.careLink.create({ data: { ownerId: p.id, email, relation: relation || "Family", inviteHash: sha256(token) } });
  const url = `${base}/my-health/care?token=${encodeURIComponent(token)}`;
  const mail = simpleEmail(`${p.firstName} invited you to My Health Space`, [
    `${p.firstName} ${p.lastName || ""} would like you to be able to see a summary of their health in NEYU Health's My Health Space — daily signals, home blood pressure, their protocol and upcoming visits.`,
    "Sign in (or create a free account) with this email address to accept. They can remove your access at any time.",
  ], { label: "Accept invite", url });
  await sendMail({ to: email, ...mail }).catch((e) => console.error("Invite email failed:", e?.message));
  return { id: link.id, url };
}

export async function acceptCare(p: P & { email: string }, by: { token?: string; id?: string }) {
  const link = by.token ? await prisma.careLink.findUnique({ where: { inviteHash: sha256(by.token) } }) : by.id ? await prisma.careLink.findUnique({ where: { id: by.id } }) : null;
  if (!link || link.status !== "pending") throw new HttpError(404, "This invite is no longer valid.");
  if (link.email !== p.email.toLowerCase()) throw new HttpError(403, `This invite was sent to ${link.email}. Sign in with that email to accept.`);
  if (link.ownerId === p.id) throw new HttpError(400, "You can't accept your own invite.");
  await prisma.careLink.update({ where: { id: link.id }, data: { status: "active", caregiverId: p.id, acceptedAt: new Date(), inviteHash: null } });
  audit(link.ownerId, "caregiver", "create", `care:${p.id}`);
}

export async function removeCare(p: P, id: string) {
  const link = await prisma.careLink.findUnique({ where: { id } });
  if (!link || (link.ownerId !== p.id && link.caregiverId !== p.id && !(link.status === "pending" && link.email === (p.email || "").toLowerCase()))) throw new HttpError(404, "Not found.");
  await prisma.careLink.update({ where: { id }, data: { status: "revoked", inviteHash: null } });
  audit(link.ownerId, link.ownerId === p.id ? "patient" : "caregiver", "delete", `care:${link.caregiverId || link.email}`);
}

export async function getCareSummary(p: P, linkId: string): Promise<CareSummaryDTO> {
  const link = await prisma.careLink.findUnique({ where: { id: linkId }, select: { ownerId: true, caregiverId: true, status: true, relation: true, owner: { select: { id: true, firstName: true, lastName: true, timezone: true } } } });
  if (!link || link.status !== "active" || link.caregiverId !== p.id) throw new HttpError(404, "You don't have access to this person's summary.");
  const o = link.owner, tz = o.timezone, today = dayKey(new Date(), tz), c = await getConsent(o.id);
  const [readings, bps, items, done, appt] = await Promise.all([
    prisma.healthReading.findMany({ where: { patientId: o.id, day: { gte: addDays(today, -30) }, metric: { in: ["rhr", "sleep", "steps", "hrv"] }, ...readingSourceFilter(c) }, select: { metric: true, day: true, value: true, recordedAt: true } }),
    prisma.bpReading.findMany({ where: { patientId: o.id, day: { gte: addDays(today, -7) } }, orderBy: { takenAt: "desc" }, select: { sys: true, dia: true, takenAt: true } }),
    c.records ? prisma.protocolItem.count({ where: { patientId: o.id, active: true, pausedAt: null } }) : Promise.resolve(0),
    prisma.protocolLog.count({ where: { patientId: o.id, day: today } }),
    c.records ? prisma.appointment.findFirst({ where: { patientId: o.id, status: "scheduled", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, select: { clinician: true, startsAt: true } }) : Promise.resolve(null),
  ]);
  const signals: CareSummaryDTO["signals"] = [], alerts: string[] = [];
  const LBL: Record<string, string> = { rhr: "Resting heart rate", sleep: "Sleep", steps: "Steps", hrv: "HRV" };
  for (const m of ["rhr", "sleep", "steps", "hrv"]) {
    const rows = readings.filter((r) => r.metric === m).sort((a, b) => (a.day < b.day ? -1 : 1));
    if (!rows.length) continue;
    const last = rows[rows.length - 1], a = avg(rows.map((r) => r.value));
    signals.push({ label: LBL[m], value: fmt(m, last.value) + (m === "rhr" ? " bpm" : m === "hrv" ? " ms" : ""), note: `${daysBetween(last.day, today) === 0 ? "Today" : daysBetween(last.day, today) === 1 ? "Yesterday" : last.day} · 30-day avg ${fmt(m, a)}` });
  }
  const lastSync = readings.reduce<Date | null>((x, r) => (!x || r.recordedAt > x ? r.recordedAt : x), null);
  if (!lastSync || Date.now() - lastSync.getTime() > 3 * 86400000) alerts.push(lastSync ? "No new wearable data for more than 3 days." : "No wearable data yet.");
  let bp: CareSummaryDTO["bp"] = { avg7: null, status: "No home readings this week", last: null };
  if (bps.length) {
    const s = Math.round(avg(bps.map((b) => b.sys))), d = Math.round(avg(bps.map((b) => b.dia)));
    bp = { avg7: `${s}/${d}`, status: BP_TEXT[bpLevel(s, d)].title, last: `${bps[0].sys}/${bps[0].dia} · ${fmtDate(bps[0].takenAt, tz)}` };
    if (bps.some((b) => bpUrgent(b.sys, b.dia) && Date.now() - b.takenAt.getTime() < 2 * 86400000)) alerts.unshift("A very high blood pressure reading in the last 2 days.");
  }
  audit(o.id, "caregiver", "read", `care-summary:${p.id}`);
  return {
    name: `${o.firstName} ${o.lastName}`, relation: link.relation, updated: lastSync ? fmtDate(lastSync, tz) : "—", signals, bp,
    protocol: { done: Math.min(done, items), total: items },
    nextAppointment: appt ? `${appt.clinician} · ${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }).format(appt.startsAt)}` : null,
    alerts,
  };
}

// ── Share with my doctor ────────────────────────────────────────────────
export const SHARE_SCOPES = ["trends", "bp", "labs", "lifestyle"] as const;
const toShareDTO = (l: { id: string; label: string; scope: string; expiresAt: Date; revokedAt: Date | null; views: number; lastViewedAt: Date | null }): ShareLinkDTO =>
  ({ id: l.id, label: l.label, scope: parseJSON<string[]>(l.scope, []), expiresAt: l.expiresAt.toISOString(), revoked: !!l.revokedAt || l.expiresAt < new Date(), views: l.views, lastViewedAt: l.lastViewedAt?.toISOString() ?? null });

export async function listShares(p: P): Promise<ShareLinkDTO[]> {
  const rows = await prisma.shareLink.findMany({ where: { patientId: p.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map(toShareDTO);
}
export async function createShare(p: P, label: string, scope: string[], days: number, base: string) {
  const sc = scope.filter((s) => (SHARE_SCOPES as readonly string[]).includes(s));
  if (!sc.length) throw new HttpError(400, "Choose at least one thing to share.");
  const d = [1, 7, 30].includes(days) ? days : 7;
  const active = await prisma.shareLink.count({ where: { patientId: p.id, revokedAt: null, expiresAt: { gt: new Date() } } });
  if (active >= 10) throw new HttpError(400, "You have 10 active links. Turn one off first.");
  const token = "anra_share_" + randomBytes(18).toString("base64url");
  const l = await prisma.shareLink.create({ data: { patientId: p.id, tokenHash: sha256(token), label: label.slice(0, 80) || "My doctor", scope: JSON.stringify(sc), expiresAt: new Date(Date.now() + d * 86400000) } });
  return { ...toShareDTO(l), url: `${base}/share/${token}` };
}
export async function revokeShare(p: P, id: string) {
  const r = await prisma.shareLink.updateMany({ where: { id, patientId: p.id }, data: { revokedAt: new Date() } });
  if (!r.count) throw new HttpError(404, "Link not found.");
}

export interface SharedView {
  name: string; dob: string | null; age: number | null; label: string; expires: string; scope: string[]; generated: string;
  trends: { label: string; last: string; avg7: string; avg30: string; avg90: string }[];
  bp: { avg7: string | null; avg30: string | null; status: string; readings: { when: string; value: string; pulse: string }[] } | null;
  labs: { name: string; value: string; ref: string; date: string; flag: boolean }[];
  lifestyle: { day: string; water: number; caffeine: number; alcohol: number; mood: string; stress: string }[];
}

/** Public view for /share/[token]. Returns null if invalid/expired/revoked. */
export async function getSharedView(token: string, ip?: string): Promise<SharedView | null> {
  if (!token.startsWith("anra_share_") || token.length > 80) return null;
  const l = await prisma.shareLink.findUnique({ where: { tokenHash: sha256(token) }, include: { patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, timezone: true } } } });
  if (!l || l.revokedAt || l.expiresAt < new Date()) return null;
  const o = l.patient, tz = o.timezone, today = dayKey(new Date(), tz), scope = parseJSON<string[]>(l.scope, []);
  await prisma.shareLink.update({ where: { id: l.id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } });
  audit(o.id, "share", "read", `share:${l.id}`, ip);
  const age = o.dateOfBirth ? Math.floor((Date.now() - o.dateOfBirth.getTime()) / (365.25 * 86400000)) : null;
  const view: SharedView = { name: `${o.firstName} ${o.lastName}`, dob: o.dateOfBirth ? o.dateOfBirth.toISOString().slice(0, 10) : null, age, label: l.label, expires: fmtDate(l.expiresAt, tz), scope, generated: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(new Date()), trends: [], bp: null, labs: [], lifestyle: [] };
  const MOOD = ["", "Low", "Meh", "Okay", "Good", "Great"], STRESS = ["", "Calm", "Mild", "Some", "High", "Very high"];

  if (scope.includes("trends")) {
    const rows = await prisma.healthReading.findMany({ where: { patientId: o.id, day: { gte: addDays(today, -90) }, metric: { in: ["rhr", "hrv", "spo2", "sleep", "steps", "active", "weight", "glucose"] } }, select: { metric: true, day: true, value: true } });
    const L: Record<string, string> = { rhr: "Resting heart rate (bpm)", hrv: "HRV (ms)", spo2: "Blood oxygen (%)", sleep: "Sleep", steps: "Steps", active: "Active minutes", weight: "Weight (kg)", glucose: "Glucose (mmol/L)" };
    for (const m of Object.keys(L)) {
      const r = rows.filter((x) => x.metric === m).sort((a, b) => (a.day < b.day ? -1 : 1));
      if (!r.length) continue;
      const a = (n: number) => { const v = r.filter((x) => daysBetween(x.day, today) < n).map((x) => x.value); return v.length ? fmt(m, avg(v)) : "—"; };
      view.trends.push({ label: L[m], last: `${fmt(m, r[r.length - 1].value)} (${r[r.length - 1].day})`, avg7: a(7), avg30: a(30), avg90: a(90) });
    }
  }
  if (scope.includes("bp")) {
    const bps = await prisma.bpReading.findMany({ where: { patientId: o.id, day: { gte: addDays(today, -30) } }, orderBy: { takenAt: "desc" }, select: { sys: true, dia: true, pulse: true, takenAt: true, day: true } });
    const ag = (n: number) => { const x = bps.filter((b) => daysBetween(b.day, today) < n); return x.length ? `${Math.round(avg(x.map((b) => b.sys)))}/${Math.round(avg(x.map((b) => b.dia)))} (n=${x.length})` : null; };
    const s7 = bps.filter((b) => daysBetween(b.day, today) < 7);
    view.bp = { avg7: ag(7), avg30: ag(30), status: s7.length ? BP_TEXT[bpLevel(avg(s7.map((b) => b.sys)), avg(s7.map((b) => b.dia)))].title : "No readings in the last 7 days",
      readings: bps.slice(0, 40).map((b) => ({ when: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }).format(b.takenAt), value: `${b.sys}/${b.dia}`, pulse: b.pulse ? String(b.pulse) : "—" })) };
  }
  if (scope.includes("labs")) {
    const labs = await prisma.labResult.findMany({ where: { patientId: o.id, status: "final" }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, take: 60, select: { code: true, name: true, value: true, valueText: true, unit: true, refLow: true, refHigh: true, refText: true, collectedAt: true } });
    const seen = new Set<string>();
    labs.forEach((x) => { if (seen.has(x.code)) return; seen.add(x.code); view.labs.push({ name: x.name, value: `${x.valueText ?? x.value ?? "—"} ${x.unit || ""}`.trim(), ref: x.refText || (x.refLow != null && x.refHigh != null ? `${x.refLow}–${x.refHigh}` : x.refHigh != null ? `≤ ${x.refHigh}` : x.refLow != null ? `≥ ${x.refLow}` : "—"), date: x.collectedAt ? fmtDate(x.collectedAt, tz) : "—", flag: x.value != null && ((x.refLow != null && x.value < x.refLow) || (x.refHigh != null && x.value > x.refHigh)) }); });
  }
  if (scope.includes("lifestyle")) {
    const logs = await prisma.lifestyleLog.findMany({ where: { patientId: o.id, day: { gte: addDays(today, -13) } }, select: { kind: true, value: true, day: true } });
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i), L = logs.filter((x) => x.day === d);
      if (!L.length) continue;
      const sum = (k: string) => L.filter((x) => x.kind === k).reduce((a, x) => a + x.value, 0), last = (k: string) => { const x = L.filter((y) => y.kind === k); return x.length ? x[x.length - 1].value : 0; };
      view.lifestyle.push({ day: d, water: sum("water"), caffeine: sum("caffeine"), alcohol: sum("alcohol"), mood: MOOD[last("mood")] || "—", stress: STRESS[last("stress")] || "—" });
    }
  }
  return view;
}

// ── Challenges ──────────────────────────────────────────────────────────
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(randomBytes(6)).map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");

export async function createChallenge(p: P, b: { name: string; metric: string; goal: number; days: number; org?: string; startDay?: string }) {
  const def = CHALLENGE_METRICS[b.metric];
  if (!def) throw new HttpError(400, "Choose what the challenge tracks.");
  const name = b.name.trim().slice(0, 60);
  if (name.length < 3) throw new HttpError(400, "Give the challenge a name.");
  const goal = Math.round(Number(b.goal) || def.defaultGoal);
  if (goal < def.min || goal > def.max) throw new HttpError(400, `Daily goal should be between ${def.min} and ${def.max}.`);
  const days = [7, 14, 21, 30].includes(b.days) ? b.days : 14;
  const today = dayKey(new Date(), p.timezone), start = b.startDay && /^\d{4}-\d{2}-\d{2}$/.test(b.startDay) && b.startDay >= today ? b.startDay : today;
  let code = newCode();
  for (let i = 0; i < 5 && (await prisma.challenge.findUnique({ where: { code } })); i++) code = newCode();
  const ch = await prisma.challenge.create({ data: { code, name, metric: b.metric, goal, startDay: start, endDay: addDays(start, days - 1), org: b.org?.trim().slice(0, 60) || null, createdById: p.id, members: { create: { patientId: p.id } } } });
  return ch.code;
}
export async function joinChallenge(p: P, codeRaw: string) {
  const code = codeRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const ch = await prisma.challenge.findUnique({ where: { code }, select: { id: true, endDay: true, _count: { select: { members: true } } } });
  if (!ch) throw new HttpError(404, "No challenge with that code.");
  if (ch.endDay < dayKey(new Date(), p.timezone)) throw new HttpError(400, "That challenge has ended.");
  if (ch._count.members >= 500) throw new HttpError(400, "This challenge is full.");
  await prisma.challengeMember.upsert({ where: { challengeId_patientId: { challengeId: ch.id, patientId: p.id } }, create: { challengeId: ch.id, patientId: p.id }, update: {} });
}
export async function leaveChallenge(p: P, id: string) {
  await prisma.challengeMember.deleteMany({ where: { challengeId: id, patientId: p.id } });
}

export async function listChallenges(p: P): Promise<ChallengeDTO[]> {
  const today = dayKey(new Date(), p.timezone);
  const joins = await prisma.challengeMember.findMany({ where: { patientId: p.id }, select: { challenge: { include: { members: { select: { patientId: true, patient: { select: { firstName: true, lastName: true, settings: { select: { leaderboardName: true } } } } } } } } } });
  const out: ChallengeDTO[] = [];
  for (const { challenge: ch } of joins) {
    const ids = ch.members.map((m) => m.patientId), to = ch.endDay < today ? ch.endDay : today;
    const perDay = new Map<string, Map<string, number>>(); // patient → day → value
    const put = (pid: string, day: string, v: number, sum = false) => { const m = perDay.get(pid) || new Map(); m.set(day, sum ? (m.get(day) || 0) + v : Math.max(m.get(day) || 0, v)); perDay.set(pid, m); };
    if (ch.startDay <= to) {
      if (ch.metric === "steps" || ch.metric === "active") {
        (await prisma.healthReading.findMany({ where: { patientId: { in: ids }, metric: ch.metric, day: { gte: ch.startDay, lte: to } }, select: { patientId: true, day: true, value: true } })).forEach((r) => put(r.patientId, r.day, r.value));
      } else if (ch.metric === "water") {
        (await prisma.lifestyleLog.findMany({ where: { patientId: { in: ids }, kind: "water", day: { gte: ch.startDay, lte: to } }, select: { patientId: true, day: true, value: true } })).forEach((r) => put(r.patientId, r.day, r.value, true));
      } else {
        const [items, logs] = await Promise.all([
          prisma.protocolItem.groupBy({ by: ["patientId"], where: { patientId: { in: ids }, active: true, pausedAt: null }, _count: true }),
          prisma.protocolLog.groupBy({ by: ["patientId", "day"], where: { patientId: { in: ids }, day: { gte: ch.startDay, lte: to } }, _count: true }),
        ]);
        const need = new Map(items.map((i) => [i.patientId, i._count]));
        logs.forEach((l) => { const n = need.get(l.patientId) || 0; if (n && l._count >= n) put(l.patientId, l.day, 1); });
      }
    }
    const board = ch.members.map((m) => {
      const days = perDay.get(m.patientId) || new Map();
      const vals = [...days.values()];
      const nm = m.patient.settings?.leaderboardName || `${m.patient.firstName} ${m.patient.lastName.slice(0, 1)}.`;
      return { name: m.patientId === p.id ? `${nm} (you)` : nm, me: m.patientId === p.id, total: Math.round(vals.reduce((a, v) => a + v, 0)), daysHit: vals.filter((v) => v >= ch.goal).length };
    }).sort((a, b) => b.daysHit - a.daysHit || b.total - a.total);
    const status = today < ch.startDay ? "upcoming" : today > ch.endDay ? "ended" : "active";
    out.push({ id: ch.id, code: ch.code, name: ch.name, metric: ch.metric, metricLabel: CHALLENGE_METRICS[ch.metric]?.label || ch.metric, goal: ch.goal, startDay: ch.startDay, endDay: ch.endDay, org: ch.org, mine: ch.createdById === p.id, daysLeft: Math.max(0, daysBetween(today, ch.endDay) + 1), status, board: board.slice(0, 50) });
  }
  return out.sort((a, b) => (a.status === b.status ? (a.endDay < b.endDay ? -1 : 1) : a.status === "active" ? -1 : b.status === "active" ? 1 : a.status === "upcoming" ? -1 : 1));
}
