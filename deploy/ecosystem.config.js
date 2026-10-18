// PM2 process file — keeps NEYU Health running and restarts it on crash/reboot.
// Start: pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
//
// Cluster mode runs copies of the app that share port 3000 (one per CPU core with
// NEYU_INSTANCES=max in .env; a 2-core server then handles about twice the traffic).
// Several copies need REDIS_URL, so they share sign-in limits and the dashboard cache —
// without REDIS_URL only 1 copy is started. Only copy 0 runs the background worker
// (src/instrumentation.ts). `pm2 reload neyu-health` restarts copies one by one (no downtime).
const fs = require("fs");
const path = require("path");

function fromEnvFile(key) {
  try {
    const line = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).find((l) => l.startsWith(key + "="));
    return line ? line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim() : undefined;
  } catch { return undefined; }
}
const redis = process.env.REDIS_URL || fromEnvFile("REDIS_URL");
const wanted = process.env.NEYU_INSTANCES || fromEnvFile("NEYU_INSTANCES") || "1";

module.exports = {
  apps: [{
    name: "neyu-health",
    cwd: "/var/www/neyu/.next/standalone",
    script: "server.js",
    exec_mode: "cluster",
    instances: redis ? (wanted === "max" ? "max" : Number(wanted) || 1) : 1,
    env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "127.0.0.1" },
    max_memory_restart: "1G",
    kill_timeout: 10000,          // finish requests in progress before a restart
    listen_timeout: 15000,
    time: true,
  }],
};
