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

```bash
npm run staff -- list
npm run staff -- add <email> "<Full name>" <role>      # super_admin | org_admin | clinic_manager | care_staff | physician | support
npm run staff -- reset-password <email>
npm run staff -- reset-2step <email>
npm run staff -- unlock <email>
npm run staff -- suspend <email> | activate <email>
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
  --env-var staffPassword=<your staff password> \
  --env-var totpSecret=<key under "Can't scan? Type this key"> \
  --working-dir .
```

API reference: `GET /api/v1/openapi.json` (OpenAPI 3.1) · health: `GET /api/v1/health`.
