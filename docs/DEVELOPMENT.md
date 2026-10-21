# NEYU Health — developer guide

Everything needed to run NEYU on a laptop and test it. Production rollout is in [`deploy/README.md`](../deploy/README.md).

## 1 · Local services

Needs Docker Desktop.

```bash
docker compose up -d          # PostgreSQL 16 (port 5433), Redis (6379), Mailpit (8025)
```

## 2 · Environment

Copy `.env.example` to `.env` and fill it. The main values:

| Variable | Local value |
|---|---|
| `DATABASE_URL` | `postgresql://neyu:neyu_local@127.0.0.1:5433/neyu?schema=public` |
| `REDIS_URL` | `redis://127.0.0.1:6379` (optional — without it everything runs in memory) |
| `STORAGE_DIR` | `./storage` (default; ignored by git) |
| `TOKEN_ENC_KEY`, `ADMIN_SESSION_SECRET`, `CRON_SECRET` | 64-character random hex each (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `PUBLIC_BASE_URL` | `http://localhost:3000` |

## 3 · Database

```bash
npm install
npx prisma migrate dev        # applies every migration
npm run db:seed               # NEYU organization + first super admin (password printed once)
npm run db:demo               # optional test patients (Maya, Daniel, Priya)
```

## 4 · Run

```bash
npm run dev                   # http://localhost:3000 — admin console at /admin
```

The background worker starts inside the app automatically. To run it on its own: `RUN_WORKER=0` for the app and `npm run worker` in a second terminal.

## 5 · Staff accounts

Two kinds of people sign in at `/admin`:

- **Super admin** — everything, including adding people. Opening a patient's record still asks for a reason.
- **Admin** — only the features a super admin ticks for them (Overview, Inbox, Patients, Patient records, Edit records, Referrals, Service requests, Insights, Reports, AI activity).

The main super admin lives in `.env` (`SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`, optional `SUPER_ADMIN_NAME`, `SUPER_ADMIN_2STEP=on`). It is created on first sign-in, can't be locked out or edited in the console, and switches off the old shared `ADMIN_PASSWORD` sign-in. Everyone else is added in **Settings → Staff → Add person** (username + password; 2-step optional).

```bash
npm run staff -- list
npm run staff -- add <username> "<Full name>"            # emergency: adds a super admin, prints a password once
npm run staff -- set-password <username> "<password>"
npm run staff -- reset-password <username>
npm run staff -- reset-2step <username>
npm run staff -- unlock <username>
npm run staff -- suspend <username> | activate <username>
```

## 6 · Files

Report files are stored encrypted under `STORAGE_DIR`. Older reports still inside the database move with:

```bash
npm run storage:move -- --dry-run
npm run storage:move
```

## 7 · Tests

```bash
npx newman run postman/NEYU-API.postman_collection.json \
  --env-var patientPassword=<demo patient password> \
  --env-var staffEmail=<SUPER_ADMIN_USERNAME> \
  --env-var staffPassword=<SUPER_ADMIN_PASSWORD> \
  --working-dir .
```

Accounts with 2-step on also need `--env-var totpSecret=<key under "Can't scan? Type this key">`.

API reference: `GET /api/v1/openapi.json` (OpenAPI 3.1) · health: `GET /api/v1/health`.

## 8 · Performance (Phase 5)

- Dashboards read daily totals (`DailyStat`) and a cache the worker refreshes every 10 minutes (7D/30D) and hourly (90D/1Y). A custom date range is worked out on request.
- Health: `GET /api/v1/health` (503 when the database is down). Metrics: `GET /api/v1/metrics` with `METRICS_TOKEN`.
- Load test with a year of test data: `loadtest/README.md`.

## 9 · Phone app (Phase 6)

- App project and publishing steps: `mobile/README.md`. Cloud builds: `.github/workflows/mobile-android.yml`, `mobile-ios.yml`.
- To try the app against your PC: `cd mobile && npm run target -- pc <your IPv4> && npm run sync`, then build (Android Studio or the cloud).
- Website side: `src/lib/native/` (bridge, push, lock, health, files) and `src/components/NativeShell.tsx`. On the website every helper does nothing.
- Testing app features in a normal browser: set `window.NeyuNativeMock = { platform: "ios" | "android", plugins: { … } }` before the page loads (Playwright `addInitScript`).
- Push needs `FIREBASE_SERVICE_ACCOUNT` (Android) and/or `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` (iPhone). Without them nothing is sent.
  For tests, `FCM_TOKEN_URL`, `FCM_ENDPOINT_BASE` and `APNS_HOST` point the server at mock push services.
- Apple Health / Health Connect data → daily values: `src/lib/native/healthMap.ts` (pure functions, unit-tested).

## 10 · Legal pages (Phase 8)

- Company facts for the legal pages live in `src/lib/legal.ts`; how to change a policy: `docs/LEGAL.md`.
- Test the dev server too: `npm run dev` and open `/privacy` — Phase 8 found that `npm run dev` had been broken since Phase 5.
- Accessibility: run axe on changed pages (0 serious/critical issues is the bar). Small coloured text uses `N.tealText`, not the brand teal.
