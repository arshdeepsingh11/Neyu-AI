-- Removes everything loadtest/seed-volume.sql made (rows marked load_ / v_LOAD / s_load_).
--   psql "$DATABASE_URL" -f loadtest/remove-volume.sql
\timing on
DELETE FROM "AlbaMessage" WHERE id LIKE 'load\_%';
DELETE FROM "AlbaConversation" WHERE id LIKE 'load\_%';
DELETE FROM "SymptomCheckLog" WHERE id LIKE 'load\_%';
DELETE FROM "LabResultCheck" WHERE id LIKE 'load\_%';
DELETE FROM "LongevityAssessment" WHERE id LIKE 'load\_%';
DELETE FROM "ReferralSubmission" WHERE id LIKE 'load\_%';
DELETE FROM "AdminAuditEvent" WHERE id LIKE 'load\_%';
DELETE FROM "AuditEvent" WHERE id LIKE 'load\_%';
DELETE FROM "OutboundClick" WHERE id LIKE 'load\_%';
DELETE FROM "SiteEvent" WHERE id LIKE 'load\_%' OR "sessionId" LIKE 's\_load\_%';
DELETE FROM "PageVisit" WHERE id LIKE 'load\_%' OR "sessionId" LIKE 's\_load\_%';
DELETE FROM "Visitor" WHERE id LIKE 'v\_LOAD%';
DELETE FROM "Patient" WHERE id LIKE 'load\_pt\_%';
VACUUM ANALYZE;
