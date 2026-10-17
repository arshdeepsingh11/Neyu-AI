// Runs once when the server starts. Starts the background worker inside the web
// server unless RUN_WORKER=0 (then run `npm run worker` separately).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.RUN_WORKER === "0") return;
  const { startWorker } = await import("@backend/worker");
  startWorker().catch((e) => console.error("[worker] failed to start:", e?.message));
}
