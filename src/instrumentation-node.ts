// Node.js part of instrumentation.ts (never loaded in the Edge runtime).
export async function startNodeWorker() {
  if (process.env.RUN_WORKER === "0") return;
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== "0") return;
  const { startWorker } = await import("@backend/worker");
  startWorker().catch((e) => console.error("[worker] failed to start:", e?.message));
}
