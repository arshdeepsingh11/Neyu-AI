// Patient privacy (Phase 3 · part 4)
//   • Consents      — every grant/withdrawal is a new row (legal record), never overwritten
//   • Email prefs   — reminders / news on or off, one-click unsubscribe
//   • Delete account — 30-day hold (cancel any time), then the background worker deletes
//                      everything; the DeletionRequest row stays as the deletion certificate
//   • Data export    — the worker builds a .zip (all data as JSON + the original files),
//                      downloadable for 7 days, then removed

import { zipSync, strToU8 } from "fflate";
import { prisma } from "@backend/db";
import { HttpError, verifyPassword } from "@backend/patientAuth";
import { storage, exportKey, patientPrefix, docBytes } from "@backend/storage";
import { enqueue } from "@backend/queue";
import { patientMail, publicBase, emailPrefs } from "@backend/notify";
import { simpleEmail } from "@backend/email";

export const DELETION_HOLD_DAYS = 30;
export const EXPORT_KEEP_DAYS = 7;
const DAY = 86400_000;

const POLICY_KINDS = ["terms", "privacy", "ai", "marketing"] as const;
export type ConsentKind = (typeof POLICY_KINDS)[number];

async function currentPolicy(kind: string) {
  return prisma.policyVersion.findFirst({ where: { kind }, orderBy: { publishedAt: "desc" } });
}

export async function recordConsent(patientId: string, kind: ConsentKind, granted: boolean, method: "signup" | "settings" | "unsubscribe" | "staff", meta: { ip?: string; userAgent?: string } = {}) {
  const pol = await currentPolicy(kind);
  return prisma.consent.create({ data: { patientId, kind, policyVersionId: pol?.id || null, granted, method, ip: meta.ip?.slice(0, 60) || null, userAgent: meta.userAgent?.slice(0, 300) || null } });
}

// ── Patient view ────────────────────────────────────────────────────────────
export async function privacyState(patientId: string) {
  const [consents, policies, pref, deletion, exports, settings] = await Promise.all([
    prisma.consent.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 200, include: { policyVersion: { select: { version: true, url: true } } } }),
    prisma.policyVersion.findMany({ orderBy: { publishedAt: "desc" } }),
    emailPrefs(patientId),
    prisma.deletionRequest.findFirst({ where: { patientId, status: "pending" }, orderBy: { requestedAt: "desc" } }),
    prisma.exportRequest.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.patientSettings.findUnique({ where: { patientId }, select: { albaAccess: true } }),
  ]);
  const latest = (k: string) => consents.find((c) => c.kind === k);
  // AI and news follow the live switches (accounts older than consent records have no row yet).
  const live: Record<string, boolean | undefined> = { ai: settings ? settings.albaAccess : undefined, marketing: pref.news };
  return {
    consents: POLICY_KINDS.map((k) => {
      const c = latest(k), pol = policies.find((p) => p.kind === k);
      return { kind: k, granted: live[k] ?? (c ? c.granted : k === "terms" || k === "privacy"), at: c?.createdAt.toISOString() || null, version: c?.policyVersion?.version || pol?.version || null, url: pol?.url || null, summary: pol?.summary || "" };
    }),
    history: consents.slice(0, 30).map((c) => ({ kind: c.kind, granted: c.granted, method: c.method, at: c.createdAt.toISOString(), version: c.policyVersion?.version || null })),
    email: { reminders: pref.reminders, news: pref.news, unsubscribed: !!pref.unsubscribedAt },
    deletion: deletion ? { id: deletion.id, requestedAt: deletion.requestedAt.toISOString(), scheduledFor: deletion.scheduledFor.toISOString() } : null,
    exports: exports.map((e) => ({ id: e.id, status: e.status, createdAt: e.createdAt.toISOString(), expiresAt: e.expiresAt?.toISOString() || null })),
  };
}

