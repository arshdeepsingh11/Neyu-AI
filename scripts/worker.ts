// Background worker on its own machine/process:  npm run worker
// Needs the same .env as the website (DATABASE_URL, REDIS_URL, SMTP_*, TOKEN_ENC_KEY, STORAGE_DIR…).
import fs from "node:fs";
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main() {
  if (!process.env.REDIS_URL) { console.error("\n✗ REDIS_URL is not set. The worker needs Redis (docker compose up -d starts it).\n"); process.exit(1); }
  const { startWorker } = await import("../backend/worker");
  const mode = await startWorker({ concurrency: Number(process.env.WORKER_CONCURRENCY || 4), standalone: true });
  if (mode !== "redis") { console.error("\n✗ Can't reach Redis at REDIS_URL.\n"); process.exit(1); }
  console.log("✓ NEYU worker running. Ctrl+C to stop.");
}
main();
