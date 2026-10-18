// What each background job does (backend/queue.ts adds them, backend/worker.ts runs them).
import type { JobName } from "@backend/queue";
import { prisma } from "@backend/db";
import { sendMail } from "@backend/email";

export async function runJob(name: JobName | string, data: any): Promise<unknown> {
  switch (name) {
    case "email.send": {
      await sendMail({ to: String(data.to), subject: String(data.subject), text: String(data.text), html: String(data.html), headers: data.headers });
      return { sent: true };
    }
    case "privacy.export": {
      const { buildExport } = await import("@backend/privacy");
      return buildExport(String(data.exportId));
    }
    case "privacy.deletion.run": {
      const { runDeletion } = await import("@backend/privacy");
      return runDeletion(String(data.requestId), data.force === true);
    }
    case "privacy.sweep": {
      const { privacySweep } = await import("@backend/privacy");
      return privacySweep();
    }
    case "sessions.cleanup": {
      const now = new Date();
      const [staff, patients, events] = await Promise.all([
        prisma.staffSession.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.patientSession.deleteMany({ where: { expiresAt: { lt: now } } }),
        // Insights keeps anonymous search/click signals for 13 months.
        prisma.siteEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 396 * 86400_000) } } }),
      ]);
      // Anonymous page views are kept 13 months too (Insights shows up to a year). Deleted in
      // batches so the table is never locked for long.
      const { trimOld } = await import("@backend/retention");
      const pageVisits = await trimOld("PageVisit", "createdAt", 396);
      return { staffSessions: staff.count, patientSessions: patients.count, siteEvents: events.count, pageVisits };
    }
    case "daily": {
      const { runDaily } = await import("@backend/daily");
      const { publicBase } = await import("@backend/notify");
      return runDaily(publicBase());
    }
    case "stats.warm": {
      const { warmStats, SHORT_RANGES } = await import("@backend/statsWarm");
      const ranges: string[] = Array.isArray(data?.ranges) ? data.ranges.map(String) : [...SHORT_RANGES];
      // Daily page totals first (the 10-minute run), so the numbers below include them.
      const { rollupRecent } = await import("@backend/dailyStats");
      const rollup = ranges.includes("7D") ? await rollupRecent() : null;
      return { rollup, ...(await warmStats(ranges)) };
    }
    case "visitors.backfill": {
      const { backfillVisitors } = await import("@backend/visitors");
      const { kv } = await import("@backend/kv");
      // The first run after an update looks at all history once; later runs only at the last 2 days.
      const full = !(await kv.get("visitors.backfill.full"));
      const made = await backfillVisitors({ sinceDays: full ? null : 2, limit: full ? 20000 : 2000 });
      if (full && made < 20000) await kv.set("visitors.backfill.full", new Date().toISOString());
      return { made, full };
    }
    default:
      throw new Error("Unknown job: " + name);
  }
}