export async function setEmailPrefs(patientId: string, b: { reminders?: unknown; news?: unknown }, meta: { ip?: string; userAgent?: string }) {
  const pref = await emailPrefs(patientId);
  const data: { reminders?: boolean; news?: boolean; unsubscribedAt?: Date | null } = {};
  if (typeof b.reminders === "boolean") data.reminders = b.reminders;
  if (typeof b.news === "boolean") data.news = b.news;
  if (!Object.keys(data).length) throw new HttpError(400, "Nothing to update.");
  if (data.reminders || data.news) data.unsubscribedAt = null; // turning something on re-subscribes
  await prisma.emailPreference.update({ where: { patientId }, data });
  if (typeof data.news === "boolean" && data.news !== pref.news) await recordConsent(patientId, "marketing", data.news, "settings", meta);
}

export async function setAiConsent(patientId: string, granted: boolean, meta: { ip?: string; userAgent?: string }) {
  await recordConsent(patientId, "ai", granted, "settings", meta);
}

// ── Unsubscribe (link in every reminder/news email; no sign-in needed) ─────────
export async function unsubscribe(token: string, scope: "all" | "news" | "reminders", meta: { ip?: string } = {}) {
  if (!/^[\w-]{10,64}$/.test(token)) throw new HttpError(400, "This link isn't valid.");
  const pref = await prisma.emailPreference.findUnique({ where: { unsubscribeToken: token }, include: { patient: { select: { email: true } } } });
  if (!pref) throw new HttpError(404, "This link isn't valid any more.");
  const data = scope === "all" ? { reminders: false, news: false, unsubscribedAt: new Date() } : scope === "news" ? { news: false } : { reminders: false };
  await prisma.emailPreference.update({ where: { patientId: pref.patientId }, data });
  if (pref.news && scope !== "reminders") await recordConsent(pref.patientId, "marketing", false, "unsubscribe", meta);
  await prisma.auditEvent.create({ data: { actorType: "patient", actorId: pref.patientId, action: "update", resource: "email.preferences", subjectPatientId: pref.patientId, ip: meta.ip?.slice(0, 60) || null, meta: { unsubscribe: scope } } });
  return { email: pref.patient.email.replace(/(^.).*(@.*$)/, "$1***$2"), scope };
}

export async function unsubscribeInfo(token: string) {
  if (!/^[\w-]{10,64}$/.test(token)) return null;
  const pref = await prisma.emailPreference.findUnique({ where: { unsubscribeToken: token }, include: { patient: { select: { email: true } } } });
  return pref ? { email: pref.patient.email.replace(/(^.).*(@.*$)/, "$1***$2"), reminders: pref.reminders, news: pref.news, unsubscribed: !!pref.unsubscribedAt } : null;
}

// ── Delete account (30-day hold) ─────────────────────────────────────────────
export async function requestDeletion(p: { id: string; email: string; firstName: string; passwordHash?: string }, password: string, reason: string, by: "patient" | "staff" = "patient", meta: { ip?: string } = {}) {
  if (by === "patient") {
    const full = await prisma.patient.findUnique({ where: { id: p.id }, select: { passwordHash: true } });
    if (!full || !(await verifyPassword(password || "", full.passwordHash))) throw new HttpError(401, "Your password isn't right.");
  }
  const open = await prisma.deletionRequest.findFirst({ where: { patientId: p.id, status: "pending" } });
  if (open) return open;
  const scheduledFor = new Date(Date.now() + DELETION_HOLD_DAYS * DAY);
  const r = await prisma.deletionRequest.create({ data: { patientId: p.id, reason: reason?.slice(0, 500) || null, requestedBy: by, scheduledFor } });
  await prisma.patient.update({ where: { id: p.id }, data: { accountStatus: "deletion_requested" } });
  await prisma.auditEvent.create({ data: { actorType: by === "patient" ? "patient" : "staff", actorId: by === "patient" ? p.id : null, action: "delete", resource: "account.deletion.requested", subjectPatientId: p.id, subjectId: r.id, ip: meta.ip?.slice(0, 60) || null, meta: { scheduledFor: scheduledFor.toISOString(), by } } });
  const when = scheduledFor.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Edmonton" });
  await patientMail(p, "account", () => simpleEmail("Your account will be deleted", [
    `Hi ${p.firstName}, we received a request to delete your My Health Space account.`,
    `Everything will be permanently deleted on ${when}. Until then you can cancel at any time from My Health Space → Privacy & Data.`,
    "If you didn't ask for this, sign in and cancel it, then change your password.",
  ], { label: "Open Privacy & Data", url: `${publicBase()}/my-health?s=privacy` }));
  return r;
}

