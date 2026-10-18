// GET /api/v1/health — is the platform up? (no sign-in; for uptime monitors and load balancers)
// 200 = serving; 503 = the database is down (a load balancer takes this copy out).
import { NextResponse } from "next/server";
import { v1, API_VERSION } from "@backend/apiv1";
import { storage } from "@backend/storage";
import { snapshot } from "@backend/monitor";

export const dynamic = "force-dynamic";

export const GET = v1({ public: true }, async () => {
  const s = await snapshot();
  const body = {
    status: s.db === "ok" ? (s.eventLoopP99Ms > 500 || s.queueFailed > 100 ? "busy" : "ok") : "down",
    version: API_VERSION, time: new Date().toISOString(),
    db: s.db, dbMs: s.dbMs, store: s.store, queue: s.queue, storage: storage.driver(),
    eventLoopMs: s.eventLoopP99Ms, memoryMb: s.memoryMb, queueWaiting: s.queueWaiting, queueFailed: s.queueFailed, statsAgeSec: s.statsAgeSec,
  };
  if (s.db !== "ok") return NextResponse.json({ data: body }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return body;
});
