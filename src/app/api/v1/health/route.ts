// GET /api/v1/health — is the platform up? (no sign-in; for uptime monitors and load balancers)
import { prisma } from "@backend/db";
import { v1, API_VERSION } from "@backend/apiv1";
import { kv } from "@backend/kv";
import { storage } from "@backend/storage";
import { queueStats } from "@backend/queue";

export const dynamic = "force-dynamic";

export const GET = v1({ public: true }, async () => {
  const t = Date.now();
  let db = "ok";
  try { await prisma.$queryRaw`select 1`; } catch { db = "down"; }
  const q = await queueStats().catch(() => ({ mode: "inline" as const }));
  return { status: db === "ok" ? "ok" : "degraded", version: API_VERSION, time: new Date().toISOString(), db, dbMs: Date.now() - t, store: kv.backend(), queue: q.mode, storage: storage.driver() };
});
