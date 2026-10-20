# NEYU Health — server (neyuhealth.com)

**Stack:** Next.js 15 on Node 22, Prisma + PostgreSQL 16, Redis (cache + job queue), PM2 cluster, Nginx, Let's Encrypt.
Repo `arshdeepsingh11/Neyu-AI`, branch **`japanese-style`**.

| Task | How |
|---|---|
| **First go-live (SQLite → PostgreSQL)** | **[GO-LIVE.md](GO-LIVE.md)**: the full runbook, step by step |
| Update the site later | `cd /var/www/neyu && bash deploy/deploy.sh` (no downtime) |
| Is everything OK? | `bash deploy/check.sh` (reads only) |
| Email check | `npm run email:test -- someone@example.com` |
| Backups | `deploy/backup.sh` (daily cron, database + report files) |
| Monitoring and alerts | [MONITORING.md](MONITORING.md) |

## Files

| File | What |
|---|---|
| `GO-LIVE.md` | go-live runbook (also sent as PDF) |
| `make-env.sh` | writes the production `.env`, creates the PostgreSQL user/database, carries over old keys |
| `check.sh` | server and site check: software, `.env`, database, Redis, encryption key, internet access, backups, HTTPS |
| `deploy.sh` | pull → install → migrate → build → zero-downtime reload |
| `ecosystem.config.js` | PM2: one app copy per CPU core (`NEYU_INSTANCES=max`, needs Redis); only copy 0 runs the background worker |
| `nginx-neyuhealth.conf` | HTTPS, www → neyuhealth.com, caching, gzip, sign-in rate guard, health check |
| `postgresql-neyu.conf` | PostgreSQL 16 settings for 2 vCPU / 4 GB RAM |
| `backup.sh` | daily `pg_dump` + report files, keeps 30 days |
| `env.production.example` | every setting explained |

## Rules

- `.env` lives only on the server (`chmod 600`) and in the company password manager. Never in Git, chat or email.
- `TOKEN_ENC_KEY` never changes: it opens saved wearable sign-ins and every report file.
- After editing `.env`: `cp .env .next/standalone/.env && pm2 reload neyu-health`.
- Ports 3000, 5432 and 6379 stay on localhost. Only 22, 80, 443 are open.
- Never run `npm run db:demo` or `loadtest/` against the live database (load tests: a staging copy only, see `loadtest/README.md`).
- More than one app server later: set `RUN_WORKER=0` on the extra ones and run `npm run worker` on one machine.
