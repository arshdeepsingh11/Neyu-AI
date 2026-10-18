# NEYU · Phase 3 commits (test branch). Run from the nextjs folder:
#   powershell -ExecutionPolicy Bypass -File .\commit-phase3.ps1
# One commit per small change. Files already committed are skipped automatically.
$ErrorActionPreference = "Stop"
$env:GIT_LITERAL_PATHSPECS = "1"  # paths like [id] are folder names, not patterns
git checkout test
if ($LASTEXITCODE -ne 0) { Write-Host "Could not switch to the test branch." -ForegroundColor Red; exit 1 }
$trailer = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_01QFpQ2wZKYRncdk2a6gd8Xp"
$n = 0
function C([string]$msg, [string[]]$paths) {
  $existing = @($paths | Where-Object { Test-Path -LiteralPath $_ })
  if ($existing.Count -eq 0) { return }
  git add -- $existing
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Write-Host "  skip  $msg" -ForegroundColor DarkGray; return }
  git commit -q -m $msg -m $trailer
  $script:n++
  Write-Host "  + $msg" -ForegroundColor Green
}
Write-Host "NEYU Phase 3 - committing..." -ForegroundColor Cyan
C "feat(db): phase 3 migration — report files in storage, deletion certificate, policy versions, super admin permissions" @("prisma/schema.prisma","prisma/migrations/20261017000000_phase3_privacy_storage_roles/migration.sql")
C "build(deps): add ioredis, bullmq, zod, fflate and tsx" @("package.json","package-lock.json")
C "feat(redis): shared fast store with automatic memory fallback" @("backend/kv.ts")
C "feat(redis): rate limiter uses the shared store" @("backend/rateLimit.ts")
C "refactor(api): await the shared rate limiter in every route" @("src/app/api/admin/login/route.ts","src/app/api/admin/mfa/route.ts","src/app/api/assess/route.ts","src/app/api/log-visit/route.ts","src/app/api/nea/ask/route.ts","src/app/api/nea/match/route.ts","src/app/api/pair/claim/route.ts","src/app/api/pair/status/route.ts","src/app/api/portal/activity/route.ts","src/app/api/portal/alba/route.ts","src/app/api/portal/assessment/route.ts","src/app/api/portal/auth/verify/route.ts","src/app/api/portal/avatar/route.ts","src/app/api/portal/challenges/route.ts","src/app/api/portal/devices/sync/route.ts","src/app/api/portal/family/route.ts","src/app/api/portal/food/route.ts","src/app/api/portal/import/route.ts","src/app/api/portal/lifestyle/route.ts","src/app/api/portal/password/route.ts","src/app/api/portal/plan/route.ts","src/app/api/requests/route.ts","src/app/api/wearables/ingest/route.ts")
C "feat(auth): 2-step replay guard and wrong-code counter in the shared store" @("backend/staffAuth.ts")
C "feat(rbac): permission map for every screen and action, break-glass reasons" @("backend/access.ts","backend/apiHelpers.ts")
C "feat(rbac): enforce roles on admin data and actions, log every refusal" @("src/app/api/admin/data/route.ts","src/app/api/admin/action/route.ts")
C "feat(staff): invite staff, change roles, suspend, reset password or 2-step, change own password" @("backend/staffAdmin.ts")
C "feat(admin-ui): role-based menu, break-glass reason dialog, change-password dialog" @("src/components/admin/AdminConsole.tsx","src/components/admin/context.tsx","src/components/admin/overlays.tsx","src/lib/admin/types.ts")
C "feat(admin-ui): Staff & Roles screen with live permission matrix" @("src/components/admin/screens/Staff.tsx","src/components/admin/screens/Settings.tsx")
C "feat(audit): platform audit log, 14-day stats, access-log mirror awaited" @("backend/auditData.ts","backend/adminAudit.ts","backend/audit.ts")
C "feat(audit-ui): audit screen with stats, chart, break-glass filter and platform log" @("src/components/admin/screens/AuditLog.tsx")
C "feat(storage): encrypted file storage (AES-256-GCM, local disk, S3-ready)" @("backend/storage.ts","backend/ids.ts",".gitignore")
C "feat(storage): reports are saved to file storage, found by fingerprint, deleted with their file" @("src/app/api/portal/documents/route.ts","src/app/api/portal/documents/[id]/route.ts","src/app/api/portal/documents/[id]/file/route.ts","src/app/api/portal/documents/[id]/read/route.ts","src/app/api/portal/assessment/pdf/route.ts","backend/assessmentPdf.ts")
C "feat(storage): npm run storage:move moves old report files out of the database" @("scripts/storage-move.ts")
C "feat(queue): background worker (BullMQ) with retries and hourly schedules" @("backend/queue.ts","backend/jobs.ts","backend/worker.ts","scripts/worker.ts","src/instrumentation.ts","next.config.js")
C "feat(email): preference-aware sending, unsubscribe link and one-click headers" @("backend/email.ts","backend/notify.ts")
C "refactor(cron): daily jobs shared by the worker and /api/cron/daily, plus privacy sweep" @("backend/daily.ts","src/app/api/cron/daily/route.ts")
C "feat(privacy): consents, email preferences, 30-day deletion hold, data export" @("backend/privacy.ts","backend/adminActions.ts","backend/patientAuth.ts","src/app/api/portal/auth/sign-in/route.ts","src/app/api/portal/auth/sign-up/route.ts","src/app/api/portal/settings/route.ts")
C "feat(privacy): patient privacy API and export download" @("src/app/api/portal/privacy/route.ts","src/app/api/portal/privacy/export/[id]/route.ts","src/app/api/portal/export/route.ts")
C "feat(privacy): unsubscribe page and API (no sign-in, one-click)" @("src/app/api/unsubscribe/route.ts","src/app/unsubscribe/page.tsx","src/app/unsubscribe/Unsubscribe.tsx")
C "feat(privacy-ui): patient privacy centre and email preferences" @("src/components/portal/screens/Account.tsx")
C "feat(privacy-ui): admin privacy requests and system status" @("src/components/admin/screens/PrivacyRequests.tsx")
C "feat(api): /api/v1 framework — validation, error envelope, request id, rate limit" @("backend/apiv1.ts")
C "feat(api): v1 endpoints (health, me, patients, access grants, audit, staff, privacy) + OpenAPI 3.1" @("src/app/api/v1")
C "test(postman): staff, audit, break-glass, privacy and API v1 requests" @("postman/NEYU-API.postman_collection.json")
C "docs: new README with live link, architecture and animated visuals" @("README.md","docs/assets/neyu-hero.svg","docs/assets/neyu-stats.svg","docs/assets/neyu-architecture.svg")
C "docs: developer guide and Phase 3 environment settings" @("docs/DEVELOPMENT.md",".env.example","deploy/env.production.example")
C "chore(dev): PostgreSQL on port 5433 in docker compose" @("docker-compose.yml")
C "chore: remaining Phase 3 changes" @("backend","src","prisma","scripts","postman","docs","deploy")
Write-Host ""
Write-Host "$n commits made on test." -ForegroundColor Cyan
git log --oneline -$([Math]::Max($n,1))
Write-Host ""
Write-Host "Push with:  git push origin test" -ForegroundColor Yellow
Remove-Item -LiteralPath $MyInvocation.MyCommand.Path
