// The background worker. Started inside the web server (src/instrumentation.ts) unless
// RUN_WORKER=0, or on its own with `npm run worker` (scripts/worker.ts).
//
// Schedules (Redis mode): daily jobs every hour at :05, privacy sweep every hour at :20,
// session clean-up every night at 03:30 UTC, dashboard numbers every 10 minutes (7D/30D)
// and hourly at :15 (90D/1Y), visitor back-fill hourly at :40. Without Redis the same work runs on timers
// in this process (and /api/cron/daily still works for servers that prefer cron).

import { Worker } from "bullmq";
import { QUEUE, queueConnection, enqueue } from "@backend/queue";
import { runJob } from "@backend/jobs";

const g = globalThis as unknown as { neyuWorker?: Worker | "timers" };

export async function startWorker(opts: { concurrency?: number; standalone?: boolean } = {}) {
  if (g.neyuWorker) return g.neyuWorker === "timers" ? "timers" : "redis";
  const conn = queueConnection();
  if (conn) {
    // Wait briefly for Redis; fall back to timers if it's not there.
    if (conn.status !== "ready") await new Promise((r) => { const t = setTimeout(r, 3000); conn.once("ready", () => { clearTimeout(t); r(null); }); });
  }
  if (conn && conn.status === "ready") {
    const w = new Worker(QUEUE, async (job) => runJob(job.name, job.data), { connection: conn.duplicate({ maxRetriesPerRequest: null }), concurrency: opts.concurrency || 4 });
    w.on("failed", (job, e) => console.error(`[worker] ${job?.name} failed (attempt ${job?.attemptsMade}):`, e?.message));
    w.on("completed", (job) => { if (opts.standalone) console.log(`[worker] ${job.name} done`); });
    const { Queue } = await import("bullmq");
    const q = new Queue(QUEUE, { connection: conn });
    // Schedules live in Redis. Re-registering is idempotent, so do it now, every 10 minutes and
    // after every reconnect — a Redis restart without saved data can't silently stop them.
    const schedule = () => Promise.all([
      q.upsertJobScheduler("daily-hourly", { pattern: "5 * * * *" }, { name: "daily" }),
      q.upsertJobScheduler("privacy-hourly", { pattern: "20 * * * *" }, { name: "privacy.sweep" }),
      q.upsertJobScheduler("sessions-nightly", { pattern: "30 3 * * *" }, { name: "sessions.cleanup" }),
      q.upsertJobScheduler("stats-10min", { pattern: "*/10 * * * *" }, { name: "stats.warm", data: { ranges: ["7D", "30D"] } }),
      q.upsertJobScheduler("stats-hourly", { pattern: "15 * * * *" }, { name: "stats.warm", data: { ranges: ["90D", "1Y"] } }),
      q.upsertJobScheduler("visitors-hourly", { pattern: "40 * * * *" }, { name: "visitors.backfill" }),
    ]).catch((e) => console.warn("[worker] could not register schedules:", e?.message));
    await schedule();
    setInterval(schedule, 10 * 60_000).unref?.();
    // Fill the dashboard cache and missing visitor rows shortly after start-up.
    setTimeout(() => { enqueue("visitors.backfill").catch(() => {}); enqueue("stats.warm", { ranges: ["7D", "30D", "90D", "1Y"] }).catch(() => {}); }, 20_000).unref?.();
    conn.on("ready", () => { schedule(); });
    g.neyuWorker = w;
    console.log(`[worker] running on Redis queue "${QUEUE}" (concurrency ${opts.concurrency || 4})`);
    return "redis";
  }
  // Laptop mode: timers in this process.
  g.neyuWorker = "timers";
  const every = (ms: number, name: Parameters<typeof enqueue>[0]) => setInterval(() => { enqueue(name).catch(() => {}); }, ms).unref?.();
  every(60 * 60_000, "privacy.sweep");
  every(6 * 60 * 60_000, "sessions.cleanup");
  every(60 * 60_000, "visitors.backfill");
  setInterval(() => { enqueue("stats.warm", { ranges: ["7D", "30D"] }).catch(() => {}); }, 10 * 60_000).unref?.();
  setInterval(() => { enqueue("stats.warm", { ranges: ["90D", "1Y"] }).catch(() => {}); }, 60 * 60_000).unref?.();
  setTimeout(() => { enqueue("visitors.backfill").catch(() => {}); enqueue("stats.warm", { ranges: ["7D", "30D", "90D", "1Y"] }).catch(() => {}); }, 20_000).unref?.();
  console.log("[worker] no Redis — background jobs run in this process");
  return "timers";
}
