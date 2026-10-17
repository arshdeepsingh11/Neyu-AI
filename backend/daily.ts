// The hourly "daily jobs" run (acts once per patient per day):
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
  let insights = 0;
  for (const p of await prisma.patient.findMany({ where: { accountStatus: "active" }, select: { id: true, firstName: true, timezone: true } })) {
    try { insights += await refreshInsights(p, true); } catch (e: any) { console.error("insights failed:", e?.message); }
  }
  Object.assign(out, { insights });
  if (!emailConfigured() && process.env.NODE_ENV === "production") return { ...out, email: "not configured — emails skipped" };

  const patients = await prisma.patient.findMany({ where: { accountStatus: "active", emailVerifiedAt: { not: null } }, select: { id: true, email: true, firstName: true, timezone: true, settings: { select: { briefEmail: true, notifDaily: true, notifAppt: true, notifWorth: true } } } });
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
      if (s?.notifWorth !== false) {
        for (const r of await getRetests(p, 14)) {
          if (await once(p.id, "retest", `${r.code}:${r.due}`, () =>
            patientMail(p, "reminder", (u) => simpleEmail(`Your ${r.name} retest is ${r.overdue ? "overdue" : "coming up"}`, [`Your last ${r.name} was on ${r.last}. We suggest re-testing about every ${r.months} months so you can see how your numbers are trending.`, "Book with BioAro and your new result will appear in My Health Space automatically."], { label: "See your results", url: `${base}/my-health?s=results` }, undefined, u), base))) out.retests++;
        }
      }
    } catch (e: any) { out.errors++; console.error("cron patient failed:", e?.message); }
  }
  return out;
}