export async function cancelDeletion(patientId: string, by: "patient" | "staff", meta: { ip?: string; actor?: string } = {}) {
  const open = await prisma.deletionRequest.findFirst({ where: { patientId, status: "pending" } });
  if (!open) throw new HttpError(404, "There's no deletion request to cancel.");
  await prisma.$transaction([
    prisma.deletionRequest.update({ where: { id: open.id }, data: { status: "cancelled", cancelledAt: new Date() } }),
    prisma.patient.update({ where: { id: patientId }, data: { accountStatus: "active" } }),
  ]);
  await prisma.auditEvent.create({ data: { actorType: by, actorLabel: meta.actor || null, action: "update", resource: "account.deletion.cancelled", subjectPatientId: patientId, subjectId: open.id, ip: meta.ip?.slice(0, 60) || null } });
  return { ok: true };
}

/** Permanently deletes the account of one due request. Returns the certificate summary. */
export async function runDeletion(requestId: string, force = false) {
  const r = await prisma.deletionRequest.findUnique({ where: { id: requestId } });
  if (!r || !r.patientId) return null;
  if (r.status !== "pending" || (!force && r.scheduledFor > new Date())) return null;
  const claimed = await prisma.deletionRequest.updateMany({ where: { id: r.id, status: "pending" }, data: { status: "running" } });
  if (!claimed.count) return null; // another worker took it
  const pid = r.patientId;
  try {
    const p = await prisma.patient.findUnique({ where: { id: pid }, select: { email: true, firstName: true } });
    const count = async (fn: () => Promise<number>) => { try { return await fn(); } catch { return 0; } };
    const summary: Record<string, number | string> = {
      readings: await count(() => prisma.healthReading.count({ where: { patientId: pid } })),
      labResults: await count(() => prisma.labResult.count({ where: { patientId: pid } })),
      documents: await count(() => prisma.healthDocument.count({ where: { patientId: pid } })),
      appointments: await count(() => prisma.appointment.count({ where: { patientId: pid } })),
      conversations: await count(() => prisma.albaConversation.count({ where: { patientId: pid } })),
      consents: await count(() => prisma.consent.count({ where: { patientId: pid } })),
    };
    summary.files = await storage.delPrefix(patientPrefix(pid));
    await prisma.patient.delete({ where: { id: pid } }); // everything linked cascades; the request row is kept (patientId → null)
    summary.deletedAt = new Date().toISOString();
    await prisma.deletionRequest.update({ where: { id: r.id }, data: { status: "completed", completedAt: new Date(), summary } });
    await prisma.auditEvent.create({ data: { actorType: "system", actorLabel: "privacy worker", action: "delete", resource: "account.deleted", subjectId: r.id, meta: summary } });
    if (p) await enqueue("email.send", { to: p.email, ...simpleEmail("Your account has been deleted", [`Hi ${p.firstName}, your My Health Space account and its data have been permanently deleted, as you asked.`, "Thank you for trusting NEYU Health with your care. You're always welcome back."]) });
    return summary;
  } catch (e: any) {
    await prisma.deletionRequest.update({ where: { id: r.id }, data: { status: "pending" } }).catch(() => {});
    throw e;
  }
}

