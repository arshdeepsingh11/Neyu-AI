# NEYU Health — monitoring and alerts (Phase 5)

What to watch, where the numbers come from, and what to do when an alert fires.

## 1 · Uptime check (5 minutes to set up)

Use any uptime service (UptimeRobot, Better Stack, Uptime Kuma on another machine).

| Check | URL | Alert when |
|---|---|---|
| Website | `https://neyuhealth.com/` | not 200 for 2 checks in a row |
| Platform health | `https://neyuhealth.com/api/v1/health` | not 200, **or** the body doesn't contain `"status":"ok"` |

`/api/v1/health` needs no sign-in and returns:

| Field | Meaning | Healthy |
|---|---|---|
| `status` | `ok` · `busy` (server slow or many failed jobs) · `down` (database unreachable → HTTP 503) | `ok` |
| `dbMs` | database round-trip | under 20 ms |
| `eventLoopMs` | how long requests wait for the server's attention (99th percentile) | under 100 ms |
| `memoryMb` | memory of this app copy | under 800 (PM2 restarts it at 1 GB) |
| `queueWaiting` / `queueFailed` | background jobs waiting / failed in the last 30 days | low / under 100 |
| `statsAgeSec` | age of the dashboard numbers (refreshed every 10 min) | under 900 |

## 2 · Detailed numbers (optional: Grafana, Better Stack, Datadog)

Set `METRICS_TOKEN` in `.env` (`openssl rand -hex 32`), then scrape
`https://neyuhealth.com/api/v1/metrics` with header `Authorization: Bearer <METRICS_TOKEN>`.
Prometheus text format; each app copy reports its own `instance`.

Suggested alerts:

| Metric | Alert |
|---|---|
| `neyu_db_up` | = 0 for 1 minute |
| `neyu_event_loop_p99_ms` | > 500 for 5 minutes |
| `neyu_queue_failed` | rises by more than 20 in an hour |
| `neyu_stats_age_seconds` | > 1800 (worker stopped) |
| `neyu_memory_mb` | > 900 for 10 minutes |

## 3 · Slow pages and slow queries

- **Nginx** writes how long every request took (`rt=` total, `urt=` app) to `/var/log/nginx/neyu.access.log`.
  Slowest requests today: `awk -F'rt=' '{split($2,a," "); print a[1], $0}' /var/log/nginx/neyu.access.log | sort -rn | head -20`
- **PostgreSQL** logs every query slower than 0.5 s (`deploy/postgresql-neyu.conf`) to `/var/log/postgresql/`.
- Top queries by total time:
  `sudo -u postgres psql -d neyu -c "select round(total_exec_time) ms, calls, left(query,120) from pg_stat_statements order by 1 desc limit 15"`

## 4 · When an alert fires

| Alert | First checks | Fix |
|---|---|---|
| Health = `down` (503) | `sudo systemctl status postgresql` · disk space `df -h` | Start PostgreSQL; free disk space. The app reconnects by itself. |
| Website down, health unreachable | `pm2 ls` · `pm2 logs neyu-health --lines 100` | `pm2 restart neyu-health`. If it keeps crashing, roll back: `git checkout <last good commit> && bash deploy/deploy.sh`. |
| `busy` / event loop high | `pm2 monit` (CPU) · top queries (above) | More app copies (`NEYU_INSTANCES=max`, then `pm2 reload neyu-health`) or a bigger server. |
| Failed jobs rising | `pm2 logs neyu-health \| grep "\[worker\]"` | Usually email (Resend) or a wearable API. Jobs retry 5 times; fix the cause and they continue. |
| Dashboard numbers old | `redis-cli ping` · worker lines in `pm2 logs` | `sudo systemctl restart redis-server`; then `pm2 reload neyu-health`. |
| Memory high | `pm2 monit` | PM2 restarts the copy at 1 GB on its own. Repeated restarts → send the logs to the developer. |

## 5 · Weekly (5 minutes)

- `pm2 ls` — no copy restarting again and again.
- `df -h` — disk under 70 % (`/var/lib/neyu/storage` and PostgreSQL grow with patient reports).
- Backups exist and the restore test from `deploy/backup.sh` passed this month.
