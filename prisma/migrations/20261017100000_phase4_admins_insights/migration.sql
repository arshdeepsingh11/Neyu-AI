-- Phase 4 · super admin + admin profiles with per-person features, website insights.

-- 1 · 2-step code can be required or not, per person (chosen by a super admin).
ALTER TABLE "StaffUser" ADD COLUMN "mfaRequired" BOOLEAN NOT NULL DEFAULT true;

-- 2 · Anonymous search / click signals for Insights.
CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "target" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteEvent_type_createdAt_idx" ON "SiteEvent"("type", "createdAt");
CREATE INDEX "SiteEvent_createdAt_idx" ON "SiteEvent" USING BRIN ("createdAt" timestamp_minmax_ops);

-- 3 · Feature permissions for admin profiles.
INSERT INTO "Permission" ("key","area","description") VALUES
  ('overview.read','console','See the overview dashboard'),
  ('inbox.manage','console','Work the inbox (urgent symptom checks, reschedules, requests)'),
  ('insights.read','analytics','Website insights: what people view, search and ask (anonymous)')
ON CONFLICT ("key") DO UPDATE SET "area" = EXCLUDED."area", "description" = EXCLUDED."description";

-- 4 · Super admin: gets every permission it doesn't have yet. Earlier choices stay:
--     opening or changing a patient's record and privacy requests still need a
--     written reason every time (break-glass). Every action is in the audit log.
INSERT INTO "RolePermission" ("roleId","permissionKey","scope")
SELECT 'role_super_admin', p."key", 'full' FROM "Permission" p
ON CONFLICT ("roleId","permissionKey") DO NOTHING;