// ── Data export ──────────────────────────────────────────────────────────────
export async function requestExport(patientId: string, meta: { ip?: string } = {}) {
  const recent = await prisma.exportRequest.count({ where: { patientId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (recent >= 3) throw new HttpError(429, "You can make 3 exports a day. Please try again tomorrow.");
  const e = await prisma.exportRequest.create({ data: { patientId } });
  await prisma.auditEvent.create({ data: { actorType: "patient", actorId: patientId, action: "export", resource: "account.export.requested", subjectPatientId: patientId, subjectId: e.id, ip: meta.ip?.slice(0, 60) || null } });
  await enqueue("privacy.export", { exportId: e.id }, { jobId: "export-" + e.id });
  return e;
}

/** Everything about the patient as plain data (also used by the instant JSON download). */
export async function patientData(id: string) {
  const [profile, settings, goals, careTeam, devices, readings, labResults, protocol, appointments, questions, referrals, symptomChecks, assessments, labChecks, conversations, documents, food, consents, emailPreference] = await Promise.all([
    prisma.patient.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, timezone: true, createdAt: true } }),
    prisma.patientSettings.findUnique({ where: { patientId: id } }),
    prisma.goal.findMany({ where: { patientId: id }, select: { label: true } }),
    prisma.careTeamMember.findMany({ where: { patientId: id }, select: { name: true, role: true } }),
    prisma.deviceConnection.findMany({ where: { patientId: id }, select: { provider: true, status: true, connectedAt: true, lastSyncAt: true, dataTypes: true } }),
    prisma.healthReading.findMany({ where: { patientId: id }, select: { metric: true, day: true, value: true, valueText: true, source: true, recordedAt: true }, orderBy: [{ metric: "asc" }, { day: "asc" }] }),
    prisma.labResult.findMany({ where: { patientId: id } }),
    prisma.protocolItem.findMany({ where: { patientId: id }, include: { logs: { select: { day: true, doneAt: true } } } }),
    prisma.appointment.findMany({ where: { patientId: id } }),
    prisma.visitQuestion.findMany({ where: { patientId: id }, select: { text: true, createdAt: true, appointmentId: true } }),
    prisma.referralSubmission.findMany({ where: { patientId: id } }),
    prisma.symptomCheckLog.findMany({ where: { patientId: id } }),
    prisma.longevityAssessment.findMany({ where: { patientId: id } }),
    prisma.labResultCheck.findMany({ where: { patientId: id } }),
    prisma.albaConversation.findMany({ where: { patientId: id }, select: { createdAt: true, pageContext: true, messages: { select: { role: true, text: true, createdAt: true } } } }),
    prisma.healthDocument.findMany({ where: { patientId: id }, select: { id: true, title: true, kind: true, provider: true, docDate: true, source: true, fileName: true, mime: true, extracted: true, summary: true, createdAt: true } }),
    prisma.foodLog.findMany({ where: { patientId: id }, select: { day: true, meal: true, text: true, portion: true, tags: true, at: true } }),
    prisma.consent.findMany({ where: { patientId: id }, select: { kind: true, granted: true, method: true, createdAt: true } }),
    prisma.emailPreference.findUnique({ where: { patientId: id }, select: { reminders: true, news: true, unsubscribedAt: true } }),
  ]);
  const clean = (rows: any[]) => rows.map(({ patientId, sessionId, itemId, ...r }) => r);
  return { profile, settings, goals, careTeam, devices, readings, labResults: clean(labResults), protocol: clean(protocol), appointments: clean(appointments), questions, referrals: clean(referrals), symptomChecks: clean(symptomChecks), assessments: clean(assessments), labChecks: clean(labChecks), conversations, documents, food, consents, emailPreference };
}

