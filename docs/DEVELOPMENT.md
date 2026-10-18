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
