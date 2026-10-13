// PM2 process file — keeps NEYU Health running and restarts it on crash/reboot.
// Start: pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: "neyu-health",
    cwd: "/var/www/neyu/.next/standalone",
    script: "server.js",
    env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "127.0.0.1" },
    max_memory_restart: "1G",
    time: true,
  }],
};
