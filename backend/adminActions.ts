// Staff actions from the admin console. Each action validates its input,
// changes the database, writes the audit trail, and returns a small result
// (plus an "undo" payload when the change is safe to reverse).

import { prisma } from "@backend/db";
import { adminLog } from "@backend/adminAudit";
import { audit } from "@backend/audit";
import { HttpError, str } from "@backend/apiHelpers";
import { sendMail, emailConfigured } from "@backend/email";
import { sendVerificationCode } from "@backend/emailVerification";
import { dayKey, METRIC_DEFS, type MetricKey } from "@/lib/portal/metrics";
import { physicians } from "@/data/physicians";
import { fmtDate, fmtTime, fmtFull, shortCode } from "@backend/adminFormat";
import { refStatus, revealHealth, revealLabs, revealAI, patientsList, auditList, referralsList } from "@backend/adminData";
import { PROVIDER_NAMES } from "@/lib/portal/devices";

const TZ = "America/Edmonton";
type Ctx = { actor: string; ip: string; role?: string; staffId?: string };
type Result = { ok: true; message?: string; undo?: Record<string, unknown>; data?: unknown; file?: { name: string; mime: string; content: string } };

// ── Helpers ──────────────────────────────────────────────────────────────
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();

async function patientOr404(id: unknown) {
  const p = await prisma.patient.findUnique({ where: { id: str(id, 60) }, select: { id: true, firstName: true, lastName: true, email: true, timezone: true, accountStatus: true, emailVerifiedAt: true, lockedUntil: true, settings: true } });
  if (!p) throw new HttpError(404, "Patient not found.");
  return p;
}

/** "2026-10-06" + "9:30 a.m." (or "09:30") in Calgary time → Date */
export function zonedDate(date: string, time = "12:00"): Date {
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = time.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!dm || !tm) throw new HttpError(400, "Enter a valid date and time.");
  let h = Number(tm[1]) % 24;
  if (tm[3]?.startsWith("p") && h < 12) h += 12;
  if (tm[3]?.startsWith("a") && h === 12) h = 0;
  const guess = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), h, Number(tm[2]));
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const asZone = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(guess - (asZone - guess));
}

function dateOnly(v: unknown, field: string): Date {
  const s = str(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `${field} is required.`);
  return new Date(s + "T12:00:00Z"); // noon UTC = same calendar day across Canada
}

function parseRange(range: string): { refLow: number | null; refHigh: number | null; refText: string | null } {
  const r = range.trim();
  if (!r) return { refLow: null, refHigh: null, refText: null };
  const num = (x: string) => Number(x.replace(",", "."));
  let m = r.match(/^<\s*=?\s*([\d.,]+)$/); if (m) return { refLow: null, refHigh: num(m[1]), refText: null };
  m = r.match(/^>\s*=?\s*([\d.,]+)$/); if (m) return { refLow: num(m[1]), refHigh: null, refText: null };
  m = r.match(/^([\d.,]+)\s*[-–—]\s*([\d.,]+)$/); if (m) return { refLow: num(m[1]), refHigh: num(m[2]), refText: null };
  return { refLow: null, refHigh: null, refText: r.slice(0, 80) };
}

const PANEL_CATEGORY: Record<string, string> = { "Cardiac markers": "Heart Health", "Lipid panel": "Heart Health", "Metabolic panel": "Metabolic Health", CBC: "Other", "Thyroid panel": "Hormones", Inflammation: "Inflammation", Other: "Other" };
const PREP: Record<string, { prepShareTrends: boolean; prepShareResults: boolean }> = {
  "Wearables and labs shared": { prepShareTrends: true, prepShareResults: true }, "Labs only": { prepShareTrends: false, prepShareResults: true },
  "Wearables only": { prepShareTrends: true, prepShareResults: false }, "Not shared": { prepShareTrends: false, prepShareResults: false },
};
const READING: Record<string, MetricKey> = { "Blood pressure": "bp", "Heart rate": "rhr", "SpO₂": "spo2" };
const csv = (rows: (string | number | null | undefined)[][]) => rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
const stamp = () => new Date().toISOString().slice(0, 10);

