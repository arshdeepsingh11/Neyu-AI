// Background jobs (Phase 3 · part 7). Slow or scheduled work runs here, not inside
// a web request: emails, data exports, account deletions, the hourly daily-jobs run.
//
//   With REDIS_URL  → jobs go into a BullMQ queue in Redis and a worker runs them
//                     (retries with back-off, survives restarts, several workers can share).
//   Without Redis   → the job runs right after the response in this process (laptop mode).
//
// The worker runs inside the web server by default (RUN_WORKER unset). For more servers:
// set RUN_WORKER=0 on web servers and run `npm run worker` on one or more worker machines.

import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

export const QUEUE = "neyu-jobs";

export type JobName =
  | "email.send"           // { to, subject, text, html, headers? }
  | "privacy.export"       // { exportId }
  | "privacy.deletion.run" // { requestId }
  | "privacy.sweep"        // due deletions + expired exports
  | "sessions.cleanup"     // expired staff + patient sessions
  | "daily";               // wearables sync, briefs, reminders (was only /api/cron/daily)

const g = globalThis as unknown as { neyuQueue?: Queue; neyuQueueConn?: IORedis };

export function queueConnection(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!g.neyuQueueConn) {
    g.neyuQueueConn = new IORedis(url, { maxRetriesPerRequest: null, enableOfflineQueue: false, connectTimeout: 3000 });
    g.neyuQueueConn.on("error", () => { /* reported by kv.ts; enqueue falls back to inline */ });
  }
  return g.neyuQueueConn;
}

function queue(): Queue | null {
  const conn = queueConnection();
  if (!conn) return null;
  return (g.neyuQueue ??= new Queue(QUEUE, { connection: conn }));
}

export const DEFAULT_JOB: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 7 * 86400, count: 5000 },
  removeOnFail: { age: 30 * 86400 },
};

/** Adds a job. Returns "queued" (Redis) or "inline" (ran in this process). */
export async function enqueue(name: JobName, data: Record<string, unknown> = {}, opts: JobsOptions = {}): Promise<"queued" | "inline"> {
  const q = queue();
  if (q && queueConnection()!.status === "ready") {
    try { await q.add(name, data, { ...DEFAULT_JOB, ...opts }); return "queued"; }
    catch (e: any) { console.warn(`Queue unavailable (${e?.message}) — running ${name} now.`); }
  }
  const { runJob } = await import("@backend/jobs");
  setImmediate(() => { runJob(name, data).catch((e) => console.error(`Job ${name} failed:`, e?.message)); });
  return "inline";
}

/** Queue health for the status endpoint. */
export async function queueStats() {
  const q = queue();
  if (!q || queueConnection()!.status !== "ready") return { mode: "inline" as const };
  const c = await q.getJobCounts("waiting", "active", "delayed", "failed", "completed");
  return { mode: "redis" as const, ...c };
}
