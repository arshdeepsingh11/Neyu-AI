// Shared fast store: Redis when REDIS_URL is set (several app servers share
// rate limits, sign-in guards and cache), otherwise memory in this one process
// (fine for a laptop). If Redis goes down, the app keeps working on memory and
// logs a warning — it never takes the website down.
//
//   REDIS_URL=redis://127.0.0.1:6379      (docker compose already runs Redis)

import Redis from "ioredis";

type Entry = { v: string; exp: number };
const mem = new Map<string, Entry>();
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, e] of mem) if (e.exp && e.exp < now) mem.delete(k);
}
const memGet = (k: string) => { sweep(); const e = mem.get(k); if (!e) return null; if (e.exp && e.exp < Date.now()) { mem.delete(k); return null; } return e.v; };

const PREFIX = "neyu:";
const g = globalThis as unknown as { neyuRedis?: Redis | null; neyuRedisDown?: number };

export function redis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (g.neyuRedisDown && Date.now() - g.neyuRedisDown < 30_000) return null; // back off for 30 s after a failure
  if (g.neyuRedis === undefined || g.neyuRedis === null) {
    const r = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2000, lazyConnect: false });
    r.on("error", (e) => { if (!g.neyuRedisDown || Date.now() - g.neyuRedisDown > 30_000) console.warn("Redis unavailable — using memory:", e.message); g.neyuRedisDown = Date.now(); });
    r.on("ready", () => { g.neyuRedisDown = 0; });
    g.neyuRedis = r;
  }
  return g.neyuRedis.status === "ready" ? g.neyuRedis : null;
}

// Connect at start-up so the very first requests already use Redis.
if (process.env.REDIS_URL && process.env.NEXT_PHASE !== "phase-production-build") redis();

async function safe<T>(fn: (r: Redis) => Promise<T>, fallback: () => T): Promise<T> {
  const r = redis();
  if (!r) return fallback();
  try { return await fn(r); } catch (e: any) { g.neyuRedisDown = Date.now(); console.warn("Redis call failed — using memory:", e?.message); return fallback(); }
}

export const kv = {
  /** Which store is in use right now: "redis" or "memory". */
  backend: () => (redis() ? "redis" : "memory") as "redis" | "memory",

  get: (key: string) => safe((r) => r.get(PREFIX + key), () => memGet(key)),

  set: (key: string, value: string, ttlSec?: number) =>
    safe(async (r) => { ttlSec ? await r.set(PREFIX + key, value, "EX", ttlSec) : await r.set(PREFIX + key, value); }, () => { mem.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 }); }),

  del: (key: string) => safe(async (r) => { await r.del(PREFIX + key); }, () => { mem.delete(key); }),

  /** Adds 1 and returns the new count; the key expires ttlSec after its first increment. */
  incr: (key: string, ttlSec: number) =>
    safe(async (r) => {
      const [[, n]] = (await r.multi().incr(PREFIX + key).expire(PREFIX + key, ttlSec, "NX").exec()) as [unknown, number][];
      return Number(n);
    }, () => {
      const cur = memGet(key);
      const n = (cur ? Number(cur) : 0) + 1;
      const exp = cur ? mem.get(key)!.exp : Date.now() + ttlSec * 1000;
      mem.set(key, { v: String(n), exp });
      return n;
    }),
};

/** Cache a slow read (e.g. analytics) for ttlSec. Values must be JSON. */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  const hit = await kv.get("cache:" + key);
  if (hit) { try { return JSON.parse(hit) as T; } catch { /* reload */ } }
  const v = await load();
  await kv.set("cache:" + key, JSON.stringify(v), ttlSec);
  return v;
}
