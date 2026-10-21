-- NEYU · one year of traffic at the planned maximum (5,000 visitors a day), for
-- performance testing ONLY. Never run on the live database.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f loadtest/seed-volume.sql
--   remove again:  psql "$DATABASE_URL" -f loadtest/remove-volume.sql
--
-- Every row it makes is marked: ids start with "load_" (visitors "v_LOAD", sessions
-- "s_load_", patients load_pt_N with email load.N@neyu.test). Password for every
-- load-test patient: Load-Test-Pass-1
--
-- Size: 1.8M visitors · 5.4M page views · 400k searches/clicks · 15k patients ·
-- 60k Neyu chats (180k messages) · 30k symptom checks · 8k referrals · 1M audit rows.

\timing on
SET synchronous_commit = off;

-- Pages people visit, roughly how often (home and the main hubs most).
CREATE TEMP TABLE load_paths (i int, path text);
INSERT INTO load_paths
SELECT row_number() OVER () - 1, p FROM unnest(ARRAY[
  '/','/','/','/','/specialties','/specialties/cardiology','/specialties/cardiology','/diagnostics','/diagnostics/stress-testing',
  '/diagnostics/cardiac-imaging','/diagnostics/monitoring','/diagnostics/vascular','/diagnostics/pulmonary','/physicians','/physicians',
  '/care','/virtual-care','/hypertension-clinic','/at-home','/packages','/membership','/prevention','/longevity','/longevity-lab',
  '/genomics','/lab-results','/explain-diagnosis','/cardiac-symptoms','/neyu','/referral-centre','/contact','/about','/services',
  '/specialties/internal-medicine','/specialties/endocrinology','/specialties/heart-failure-clinic','/specialties/skin-health',
  '/my-health/sign-up','/my-health/sign-in','/resources']) AS p;

-- 1 · Visitors: 1.8M sessions over 365 days.
INSERT INTO "Visitor" ("id","sessionId","firstSeenAt","lastSeenAt","pageCount","landingPath","referrer","userAgent")
SELECT 'v_LOAD' || g, 's_load_' || g, t, t + interval '4 minutes', 3,
       (SELECT path FROM load_paths WHERE i = g % 40),
       (ARRAY[NULL,'https://www.google.com/','https://www.google.ca/','https://chatgpt.com/','https://www.facebook.com/','https://www.bing.com/'])[1 + g % 6],
       CASE WHEN g % 3 = 0 THEN 'Mozilla/5.0 (Windows NT 10.0) Chrome/130' ELSE 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1' END
FROM generate_series(1, 1800000) g, LATERAL (SELECT now() - (g % 365) * interval '1 day' - (g % 86400) * interval '1 second' AS t) x;

-- 2 · Page views: 3 per visitor.
INSERT INTO "PageVisit" ("id","path","sessionId","userAgent","referrer","createdAt")
SELECT 'load_pv_' || g || '_' || k, (SELECT path FROM load_paths WHERE i = (g * 7 + k * 13) % 40), 's_load_' || g, NULL, NULL,
       now() - (g % 365) * interval '1 day' - (g % 86400) * interval '1 second' + k * interval '70 seconds'
FROM generate_series(1, 1800000) g, generate_series(0, 2) k;

-- 3 · Searches and clicks.
INSERT INTO "SiteEvent" ("id","sessionId","type","label","path","target","device","createdAt")
SELECT 'load_ev_' || g, 's_load_' || (g * 4), CASE WHEN g % 3 = 0 THEN 'search' ELSE 'click' END,
       (ARRAY['stress echo','holter monitor','cardiologist calgary','blood pressure','book appointment','echocardiogram','Book a test','Find a physician','Ask Neyu','Sign up'])[1 + g % 10],
       (SELECT path FROM load_paths WHERE i = g % 40), CASE WHEN g % 3 = 0 THEN NULL ELSE '/referral-centre' END,
       CASE WHEN g % 3 = 0 THEN 'desktop' ELSE 'mobile' END, now() - (g % 365) * interval '1 day' - (g % 86400) * interval '1 second'
FROM generate_series(1, 400000) g;

INSERT INTO "OutboundClick" ("id","sessionId","host","url","fromPath","createdAt")
SELECT 'load_oc_' || g, 's_load_' || (g * 9), 'bioarolabs.com', 'https://bioarolabs.com/', '/genomics', now() - (g % 365) * interval '1 day'
FROM generate_series(1, 120000) g;

-- 4 · Patients (15k) with a session each so dashboards have realistic joins.
INSERT INTO "Patient" ("id","email","passwordHash","firstName","lastName","termsAcceptedAt","emailVerifiedAt","createdAt","updatedAt")
SELECT 'load_pt_' || g, 'load.' || g || '@neyu.test',
       'scrypt$32768$8$1$bhAkmbsSEEbY5gC8PktQVQ==$gSh21QzA5JEW9URTnUXxfxBAjrnGaqOD/Xe8DazhsiocQ25SV6dH8kE4PtlQ2e8k2beBhczC1HE4s6/VWhACRw==',
       'Load' || g, 'Tester', now() - (g % 365) * interval '1 day', CASE WHEN g % 5 = 0 THEN NULL ELSE now() - (g % 365) * interval '1 day' END,
       now() - (g % 365) * interval '1 day', now()
