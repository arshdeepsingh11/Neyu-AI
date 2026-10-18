// The hourly "daily jobs" run (acts once per patient per day; only for people with
// something to act on, so it stays quick with thousands of accounts):
//   • pulls new data from Withings / Oura / WHOOP
//   • Neyu insights refresh
//   • NEYU Today brief email (patients who turned it on), after 6 AM local
//   • visit nudges 2 days before an appointment, lab retest reminders
// Runs from the background worker every hour, and from GET /api/cron/daily (CRON_SECRET) for servers without Redis.
// Emails respect each patient's email preferences (backend/notify.ts).
import { prisma } from "@backend/db";
import { syncAll } from "@backend/oauth";
import { getBrief } from "@backend/brief";
import { getRetests } from "@backend/labs";
import { simpleEmail, emailConfigured } from "@backend/email";
import { dayKey, daysBetween } from "@/lib/portal/metrics";
import { refreshInsights } from "@backend/insights";
import { patientMail } from "@backend/notify";

// Send an email at most once per (patient, kind, period). If sending fails,
// the marker is removed so the next run tries again.
const once = async (patientId: string, kind: string, period: string, send: () => Promise<boolean>) => {
  try { await prisma.generatedNote.create({ data: { patientId, kind, period, body: "{}", emailedAt: new Date() } }); } catch { return false; }
  try { const sent = await send(); if (!sent) await prisma.generatedNote.deleteMany({ where: { patientId, kind, period } }); return sent; }
  catch (e) { await prisma.generatedNote.deleteMany({ where: { patientId, kind, period } }); throw e; }
};

export async function runDaily(base: string) {
  const out: Record<string, unknown> & { synced: number; briefs: number; nudges: number; retests: number; errors: number } = { synced: 0, briefs: 0, nudges: 0, retests: 0, errors: 0 };
  out.synced = (await syncAll(6)).connections;
  // Neyu intelligence: detect new information + meaningful changes, store de-duplicated insights.
  // Only people who could have something new (signed in within 30 days, a device that synced,
  // or a new lab or report in the last 2 days) and who weren't refreshed in the last 12 hours —
  // with thousands of accounts, refreshing everyone every hour would never finish. Anyone else
  // is refreshed the moment they open My Health Space.
  let insights = 0;
  const due = await prisma.$queryRawUnsafe<{ id: string; firstName: string; timezone: string }[]>(
    `select p.id, p."firstName", p.timezone from "Patient" p
     where p."accountStatus" = 'active'
       and (p."lastLoginAt" > now() - interval '30 days'
            or exists (select 1 from "DeviceConnection" d where d."patientId" = p.id and d.status = 'connected' and d."lastSyncAt" > now() - interval '2 days')
            or exists (select 1 from "LabResult" l where l."patientId" = p.id and l."createdAt" > now() - interval '2 days')
            or exists (select 1 from "HealthDocument" h where h."patientId" = p.id and h."createdAt" > now() - interval '2 days'))
       and not exists (select 1 from "GeneratedNote" g where g."patientId" = p.id and g.kind = 'insights-run' and g."createdAt" > now() - interval '12 hours')
     order by p."lastLoginAt" desc nulls last
     limit 2000`);
  for (let i = 0; i < due.length; i += 4) {
    const made = await Promise.all(due.slice(i, i + 4).map((p) => refreshInsights(p, true).catch((e: any) => { console.error("insights failed:", e?.message); return 0; })));
    insights += made.reduce((a, b) => a + b, 0);
  }
  Object.assign(out, { insights, insightsChecked: due.length });
  if (!emailConfigured() && process.env.NODE_ENV === "production") return { ...out, email: "not configured — emails skipped" };

  // Emails go only to people who could get one: daily brief turned on, a visit in the next
  // 3 days, or lab results (retest reminders, checked once a day per person).
  const soon = new Date(Date.now() + 3 * 86400_000);
  const patients = await prisma.patient.findMany({
    where: {
      accountStatus: "active", emailVerifiedAt: { not: null },
      OR: [
        { settings: { briefEmail: true, notifDaily: true } },
        { appointments: { some: { status: "scheduled", startsAt: { gte: new Date(), lte: soon } } } },
        { labResults: { some: {} }, NOT: { settings: { notifWorth: false } } },
      ],
    },
    select: { id: true, email: true, firstName: true, timezone: true, settings: { select: { briefEmail: true, notifDaily: true, notifAppt: true, notifWorth: true } } },
  });
  for (const p of patients) {
    try {
      const now = new Date(), today = dayKey(now, p.timezone);
      const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: p.timezone, hour: "2-digit", hour12: false }).format(now)) % 24;
      if (hour < 6) continue;
      const s = p.settings;
      if (s?.briefEmail && s.notifDaily && (await once(p.id, "brief-email", today, async () => {
        const b = await getBrief(p);
        const lines = [b.message, ...(b.moveAdvice ? [b.moveAdvice.text] : []), ...b.items.slice(0, 4).map((i) => `${i.title}: ${i.text}`)];
        return patientMail(p, "reminder", (u) => simpleEmail(`${b.headline} Here's your NEYU Today`, lines, { label: "Open My Health Space", url: `${base}/my-health` }, "NEYU Health · Wellness information, not a diagnosis. Emergency? Call 911. Turn off in My Health Space → Profile → Daily brief.", u), base);
      }))) out.briefs++;
      if (s?.notifAppt !== false) {
        const appt = await prisma.appointment.findFirst({ where: { patientId: p.id, status: "scheduled", startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, select: { id: true, clinician: true, startsAt: true } });
        if (appt && daysBetween(today, dayKey(appt.startsAt, p.timezone)) === 2 && (await once(p.id, "visit-nudge", appt.id, () =>
          patientMail(p, "reminder", (u) => simpleEmail(`Your visit with ${appt.clinician} is in 2 days`, ["Add the questions you want to ask, and take your blood pressure morning and evening until your visit — it helps your care team most.", "You can share your trends and results with your clinician in one tap from Appointments → Prepare."], { label: "Prepare for your visit", url: `${base}/my-health?s=appointments` }, undefined, u), base)))) out.nudges++;
      }
      // Retest reminders: worked out once a day per person (the scan marker), sent once per test.
      if (s?.notifWorth !== false && (await prisma.generatedNote.create({ data: { patientId: p.id, kind: "retest-scan", period: today, body: "{}" } }).then(() => true, () => false))) {
        for (const r of await getRetests(p, 14)) {
          if (await once(p.id, "retest", `${r.code}:${r.due}`, () =>
            patientMail(p, "reminder", (u) => simpleEmail(`Your ${r.name} retest is ${r.overdue ? "overdue" : "coming up"}`, [`Your last ${r.name} was on ${r.last}. We suggest re-testing about every ${r.months} months so you can see how your numbers are trending.`, "Book with BioAro and your new result will appear in My Health Space automatically."], { label: "See your results", url: `${base}/my-health?s=results` }, undefined, u), base))) out.retests++;
        }
      }
    } catch (e: any) { out.errors++; console.error("cron patient failed:", e?.message); }
  }
  return out;
}
