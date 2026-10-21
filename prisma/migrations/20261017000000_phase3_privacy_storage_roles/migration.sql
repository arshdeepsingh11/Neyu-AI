-- Phase 3 · privacy, file storage, roles (safe to run once; data kept).

-- 1 · File storage: new uploads live on disk / S3, not inside the database.
ALTER TABLE "HealthDocument" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "HealthDocument" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "HealthDocument" ADD COLUMN "sha256" TEXT;
CREATE INDEX "HealthDocument_patientId_sha256_idx" ON "HealthDocument"("patientId", "sha256");

-- 2 · Deletion requests survive the deleted account (deletion certificate).
ALTER TABLE "DeletionRequest" DROP CONSTRAINT "DeletionRequest_patientId_fkey";
ALTER TABLE "DeletionRequest" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3 · Policy versions patients consent to (Phase 4 publishes the full legal pages at these URLs).
INSERT INTO "PolicyVersion" ("id","kind","version","url","summary","publishedAt") VALUES
  ('pol_terms_20261017','terms','2026-10-17','/terms','Terms of use for NEYU Health and My Health Space',CURRENT_TIMESTAMP),
  ('pol_privacy_20261017','privacy','2026-10-17','/privacy','How NEYU collects, stores and protects health information (Alberta HIA, PIPEDA)',CURRENT_TIMESTAMP),
  ('pol_ai_20261017','ai','2026-10-17','/privacy#ai','Neyu AI reads your data only when you ask and never diagnoses',CURRENT_TIMESTAMP),
  ('pol_marketing_20261017','marketing','2026-10-17','/privacy#email','News and offers by email — optional, off by default',CURRENT_TIMESTAMP)
ON CONFLICT ("kind","version") DO NOTHING;

-- Patients who agreed at sign-up before consents were recorded one by one.
INSERT INTO "Consent" ("id","patientId","kind","policyVersionId","granted","method","createdAt")
SELECT 'cns_t_' || p."id", p."id", 'terms', 'pol_terms_20261017', true, 'signup', COALESCE(p."termsAcceptedAt", p."createdAt")
FROM "Patient" p WHERE NOT EXISTS (SELECT 1 FROM "Consent" c WHERE c."patientId" = p."id" AND c."kind" = 'terms');
INSERT INTO "Consent" ("id","patientId","kind","policyVersionId","granted","method","createdAt")
SELECT 'cns_p_' || p."id", p."id", 'privacy', 'pol_privacy_20261017', true, 'signup', COALESCE(p."termsAcceptedAt", p."createdAt")
FROM "Patient" p WHERE NOT EXISTS (SELECT 1 FROM "Consent" c WHERE c."patientId" = p."id" AND c."kind" = 'privacy');

-- Every patient gets email preferences (reminders on, news off).
INSERT INTO "EmailPreference" ("patientId","reminders","news","unsubscribeToken","updatedAt")
SELECT p."id", true, false, md5(random()::text || p."id" || clock_timestamp()::text), CURRENT_TIMESTAMP
FROM "Patient" p WHERE NOT EXISTS (SELECT 1 FROM "EmailPreference" e WHERE e."patientId" = p."id");

-- 4 · The super admin also runs day-to-day work (patients, referrals, reports).
--     Opening or changing a patient's record still needs a written reason (break-glass).
INSERT INTO "RolePermission" ("roleId","permissionKey","scope") VALUES
  ('role_super_admin','patients.list','full'),
  ('role_super_admin','patients.record.update','reason'),
  ('role_super_admin','reports.create','full'),
  ('role_super_admin','reports.send','full'),
  ('role_super_admin','reports.approve','full'),
  ('role_super_admin','referrals.manage','full'),
  ('role_super_admin','appointments.manage','full'),
  ('role_super_admin','requests.manage','full')
ON CONFLICT ("roleId","permissionKey") DO UPDATE SET "scope" = EXCLUDED."scope";