FROM generate_series(1, 15000) g;
UPDATE "Visitor" SET "patientId" = 'load_pt_' || (substr(id, 7)::int / 120), "convertedAt" = "firstSeenAt"
WHERE id LIKE 'v_LOAD%' AND substr(id, 7)::int % 120 = 0 AND substr(id, 7)::int / 120 BETWEEN 1 AND 15000;

-- 5 · Neyu chats, symptom checks, lab checks, assessments, referrals.
INSERT INTO "AlbaConversation" ("id","sessionId","pageContext","createdAt","patientId")
SELECT 'load_ac_' || g, 's_load_' || (g * 30), '/', now() - (g % 365) * interval '1 day', CASE WHEN g % 4 = 0 THEN 'load_pt_' || (1 + g % 15000) END
FROM generate_series(1, 60000) g;
INSERT INTO "AlbaMessage" ("id","conversationId","role","text","createdAt")
SELECT 'load_am_' || g || '_' || k, 'load_ac_' || g, CASE WHEN k = 1 THEN 'assistant' ELSE 'user' END,
       (ARRAY['What is a normal blood pressure?','How do I prepare for a stress echo?','My cholesterol is high, what does LDL mean?','Can I book a Holter monitor?','Why do I feel palpitations?'])[1 + g % 5],
       now() - (g % 365) * interval '1 day' + k * interval '20 seconds'
FROM generate_series(1, 60000) g, generate_series(0, 2) k;
INSERT INTO "SymptomCheckLog" ("id","specialty","description","emergency","urgency","recommendedDiscipline","summary","sessionId","createdAt","patientId","reviewedAt")
SELECT 'load_sc_' || g, 'cardiology', 'Load test symptom description', g % 50 = 0, 'routine', 'Cardiology', 'Load test summary', 's_load_' || (g * 60),
       now() - (g % 365) * interval '1 day', CASE WHEN g % 3 = 0 THEN 'load_pt_' || (1 + g % 15000) END, CASE WHEN g % 50 = 0 THEN now() END
FROM generate_series(1, 30000) g;
INSERT INTO "LabResultCheck" ("id","inputType","overallSummary","results","sessionId","createdAt","patientId")
SELECT 'load_lc_' || g, 'text', 'Load test', '[]', 's_load_' || (g * 50), now() - (g % 365) * interval '1 day', NULL FROM generate_series(1, 30000) g;
INSERT INTO "LongevityAssessment" ("id","answers","summary","focusAreas","suggestedNextStep","sessionId","createdAt","patientId")
SELECT 'load_la_' || g, '{}', 'Load test', '[]', 'Load test', 's_load_' || (g * 70), now() - (g % 365) * interval '1 day', NULL FROM generate_series(1, 15000) g;
INSERT INTO "ReferralSubmission" ("id","type","patientName","sessionId","createdAt","status","patientId")
SELECT 'load_rf_' || g, 'patient', 'Load Patient ' || g, 's_load_' || (g * 200), now() - (g % 365) * interval '1 day',
       CASE WHEN g % 10 = 0 THEN 'received' ELSE 'scheduled' END, CASE WHEN g % 2 = 0 THEN 'load_pt_' || (1 + g % 15000) END
FROM generate_series(1, 8000) g;

-- 6 · Audit trail.
INSERT INTO "AuditEvent" ("id","at","orgId","actorType","actorId","actorLabel","action","resource","subjectPatientId","result")
SELECT 'load_au_' || g, now() - (g % 365) * interval '1 day' - (g % 86400) * interval '1 second', 'org_neyu',
       CASE WHEN g % 10 = 0 THEN 'staff' ELSE 'patient' END, 'load_pt_' || (1 + g % 15000), 'load', (ARRAY['view','login','update','create'])[1 + g % 4],
       'portal', 'load_pt_' || (1 + g % 15000), CASE WHEN g % 200 = 0 THEN 'denied' ELSE 'success' END
FROM generate_series(1, 1000000) g;
INSERT INTO "AdminAuditEvent" ("id","actor","role","kind","action","resource","subjectType","subjectId","result","createdAt")
SELECT 'load_aa_' || g, 'load-admin', 'Admin', 'View', 'Opened Patient 360', 'Patient record', 'patient', 'load_pt_' || (1 + g % 15000), 'Success',
       now() - (g % 365) * interval '1 day'
FROM generate_series(1, 300000) g;

ANALYZE;
SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE n_live_tup > 1000 ORDER BY n_live_tup DESC;
