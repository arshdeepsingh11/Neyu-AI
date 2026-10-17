// Fixed-window rate limiter. Uses Redis when REDIS_URL is set, so every app
// server shares the same counters (needed once there is more than one server);
// otherwise memory in this process. See backend/kv.ts.

import { kv } from "@backend/kv";

/** Resolves true if the request is allowed. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const n = await kv.incr("rl:" + key, Math.max(1, Math.ceil(windowMs / 1000)));
  return n <= limit;
}
