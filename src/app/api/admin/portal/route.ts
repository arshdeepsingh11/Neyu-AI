// Clinic-side writes for My Health Space (patients can't write clinical data).
// Protected by the /admin staff sign-in (requireAdmin).
//
// POST /api/admin/portal  { type, patientEmail, data }
//   type = "labResult" | "protocolItem" | "appointment" | "careTeam" | "reading" | "referral"
// GET  /api/admin/portal?email=… — quick patient lookup (id, name, counts)
//
// Every write is recorded in the patient's AccessLog as actor "admin".

import { NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { requireAdmin } from "@backend/adminAuth";
import { audit } from "@backend/audit";
import { clientMeta, normalizeEmail, assertSameOrigin } from "@backend/patientAuth";
import { isMetricKey, METRIC_DEFS, dayKey } from "@/lib/portal/metrics";
import { physicians } from "@/data/physicians";
import { readJson, toResponse, str, HttpError } from "@backend/apiHelpers";

const CATEGORIES = ["Heart Health", "Metabolic Health", "Inflammation", "Nutrition", "Hormones", "Genomics", "Other"];
const SLOTS = ["Morning", "Midday", "Evening"];

const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
const dateOrNull = (v: unknown, field: string) => {
  if (!v) return null;
  // Date-only values ("2026-09-18") are stored at noon UTC so they show the
  // same calendar day in every Canadian timezone.
  const raw = String(v), d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T12:00:00Z" : raw);
  if (isNaN(d.getTime())) throw new HttpError(400, `${field} is not a valid date.`);
  return d;
};

async function patientByEmail(email: unknown) {
  const p = await prisma.patient.findUnique({ where: { email: normalizeEmail(str(email, 254)) }, select: { id: true, timezone: true } });
  if (!p) throw new HttpError(404, "No My Health Space account with that email.");
  return p;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const email = normalizeEmail(new URL(req.url).searchParams.get("email") || "");
    const p = await prisma.patient.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, createdAt: true, _count: { select: { labResults: true, protocolItems: true, appointments: true, readings: true, careTeam: true } } },
    });
    if (!p) throw new HttpError(404, "Not found.");
    return NextResponse.json(p, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return toResponse(e); }
}

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    await requireAdmin();
    const { ip } = await clientMeta();
    const b = await readJson(req, 200_000);
    const d = b.data || {};
    let created: unknown;

    switch (b.type) {
      case "labResult": {
        const p = await patientByEmail(b.patientEmail);
        const code = str(d.code, 40).toLowerCase(), name = str(d.name, 120), category = CATEGORIES.includes(d.category) ? d.category : "Other";
        const status = d.status === "pending" ? "pending" : "final";
        const value = numOrNull(d.value), refLow = numOrNull(d.refLow), refHigh = numOrNull(d.refHigh);
        if (!code || !name) throw new HttpError(400, "code and name are required.");
        if ([value, refLow, refHigh].some((x) => Number.isNaN(x))) throw new HttpError(400, "value/refLow/refHigh must be numbers.");
        if (status === "final" && value == null && !d.valueText) throw new HttpError(400, "A final result needs value or valueText.");
        created = await prisma.labResult.create({ data: {
          patientId: p.id, code, name, category, status, value, refLow, refHigh,
          fullName: str(d.fullName, 200) || null, valueText: str(d.valueText, 120) || null, unit: str(d.unit, 30) || null, refText: str(d.refText, 80) || null,
          collectedAt: dateOrNull(d.collectedAt, "collectedAt"), expectedAt: dateOrNull(d.expectedAt, "expectedAt"),
          source: str(d.source, 80) || "BioAro Labs", panel: str(d.panel, 120) || null, about: str(d.about, 2000) || null, guidance: str(d.guidance, 2000) || null,
        }, select: { id: true } });
        audit(p.id, "admin", "create", `labResult:${code}`, ip);
        break;
      }
      case "protocolItem": {
        const p = await patientByEmail(b.patientEmail);
        const title = str(d.title, 120), dose = str(d.dose, 200), slot = SLOTS.includes(d.slot) ? d.slot : null;
        if (!title || !dose || !slot) throw new HttpError(400, "title, dose and slot (Morning|Midday|Evening) are required.");
        if (d.timeOfDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.timeOfDay)) throw new HttpError(400, "timeOfDay must be HH:MM.");
        const sections = Array.isArray(d.sections) ? d.sections.slice(0, 10).map((s: any) => ({ h: str(s?.h, 80), t: str(s?.t, 1000) })).filter((s: any) => s.h && s.t) : [];
        created = await prisma.protocolItem.create({ data: {
          patientId: p.id, title, dose, slot, timeOfDay: d.timeOfDay || null, source: str(d.source, 80) || "Care plan",
          sections: JSON.stringify(sections), guidance: str(d.guidance, 500) || null, sortOrder: Number(d.sortOrder) || 0,
        }, select: { id: true } });
        audit(p.id, "admin", "create", `protocolItem:${title}`, ip);
        break;
      }
      case "appointment": {
        const p = await patientByEmail(b.patientEmail);
        const title = str(d.title, 120), clinician = str(d.clinician, 120), startsAt = dateOrNull(d.startsAt, "startsAt");
        if (!title || !clinician || !startsAt) throw new HttpError(400, "title, clinician and startsAt are required.");
        created = await prisma.appointment.create({ data: {
          patientId: p.id, title, clinician, startsAt, location: str(d.location, 200) || "NEYU Clinic",
          durationMin: Math.min(480, Math.max(5, Number(d.durationMin) || 30)), status: ["scheduled", "completed", "cancelled"].includes(d.status) ? d.status : "scheduled",
          summaryAvailable: d.summaryAvailable === true,
        }, select: { id: true } });
        audit(p.id, "admin", "create", `appointment:${title}`, ip);
        break;
      }
      case "careTeam": {
        const p = await patientByEmail(b.patientEmail);
        const slug = str(d.physicianSlug, 80), doc = slug ? physicians.find((x) => x.slug === slug) : null;
        const name = str(d.name, 120) || doc?.name || "", role = str(d.role, 120) || doc?.disciplines.join(", ") || "";
        if (!name || !role) throw new HttpError(400, "name and role (or a valid physicianSlug) are required.");
        created = await prisma.careTeamMember.create({ data: { patientId: p.id, name, role, physicianSlug: doc?.slug ?? null }, select: { id: true } });
        audit(p.id, "admin", "create", `careTeam:${name}`, ip);
        break;
      }
      case "reading": {
        // Clinic-measured values, e.g. { metric: "bp", valueText: "118/76" } or { metric: "rhr", value: 64 }
        const p = await patientByEmail(b.patientEmail);
        const metric = str(d.metric, 20);
        if (!isMetricKey(metric)) throw new HttpError(400, "Unknown metric.");
        const at = dateOrNull(d.recordedAt, "recordedAt") || new Date();
        let value = numOrNull(d.value), valueText = str(d.valueText, 60) || null;
        if (metric === "bp") { const m = (valueText || "").match(/^(\d{2,3})\/(\d{2,3})$/); if (!m) throw new HttpError(400, "bp valueText must look like 118/76."); value = Number(m[1]); }
        const def = METRIC_DEFS[metric];
        if (value == null || Number.isNaN(value) || value < def.min || value > def.max) throw new HttpError(400, `value out of range (${def.min}–${def.max}).`);
        const day = dayKey(at, p.timezone);
        created = await prisma.healthReading.upsert({
          where: { patientId_metric_day_source: { patientId: p.id, metric, day, source: "clinic" } },
          create: { patientId: p.id, metric, day, source: "clinic", value, valueText, recordedAt: at },
          update: { value, valueText, recordedAt: at }, select: { id: true },
        });
        audit(p.id, "admin", "create", `reading:${metric}`, ip);
        break;
      }
      case "referral": {
        // Link a Referral Centre submission to a patient and/or update its status.
        const id = str(b.referralId, 40);
        const ref = await prisma.referralSubmission.findUnique({ where: { id }, select: { id: true, patientId: true } });
        if (!ref) throw new HttpError(404, "Referral not found.");
        const patient = b.patientEmail ? await patientByEmail(b.patientEmail) : null;
        const status = ["received", "reviewed", "scheduled", "closed"].includes(d.status) ? d.status : undefined;
        created = await prisma.referralSubmission.update({ where: { id }, data: {
          ...(patient ? { patientId: patient.id } : {}), ...(status ? { status } : {}),
          ...(d.reviewedBy !== undefined ? { reviewedBy: str(d.reviewedBy, 120) || null } : {}),
          ...(status === "reviewed" || d.reviewedAt ? { reviewedAt: dateOrNull(d.reviewedAt, "reviewedAt") || new Date() } : {}),
          ...(d.scheduledAt ? { scheduledAt: dateOrNull(d.scheduledAt, "scheduledAt") } : {}),
        }, select: { id: true, patientId: true } });
        const pid = patient?.id || ref.patientId;
        if (pid) audit(pid, "admin", "update", `referral:${id}`, ip);
        break;
      }
      default:
        throw new HttpError(400, "Unknown type.");
    }
    return NextResponse.json({ ok: true, created }, { status: 201 });
  } catch (e) { return toResponse(e); }
}
