// Runtime numbers for monitoring (Phase 5): event-loop delay (is the server too busy?),
// memory, database and Redis round-trips, background queue backlog, dashboard freshness.
import { monitorEventLoopDelay } from "perf_hooks";
import { prisma } from "@backend/db";
import { kv, redis } from "@backend/kv";
import { queueStats } from "@backend/queue";

const g = globalThis as unknown as { neyuLoop?: ReturnType<typeof monitorEventLoopDelay>; neyuStarted?: number };
if (!g.neyuLoop) { g.neyuLoop = monitorEventLoopDelay({ resolution: 20 }); g.neyuLoop.enable(); g.neyuStarted = Date.now(); }

export async function snapshot() {
  const t0 = Date.now();
  let db = "ok", dbMs = 0;
  try { await prisma.$queryRawUnsafe("select 1"); dbMs = Date.now() - t0; } catch { db = "down"; }
  let redisMs: number | null = null;
  const r = redis();
  if (r) { const t1 = Date.now(); try { await r.ping(); redisMs = Date.now() - t1; } catch { redisMs = null; } }
  const q = (await queueStats().catch(() => ({ mode: "inline" as const }))) as { mode: string; waiting?: number; failed?: number; delayed?: number };
  const warmed = await kv.get("stats.warmedAt");
  const loop = g.neyuLoop!;
  const m = process.memoryUsage();
  const out = {
    db, dbMs, store: kv.backend(), redisMs,
    queue: q.mode, queueWaiting: Number(q.waiting || 0), queueFailed: Number(q.failed || 0), queueDelayed: Number(q.delayed || 0),
    eventLoopP99Ms: Math.round(loop.percentile(99) / 1e6), eventLoopMaxMs: Math.round(loop.max / 1e6),
    memoryMb: Math.round(m.rss / 1048576), heapMb: Math.round(m.heapUsed / 1048576),
    uptimeSec: Math.round((Date.now() - (g.neyuStarted || Date.now())) / 1000),
    statsAgeSec: warmed ? Math.round((Date.now() - Date.parse(warmed)) / 1000) : null,
    instance: process.env.NODE_APP_INSTANCE ?? "0",
  };
  loop.reset();
  return out;
}

/** Same numbers in Prometheus text format (for Grafana, Better Stack, Datadog…). */
export function prometheus(s: Awaited<ReturnType<typeof snapshot>>) {
  const line = (name: string, help: string, v: number | null) => (v == null ? "" : `# HELP neyu_${name} ${help}\n# TYPE neyu_${name} gauge\nneyu_${name}{instance="${s.instance}"} ${v}\n`);
  return [
    line("db_up", "1 if the database answers", s.db === "ok" ? 1 : 0),
    line("db_latency_ms", "Database round-trip", s.dbMs),
    line("redis_latency_ms", "Redis round-trip", s.redisMs),
    line("queue_waiting", "Background jobs waiting", s.queueWaiting),
    line("queue_failed", "Background jobs that failed (kept 30 days)", s.queueFailed),
    line("event_loop_p99_ms", "Event-loop delay, 99th percentile since the last scrape", s.eventLoopP99Ms),
    line("memory_mb", "Resident memory", s.memoryMb),
    line("uptime_seconds", "Seconds since start", s.uptimeSec),
    line("stats_age_seconds", "Age of the dashboard numbers", s.statsAgeSec),
  ].join("");
}