export async function buildExport(exportId: string) {
  const e = await prisma.exportRequest.findUnique({ where: { id: exportId }, include: { patient: { select: { id: true, email: true, firstName: true } } } });
  if (!e || e.status !== "pending") return null;
  const data = await patientData(e.patientId);
  const files: Record<string, Uint8Array> = {
    "README.txt": strToU8(`NEYU Health — your data export\nCreated ${new Date().toISOString()}\n\nmy-health-space.json  everything in My Health Space\ndocuments/            your original reports, exactly as added\n\nKeep this file private: it contains your health information.\n`),
    "my-health-space.json": strToU8(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)),
  };
  for (const d of data.documents) {
    const full = await prisma.healthDocument.findUnique({ where: { id: d.id }, select: { data: true, storageKey: true } });
    try { files[`documents/${d.id}-${d.fileName.replace(/[^\w.\- ]/g, "_")}`] = new Uint8Array(await docBytes(full!)); } catch { /* missing file is listed in the JSON */ }
  }
  const zip = Buffer.from(zipSync(files, { level: 6 }));
  const key = exportKey(e.patientId, e.id).replace(/\.json$/, ".zip");
  await storage.put(key, zip);
  const expiresAt = new Date(Date.now() + EXPORT_KEEP_DAYS * DAY);
  await prisma.exportRequest.update({ where: { id: e.id }, data: { status: "ready", fileKey: key, completedAt: new Date(), expiresAt } });
  await patientMail(e.patient, "account", () => simpleEmail("Your data export is ready", [
    `Hi ${e.patient.firstName}, your My Health Space export is ready (${(zip.length / 1024 / 1024).toFixed(1)} MB).`,
    `Download it from Privacy & Data within ${EXPORT_KEEP_DAYS} days. After that it is deleted for your privacy.`,
  ], { label: "Open Privacy & Data", url: `${publicBase()}/my-health?s=privacy` }));
  return { bytes: zip.length, files: Object.keys(files).length };
}

export async function exportFile(patientId: string, exportId: string) {
  const e = await prisma.exportRequest.findFirst({ where: { id: exportId.slice(0, 40), patientId } });
  if (!e || e.status !== "ready" || !e.fileKey || (e.expiresAt && e.expiresAt < new Date())) throw new HttpError(404, "This export isn't available any more.");
  const buf = await storage.get(e.fileKey);
  if (!buf) throw new HttpError(404, "This export isn't available any more.");
  return buf;
}

// ── Hourly sweep (worker / cron) ─────────────────────────────────────────────
export async function privacySweep() {
  const due = await prisma.deletionRequest.findMany({ where: { status: "pending", scheduledFor: { lte: new Date() } }, select: { id: true }, take: 200 });
  for (const d of due) await enqueue("privacy.deletion.run", { requestId: d.id }, { jobId: "del-" + d.id });
  const old = await prisma.exportRequest.findMany({ where: { status: "ready", expiresAt: { lt: new Date() } }, take: 500 });
  for (const e of old) {
    if (e.fileKey) await storage.del(e.fileKey).catch(() => {});
    await prisma.exportRequest.update({ where: { id: e.id }, data: { status: "expired", fileKey: null } });
  }
  // Export jobs that never ran (e.g. server restarted in laptop mode) are retried.
  const stuck = await prisma.exportRequest.findMany({ where: { status: "pending", createdAt: { lt: new Date(Date.now() - 15 * 60_000) } }, select: { id: true }, take: 50 });
  for (const s of stuck) await enqueue("privacy.export", { exportId: s.id });
  return { deletionsQueued: due.length, exportsExpired: old.length, exportsRetried: stuck.length };
}

// ── Admin view ───────────────────────────────────────────────────────────────
export async function privacyAdminView() {
  const [deletions, exports] = await Promise.all([
    prisma.deletionRequest.findMany({ orderBy: { requestedAt: "desc" }, take: 100, include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    prisma.exportRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { patient: { select: { id: true, firstName: true, lastName: true } } } }),
  ]);
  return {
    holdDays: DELETION_HOLD_DAYS,
    deletions: deletions.map((d) => ({ id: d.id, patientId: d.patient?.id || null, patient: d.patient ? `${d.patient.firstName} ${d.patient.lastName}` : "Deleted account", status: d.status, requestedBy: d.requestedBy, reason: d.reason, requestedAt: d.requestedAt.toISOString(), scheduledFor: d.scheduledFor.toISOString(), completedAt: d.completedAt?.toISOString() || null, summary: d.summary })),
    exports: exports.map((e) => ({ id: e.id, patientId: e.patient.id, patient: `${e.patient.firstName} ${e.patient.lastName}`, status: e.status, createdAt: e.createdAt.toISOString(), expiresAt: e.expiresAt?.toISOString() || null })),
  };
}