// ── Actions ──────────────────────────────────────────────────────────────
export async function runAction(b: any, c: Ctx): Promise<Result> {
  const log = (e: Omit<Parameters<typeof adminLog>[0], "actor" | "ip">) => adminLog({ ...e, actor: c.actor, ip: c.ip, role: c.role, staffId: c.staffId });

  switch (b?.action) {
    // ── Privacy: reveal masked sections (reason required) ──
    case "reveal": {
      const p = await patientOr404(b.patientId);
      const section = b.section as "health" | "labs" | "ai";
      const reason = str(b.reason, 240);
      if (!reason) throw new HttpError(400, "Choose a reason to continue.");
      const s = p.settings;
      if (section === "health" && s && !s.shareWearables) throw new HttpError(403, "Hidden by patient consent.");
      if (section === "labs" && s && !s.shareLabs) throw new HttpError(403, "Hidden by patient consent.");
      const label = { health: "Wearable data", labs: "Lab results", ai: "AI conversations" }[section];
      if (!label) throw new HttpError(400, "Unknown section.");
      await log({ kind: "Reveal", action: { health: "Revealed health data", labs: "Viewed lab results", ai: "Viewed AI conversations" }[section], resource: label, subjectType: "patient", subjectId: p.id, subject: fullName(p), reason });
      const data = section === "health" ? await revealHealth(p.id) : section === "labs" ? await revealLabs(p.id) : await revealAI(p.id);
      return { ok: true, data };
    }

    // ── AI / emergency queue ──
    case "ai.review": case "ai.unreview": {
      const [kind, id] = str(b.key, 80).split(":");
      if (kind !== "symptom") throw new HttpError(400, "Only symptom checks can be reviewed.");
      const x = await prisma.symptomCheckLog.findUnique({ where: { id }, include: { patient: { select: { id: true, firstName: true, lastName: true } } } });
      if (!x) throw new HttpError(404, "Symptom check not found.");
      const on = b.action === "ai.review";
      await prisma.symptomCheckLog.update({ where: { id }, data: on ? { reviewedAt: new Date(), reviewedBy: c.actor } : { reviewedAt: null, reviewedBy: null } });
      await log({ kind: "Change", action: on ? "Reviewed symptom check" : "Reopened symptom check", resource: "AI · " + shortCode("SC", id), subjectType: x.patient ? "patient" : "visitor", subjectId: x.patient?.id || (await prisma.visitor.findUnique({ where: { sessionId: x.sessionId }, select: { id: true } }))?.id, subject: x.patient ? fullName(x.patient) : "Visitor", before: "Status: " + (x.reviewedAt ? "Reviewed" : "New"), after: "Status: " + (on ? "Reviewed" : "New") });
      return { ok: true, undo: on ? { action: "ai.unreview", key: b.key } : undefined };
    }

    // ── Work queue items ──
    case "queue.complete": {
      const [type, id] = str(b.id, 80).split(":");
      if (type === "res") {
        const a = await prisma.appointment.findUnique({ where: { id }, include: { patient: { select: { id: true, firstName: true, lastName: true } } } });
        if (!a) throw new HttpError(404, "Appointment not found.");
        await prisma.appointment.update({ where: { id }, data: { rescheduleRequestedAt: null } });
        await log({ kind: "Change", action: "Resolved reschedule request", resource: `Appointment · ${fmtDate(a.startsAt)}`, subjectType: "patient", subjectId: a.patientId, subject: fullName(a.patient), before: "Reschedule requested", after: "Resolved" });
        return { ok: true, undo: { action: "queue.reopen", id: b.id, at: a.rescheduleRequestedAt?.toISOString() } };
      }
      if (type === "prep") {
        const a = await prisma.appointment.findUnique({ where: { id }, include: { patient: { select: { firstName: true, lastName: true } } } });
        if (!a) throw new HttpError(404, "Appointment not found.");
        await prisma.appointment.update({ where: { id }, data: { prepReviewedAt: new Date() } });
        await log({ kind: "Change", action: "Reviewed visit prep", resource: `Appointment · ${fmtDate(a.startsAt)}`, subjectType: "patient", subjectId: a.patientId, subject: fullName(a.patient) });
        return { ok: true, undo: { action: "queue.reopen", id: b.id } };
      }
      if (type === "dev") {
        const d = await prisma.deviceConnection.findUnique({ where: { id }, include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } } });
        if (!d) throw new HttpError(404, "Device not found.");
        if (!emailConfigured()) throw new HttpError(503, "Email isn't set up, so the reminder can't be sent.");
        const name = PROVIDER_NAMES[d.provider] || d.provider;
        const text = `Hi ${d.patient.firstName},\n\nYour ${name} hasn't sent new data to My Health Space${d.lastSyncAt ? " since " + fmtDate(d.lastSyncAt) : ""}. Open the NEYU Shortcut or app on your phone to sync again.\n\nIf you'd rather stop sharing, you can turn this off in My Health Space → Devices.\n\nNEYU Health`;
        const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        await sendMail({
          to: d.patient.email, subject: `Your ${name} hasn't synced with My Health Space`, text,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1D2327">${text.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("")}</div>`,
        });
        await log({ kind: "Account", action: "Sent sync reminder", resource: `Device · ${name}`, subjectType: "patient", subjectId: d.patientId, subject: fullName(d.patient) });
        return { ok: true, message: "Sent to " + d.patient.email };
      }
      if (type === "acct") return runAction({ action: "account.resend", patientId: id }, c);
      throw new HttpError(400, "This item can't be completed from the inbox.");
    }
    case "queue.reopen": {
      const [type, id] = str(b.id, 80).split(":");
      if (type === "res") await prisma.appointment.update({ where: { id }, data: { rescheduleRequestedAt: b.at ? new Date(b.at) : new Date() } });
      else if (type === "prep") await prisma.appointment.update({ where: { id }, data: { prepReviewedAt: null } });
      else throw new HttpError(400, "Can't undo this item.");
      await log({ kind: "Change", action: "Reopened inbox item (undo)", resource: type === "res" ? "Reschedule request" : "Visit prep", subjectType: "patient", subjectId: (await prisma.appointment.findUnique({ where: { id }, select: { patientId: true } }))?.patientId });
      return { ok: true };
    }

    // ── Referrals ──
    // ── Service requests (new NEYU services) ──
    case "request.status": {
      const r = await prisma.serviceRequest.findUnique({ where: { id: str(b.id, 60) } });
      if (!r) throw new HttpError(404, "Request not found.");
      const status = ["new", "contacted", "booked", "closed"].includes(b.status) ? (b.status as string) : null;
      if (!status) throw new HttpError(400, "Unknown status.");
      await prisma.serviceRequest.update({ where: { id: r.id }, data: { status } });
      await log({ kind: "Change", action: "Updated service request", resource: "Request · " + r.service, subjectType: "request", subjectId: r.id, subject: r.name, before: "Status: " + r.status, after: "Status: " + status });
      return { ok: true };
    }
    case "referral.status": {
      const r = await prisma.referralSubmission.findUnique({ where: { id: str(b.id, 60) } });
      if (!r) throw new HttpError(404, "Referral not found.");
      const status = ["received", "reviewed", "scheduled", "closed"].includes(b.status) ? (b.status as string) : null;
      if (!status) throw new HttpError(400, "Unknown status.");
      let scheduledAt: Date | undefined;
      if (status === "scheduled" && !b.restore) scheduledAt = zonedDate(str(b.date, 10), str(b.time, 12) || "9:00 a.m.");
      await prisma.referralSubmission.update({
        where: { id: r.id },
        data: {
          status, ...(status === "reviewed" && !r.reviewedAt ? { reviewedAt: new Date() } : {}),
          ...(status !== "received" ? { reviewedBy: r.reviewedBy || c.actor } : {}),
          ...(scheduledAt ? { scheduledAt } : {}), ...(status === "received" ? { reviewedBy: null, reviewedAt: null } : {}),
        },
      });
      const code = shortCode("R", r.id);
      await log({ kind: "Change", action: "Updated referral", resource: "Referral " + code, subjectType: "referral", subjectId: r.id, subject: r.patientName || "(no name)", before: "Status: " + refStatus(r.status), after: "Status: " + refStatus(status) + (scheduledAt ? ` · ${fmtFull(scheduledAt)}` : "") });
      if (r.patientId) audit(r.patientId, "admin", "update", `Referral ${code}: ${status}`, c.ip);
      return { ok: true, undo: { action: "referral.status", id: r.id, status: r.status, restore: true } };
    }
    case "referral.link": {
      const rid = str(b.referralId, 60);
      const r = await prisma.referralSubmission.findUnique({ where: { id: rid } });
      if (!r) throw new HttpError(404, "Choose a referral to link.");
      if (r.patientId && r.patientId !== b.patientId) throw new HttpError(409, "That referral is already linked to another patient.");
      const p = await patientOr404(b.patientId);
      await prisma.referralSubmission.update({ where: { id: rid }, data: { patientId: p.id, staffNote: str(b.note, 1000) || r.staffNote } });
      await log({ kind: "Change", action: "Linked referral", resource: "Referral " + shortCode("R", rid), subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "Unlinked", after: "Linked to " + p.id });
      return { ok: true };
    }
    case "referral.note": {
      const r = await prisma.referralSubmission.findUnique({ where: { id: str(b.id, 60) }, select: { id: true, patientName: true, staffNote: true } });
      if (!r) throw new HttpError(404, "Referral not found.");
      await prisma.referralSubmission.update({ where: { id: r.id }, data: { staffNote: str(b.note, 1000) || null } });
      await log({ kind: "Change", action: "Updated referral note", resource: "Referral " + shortCode("R", r.id), subjectType: "referral", subjectId: r.id, subject: r.patientName || "(no name)" });
      return { ok: true };
    }

    // ── Labs ──
    case "lab.add": {
      const p = await patientOr404(b.patientId);
      const test = str(b.test, 120), unit = str(b.unit, 30), status = b.status === "Final" ? "final" : "pending";
      const rawVal = str(b.value, 60);
      if (!test) throw new HttpError(400, "Test is required.");
      if (!unit) throw new HttpError(400, "Unit is required.");
      if (status === "final" && !rawVal) throw new HttpError(400, "A final result needs a value.");
      const n = Number(rawVal.replace(",", "."));
      const panel = str(b.panel, 60) || "Other";
      const lab = await prisma.labResult.create({
        data: {
          patientId: p.id, code: test.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "lab", name: test,
          category: PANEL_CATEGORY[panel] || "Other", status, value: rawVal && Number.isFinite(n) ? n : null, valueText: rawVal && !Number.isFinite(n) ? rawVal : null,
          unit, ...parseRange(str(b.range, 80)), collectedAt: dateOnly(b.collected, "Collected date"), panel, source: str(b.source, 80) || "BioAro Labs", staffNote: str(b.explanation, 1000) || null,
        },
      });
      await log({ kind: "Change", action: "Added lab result", resource: "Lab · " + test, subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "—", after: `${test} ${rawVal || "(pending)"} ${unit} · ${status === "final" ? "Final" : "Pending"}` });
      return { ok: true, undo: { action: "lab.remove", labId: lab.id } };
    }
    case "lab.remove": {
      const l = await prisma.labResult.findUnique({ where: { id: str(b.labId, 60) }, include: { patient: { select: { id: true, firstName: true, lastName: true } } } });
      if (!l) throw new HttpError(404, "Lab result not found.");
      if (Date.now() - l.createdAt.getTime() > 10 * 60000) throw new HttpError(409, "Only a lab result added in the last 10 minutes can be undone.");
      await prisma.labResult.delete({ where: { id: l.id } });
      await log({ kind: "Change", action: "Removed lab result (undo)", resource: "Lab · " + l.name, subjectType: "patient", subjectId: l.patientId, subject: fullName(l.patient) });
      return { ok: true };
    }

    // ── Protocol ──
    case "protocol.save": {
      const p = await patientOr404(b.patientId);
      const name = str(b.name, 120), dose = str(b.dose, 200), slot = ["Morning", "Midday", "Evening"].includes(b.timing) ? b.timing : null;
      if (!name || !dose || !slot) throw new HttpError(400, "Protocol, timing and dose are required.");
      const start = dateOnly(b.start, "Start date");
      const until = str(b.end, 10);
      const guidance = [str(b.guidance, 400), /^\d{4}-\d{2}-\d{2}$/.test(until) ? "Until " + fmtDate(new Date(until + "T12:00:00Z")) : ""].filter(Boolean).join(" · ") || null;
      const data = { title: name, dose, slot, guidance, source: str(b.source, 80) || "Care plan", startedAt: start };
      if (b.itemId) {
        const old = await prisma.protocolItem.findFirst({ where: { id: str(b.itemId, 60), patientId: p.id } });
        if (!old) throw new HttpError(404, "Protocol item not found.");
        await prisma.protocolItem.update({ where: { id: old.id }, data });
        await log({ kind: "Change", action: "Edited protocol", resource: "Protocol · " + name, subjectType: "patient", subjectId: p.id, subject: fullName(p), before: `${old.dose} · ${old.slot}${old.guidance ? " · " + old.guidance : ""}`, after: `${dose} · ${slot}${guidance ? " · " + guidance : ""}` });
      } else {
        await prisma.protocolItem.create({ data: { ...data, patientId: p.id } });
        await log({ kind: "Change", action: "Added protocol item", resource: "Protocol · " + name, subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "—", after: `${dose} · ${slot}` });
      }
      return { ok: true };
    }
    case "protocol.pause": case "protocol.end": {
      const x = await prisma.protocolItem.findUnique({ where: { id: str(b.itemId, 60) }, include: { patient: { select: { id: true, firstName: true, lastName: true } } } });
      if (!x) throw new HttpError(404, "Protocol item not found.");
      const wasPaused = !!x.pausedAt || !x.active;
      if (b.action === "protocol.end") {
        await prisma.protocolItem.update({ where: { id: x.id }, data: { active: false, endedAt: new Date() } });
        await log({ kind: "Change", action: "Ended protocol item", resource: "Protocol · " + x.title, subjectType: "patient", subjectId: x.patientId, subject: fullName(x.patient), before: "Status: " + (wasPaused ? "Paused" : "Active"), after: "Status: Ended" });
        return { ok: true };
      }
      await prisma.protocolItem.update({ where: { id: x.id }, data: wasPaused ? { active: true, pausedAt: null } : { active: false, pausedAt: new Date() } });
      await log({ kind: "Change", action: wasPaused ? "Resumed protocol item" : "Paused protocol item", resource: "Protocol · " + x.title, subjectType: "patient", subjectId: x.patientId, subject: fullName(x.patient), before: "Status: " + (wasPaused ? "Paused" : "Active"), after: "Status: " + (wasPaused ? "Active" : "Paused") });
      return { ok: true, undo: { action: "protocol.pause", itemId: x.id } };
    }

    // ── Appointments ──
    case "appt.save": {
      const p = await patientOr404(b.patientId);
      const clinician = str(b.clinician, 120), location = b.location === "Meadow Miles" ? "Meadow Miles" : "North East", type = str(b.type, 80) || "Follow-up";
      if (!clinician) throw new HttpError(400, "Clinician is required.");
      const startsAt = zonedDate(str(b.date, 10), str(b.time, 12));
      if (startsAt.getTime() < Date.now() - 60 * 60000) throw new HttpError(400, "Choose a date and time in the future.");
      const prep = PREP[b.prep] || PREP["Wearables and labs shared"];
      if (b.apptId) {
        const old = await prisma.appointment.findFirst({ where: { id: str(b.apptId, 60), patientId: p.id } });
        if (!old) throw new HttpError(404, "Appointment not found.");
        await prisma.appointment.update({ where: { id: old.id }, data: { clinician, location, title: type, startsAt, staffNotes: str(b.notes, 1000) || old.staffNotes, rescheduleRequestedAt: null, status: "scheduled" } });
        await log({ kind: "Change", action: "Rescheduled appointment", resource: "Appointment", subjectType: "patient", subjectId: p.id, subject: fullName(p), before: `${fmtFull(old.startsAt)} · ${old.clinician}`, after: `${fmtFull(startsAt)} · ${clinician}` });
      } else {
        await prisma.appointment.create({ data: { patientId: p.id, title: type, clinician, location, startsAt, staffNotes: str(b.notes, 1000) || null, ...prep } });
        await log({ kind: "Change", action: "Booked appointment", resource: "Appointment", subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "—", after: `${fmtFull(startsAt)} · ${clinician} · ${location}` });
      }
      return { ok: true, message: `${fmtDate(startsAt)} · ${fmtTime(startsAt)} · ${location}` };
    }
    case "appt.complete": case "appt.cancel": {
      const a = await prisma.appointment.findUnique({ where: { id: str(b.apptId, 60) }, include: { patient: { select: { firstName: true, lastName: true } } } });
      if (!a) throw new HttpError(404, "Appointment not found.");
      const status = b.action === "appt.complete" ? "completed" : "cancelled";
      await prisma.appointment.update({ where: { id: a.id }, data: { status, rescheduleRequestedAt: null } });
      await log({ kind: "Change", action: status === "completed" ? "Completed appointment" : "Cancelled appointment", resource: `Appointment · ${fmtDate(a.startsAt)}`, subjectType: "patient", subjectId: a.patientId, subject: fullName(a.patient), before: "Status: Scheduled", after: "Status: " + (status === "completed" ? "Completed" : "Cancelled") });
      return { ok: true };
    }

    // ── Care team ──
    case "care.add": {
      const p = await patientOr404(b.patientId);
      const doc = physicians.find((x) => x.slug === b.member);
      if (!doc) throw new HttpError(400, "Clinician is required.");
      const role = str(b.role, 80) || "Consulting physician";
      await prisma.careTeamMember.create({ data: { patientId: p.id, name: doc.name, role, physicianSlug: doc.slug, location: b.location === "Meadow Miles" ? "Meadow Miles" : "North East" } });
      await log({ kind: "Change", action: "Changed care team", resource: "Care team", subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "—", after: `${doc.name} · ${role}` });
      return { ok: true };
    }
    case "care.remove": {
      const m = await prisma.careTeamMember.findUnique({ where: { id: str(b.careId, 60) }, include: { patient: { select: { firstName: true, lastName: true } } } });
      if (!m) throw new HttpError(404, "Care team member not found.");
      await prisma.careTeamMember.delete({ where: { id: m.id } });
      await log({ kind: "Change", action: "Changed care team", resource: "Care team", subjectType: "patient", subjectId: m.patientId, subject: fullName(m.patient), before: `${m.name} · ${m.role}`, after: "Removed" });
      return { ok: true };
    }

    // ── Clinic readings ──
    case "reading.add": {
      const p = await patientOr404(b.patientId);
      const metric = READING[b.type];
      if (!metric) throw new HttpError(400, "Choose a reading type.");
      const raw = str(b.value, 20);
      if (!raw) throw new HttpError(400, "Value is required.");
      const whenRaw = str(b.when, 16);
      const at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(whenRaw) ? zonedDate(whenRaw.slice(0, 10), whenRaw.slice(11)) : null;
      if (!at) throw new HttpError(400, "Date and time is required.");
      let value: number, valueText: string | null = null;
      if (metric === "bp") {
        const m = raw.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
        if (!m) throw new HttpError(400, "Blood pressure looks like 128/82.");
        value = Number(m[1]); valueText = `${m[1]}/${m[2]}`;
      } else value = Number(raw);
      const def = METRIC_DEFS[metric];
      if (!Number.isFinite(value) || value < def.min || value > def.max) throw new HttpError(400, `Value must be between ${def.min} and ${def.max}.`);
      const day = dayKey(at, p.timezone);
      await prisma.healthReading.upsert({
        where: { patientId_metric_day_source: { patientId: p.id, metric, day, source: "clinic" } },
        create: { patientId: p.id, metric, day, source: "clinic", value, valueText, recordedAt: at },
        update: { value, valueText, recordedAt: at },
      });
      await log({ kind: "Change", action: "Added clinic reading", resource: "Reading · " + b.type, subjectType: "patient", subjectId: p.id, subject: fullName(p), before: "—", after: `${valueText || value} ${def.unit}` });
      return { ok: true };
    }

    // ── Account & sessions ──
    case "session.revoke": {
      const s = await prisma.patientSession.findUnique({ where: { id: str(b.sessionId, 60) }, include: { patient: { select: { id: true, firstName: true, lastName: true } } } });
      if (!s) throw new HttpError(404, "Session not found.");
      await prisma.patientSession.delete({ where: { id: s.id } });
      await log({ kind: "Account", action: "Signed patient out", resource: "Session", subjectType: "patient", subjectId: s.patientId, subject: fullName(s.patient) });
      return { ok: true };
    }
    case "session.revokeAll": {
      const p = await patientOr404(b.patientId);
      const n = await prisma.patientSession.deleteMany({ where: { patientId: p.id } });
      await log({ kind: "Account", action: "Signed patient out", resource: "All sessions", subjectType: "patient", subjectId: p.id, subject: fullName(p), after: `${n.count} session${n.count === 1 ? "" : "s"} ended` });
      return { ok: true };
    }
    case "account.unlock": {
      const p = await patientOr404(b.patientId);
      await prisma.patient.update({ where: { id: p.id }, data: { lockedUntil: null, failedLogins: 0 } });
      await log({ kind: "Account", action: "Unlocked patient account", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p) });
      return { ok: true };
    }
    case "account.resend": {
      const p = await patientOr404(b.patientId);
      if (p.emailVerifiedAt) throw new HttpError(409, "This email is already verified.");
      await sendVerificationCode({ id: p.id, email: p.email, firstName: p.firstName });
      await log({ kind: "Account", action: "Resent verification email", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p) });
      return { ok: true, message: "Sent to " + p.email };
    }
    // When the patient can't get the email code (e.g. email service not set up yet), staff can
    // confirm the address after checking it with the patient (phone call / in person).
    case "account.verify": {
      const p = await patientOr404(b.patientId);
      if (p.emailVerifiedAt) throw new HttpError(409, "This email is already verified.");
      const how = str(b.how, 120);
      if (how.length < 3) throw new HttpError(400, "Say how you confirmed the email (e.g. phone call).");
      await prisma.patient.update({ where: { id: p.id }, data: { emailVerifiedAt: new Date() } });
      await log({ kind: "Account", action: "Confirmed email by hand", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p), reason: how, before: "Email not verified", after: "Email verified" });
      return { ok: true };
    }
    case "push.test": {
      // A test notification to the patient's phones (general text only — it can show on a locked screen).
      const p = await patientOr404(b.patientId);
      const { patientPush } = await import("@backend/push");
      const ok = await patientPush(p.id, "account", { title: "NEYU", body: "A test message from your NEYU care team. Notifications are working.", url: "/my-health" });
      if (!ok) throw new HttpError(409, "This patient hasn't turned on notifications in the NEYU app.");
      await log({ kind: "Account", action: "Sent test notification", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p) });
      return { ok: true };
    }
    case "account.deactivate": {
      const p = await patientOr404(b.patientId);
      const next = p.accountStatus === "deactivated" ? "active" : "deactivated";
      await prisma.patient.update({ where: { id: p.id }, data: { accountStatus: next } });
      if (next === "deactivated") await prisma.patientSession.deleteMany({ where: { patientId: p.id } });
      await log({ kind: "Account", action: next === "active" ? "Reactivated account" : "Deactivated account", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p), before: p.accountStatus, after: next });
      return { ok: true };
    }
    case "account.delete": {
      const p = await patientOr404(b.patientId);
      if (str(b.confirm, 10) !== "DELETE") throw new HttpError(400, "Type DELETE to confirm.");
      // Same 30-day hold as a patient's own request; cancel any time in Settings → Privacy requests.
      const { requestDeletion } = await import("@backend/privacy");
      const full = await prisma.patient.findUnique({ where: { id: p.id }, select: { id: true, email: true, firstName: true } });
      const r = await requestDeletion(full!, "", str(b.reason, 300) || "Requested through the clinic", "staff", { ip: c.ip });
      await prisma.$transaction([
        prisma.patientSession.deleteMany({ where: { patientId: p.id } }),
        prisma.deviceConnection.updateMany({ where: { patientId: p.id }, data: { status: "disconnected", tokenHash: null } }),
      ]);
      await log({ kind: "Account", action: "Requested account deletion (30-day hold)", resource: "Account", subjectType: "patient", subjectId: p.id, subject: fullName(p), before: p.accountStatus, after: "Deletes " + r.scheduledFor.toISOString().slice(0, 10) });
      return { ok: true };
    }

    // ── Exports (every export is logged) ──
    case "export.patient": {
      const p = await patientOr404(b.patientId);
      const full = await prisma.patient.findUnique({
        where: { id: p.id },
        select: {
          id: true, email: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, timezone: true, createdAt: true, emailVerifiedAt: true, lastLoginAt: true, accountStatus: true,
          settings: true, goals: true, careTeam: true, devices: { select: { provider: true, status: true, connectedAt: true, lastSyncAt: true, dataTypes: true } },
          readings: { orderBy: { recordedAt: "desc" }, take: 20000 }, labResults: true, protocolItems: true, appointments: { include: { questions: true } },
          referrals: true, symptomChecks: true, conversations: { include: { messages: true } }, assessments: true, labChecks: true,
          accessLogs: { orderBy: { createdAt: "desc" }, take: 5000 },
        },
      });
      // Only data the patient has chosen to share with the clinic is included.
      const s = p.settings;
      const out = { exportedAt: new Date().toISOString(), exportedBy: c.actor, notice: "Protected health information — handle under the Alberta Health Information Act.", ...full, readings: s && !s.shareWearables ? "Hidden by patient consent" : full?.readings.filter((r) => r.source === "clinic" || !s || s.shareWearables), labResults: s && !s.shareLabs ? "Hidden by patient consent" : full?.labResults };
      await log({ kind: "Export", action: "Exported patient data", resource: "Patient export (JSON)", subjectType: "patient", subjectId: p.id, subject: fullName(p) });
      return { ok: true, file: { name: `anra-export-${p.id}-${stamp()}.json`, mime: "application/json", content: JSON.stringify(out, null, 2) } };
    }
    case "export.patients": {
      const rows = await patientsList();
      await log({ kind: "Export", action: "Exported patient list (CSV)", resource: "Patient list", subject: `${rows.length} patients` });
      return { ok: true, file: { name: `neyu-patients-${stamp()}.csv`, mime: "text/csv", content: csv([["Patient ID", "Name", "Email", "Phone", "Verified", "Age", "Last active", "Connected devices", "Next appointment", "Member since", "Account", "Test"], ...rows.map((r) => [r.id, r.name, r.email, r.phone, r.verified ? "Yes" : "No", r.age ?? "", r.lastActive, r.devices, r.nextAppt, r.since, r.acct, r.test ? "Yes" : ""])]) } };
    }
    case "export.audit": {
      const rows = await auditList(20000);
      await log({ kind: "Export", action: "Exported audit log (CSV)", resource: "Audit log", subject: `${rows.length} events` });
      return { ok: true, file: { name: `anra-audit-log-${stamp()}.csv`, mime: "text/csv", content: csv([["Timestamp (MT)", "Who", "Role", "Type", "Action", "Resource", "Patient / visitor", "Subject ID", "IP", "Result", "Reason", "Before", "After"], ...rows.map((e) => [e.ts, e.who, e.role, e.kind, e.action, e.resource, e.subject, e.subjectId, e.ip, e.result, e.reason, e.before, e.after])]) } };
    }
    case "export.system": {
      const [refs, appts, pts] = await Promise.all([referralsList(), prisma.appointment.findMany({ include: { patient: { select: { firstName: true, lastName: true } } }, orderBy: { startsAt: "desc" } }), patientsList()]);
      await log({ kind: "Export", action: "Exported system data", resource: "System export (CSV)", subject: "—" });
      const parts = [
        "# Referrals", csv([["Code", "Patient", "Urgency", "Specialty", "Referring physician", "Status", "Received", "Scheduled", "Reviewed by", "Linked patient ID"], ...refs.map((r) => [r.code, r.patient, r.urgency, r.specialty, r.referring, r.status, r.received, r.scheduled, r.reviewer, r.pid])]),
        "", "# Appointments", csv([["Patient", "Type", "Clinician", "Location", "Starts (MT)", "Status"], ...appts.map((a) => [fullName(a.patient), a.title, a.clinician, a.location, fmtFull(a.startsAt), a.status])]),
        "", "# Accounts", csv([["Patient ID", "Name", "Email", "Verified", "Member since", "Account"], ...pts.map((p) => [p.id, p.name, p.email, p.verified ? "Yes" : "No", p.since, p.acct])]),
      ];
      return { ok: true, file: { name: `neyu-system-export-${stamp()}.csv`, mime: "text/csv", content: parts.join("\n") } };
    }

    default:
      throw new HttpError(400, "Unknown action.");
  }
}

