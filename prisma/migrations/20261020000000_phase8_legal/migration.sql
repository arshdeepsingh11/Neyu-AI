-- Phase 8: the full legal pages are published. New policy versions (patients who agreed to
-- the 2026-10-17 versions are asked to review the new ones in My Health Space).
INSERT INTO "PolicyVersion" ("id","kind","version","url","summary","publishedAt") VALUES
  ('pol_terms_20261020','terms','2026-10-20','/terms','Terms of use for neyuhealth.com, My Health Space, Neyu and the NEYU app',CURRENT_TIMESTAMP),
  ('pol_privacy_20261020','privacy','2026-10-20','/privacy','How NEYU collects, uses, shares and protects personal and health information (Alberta HIA and PIPA, PIPEDA)',CURRENT_TIMESTAMP),
  ('pol_ai_20261020','ai','2026-10-20','/ai-notice','Neyu AI reads your data only when you ask, can be switched off, and never diagnoses',CURRENT_TIMESTAMP),
  ('pol_marketing_20261020','marketing','2026-10-20','/privacy#email','News and offers by email — optional, off by default',CURRENT_TIMESTAMP)
ON CONFLICT ("kind","version") DO NOTHING;
