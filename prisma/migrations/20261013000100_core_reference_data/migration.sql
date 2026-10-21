-- Core reference data every environment needs (idempotent).
-- The NEYU organization, its clinics, the permission catalogue and the built-in roles.

INSERT INTO "Organization" ("id","slug","name","kind","status","settings","createdAt","updatedAt") VALUES
  ('org_neyu','neyu','NEYU Health','platform','active','{"reportApproval":"optional","reminderDays":3,"undoMinutes":10}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Clinic" ("id","orgId","slug","name","address","phone","fax","timezone","active","createdAt") VALUES
  ('clinic_ne','org_neyu','north-east','North East Clinic','201 – 3151 27 St NE, Calgary, AB T1Y 0B4','403-475-4475','403.235.4147','America/Edmonton',true,CURRENT_TIMESTAMP),
  ('clinic_mm','org_neyu','meadow-miles','Meadow Miles Clinic','250 – 8500 Blackfoot Trail SE, Calgary, AB T2J 7E1','403.879.7911','403.879.7899','America/Edmonton',true,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Permission" ("key","area","description") VALUES
  ('platform.orgs.manage','platform','Create and manage organizations'),
  ('platform.settings.manage','platform','Change global settings'),
  ('staff.invite','staff','Invite staff and assign roles'),
  ('staff.roles.manage','staff','Create and edit roles'),
  ('patients.list','patients','See the patient list of the organization'),
  ('patients.record.read','patients','Open a patient''s full record'),
  ('patients.record.update','patients','Edit a patient''s record'),
  ('reports.create','reports','Upload a report for a patient'),
  ('reports.send','reports','Send a report to a patient'),
  ('reports.approve','reports','Approve or reject a report before it is sent'),
  ('referrals.manage','care','Handle referrals'),
  ('appointments.manage','care','Manage appointments'),
  ('requests.manage','care','Handle service requests from the website'),
  ('analytics.read','analytics','See analytics without patient names'),
  ('exports.create','analytics','Export de-identified data'),
  ('audit.read','audit','Read the audit log'),
  ('privacy.deletion.manage','privacy','Process account deletion requests'),
  ('privacy.export.manage','privacy','Process data export requests'),
  ('ai.logs.read','platform','Read Neyu AI call logs')
ON CONFLICT ("key") DO UPDATE SET "area" = EXCLUDED."area", "description" = EXCLUDED."description";

INSERT INTO "Role" ("id","orgId","key","name","description","isSystem","createdAt","updatedAt") VALUES
  ('role_super_admin',NULL,'super_admin','Super admin','Runs the whole platform',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role_org_admin',NULL,'org_admin','Organization admin','Runs one organization',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role_clinic_manager',NULL,'clinic_manager','Clinic manager','Runs a clinic''s day-to-day',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role_care_staff',NULL,'care_staff','Care staff','Prepares and sends reports to patients',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role_physician',NULL,'physician','Physician','Reviews records and approves reports',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role_support',NULL,'support','Support','Helps patients with access and requests',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionKey","scope") VALUES
  ('role_super_admin','platform.orgs.manage','full'),
  ('role_super_admin','platform.settings.manage','full'),
  ('role_super_admin','staff.invite','full'),
  ('role_super_admin','staff.roles.manage','full'),
  ('role_super_admin','patients.list','reason'),
  ('role_super_admin','patients.record.read','reason'),
  ('role_super_admin','analytics.read','full'),
  ('role_super_admin','exports.create','full'),
  ('role_super_admin','audit.read','full'),
  ('role_super_admin','privacy.deletion.manage','reason'),
  ('role_super_admin','privacy.export.manage','reason'),
  ('role_super_admin','ai.logs.read','full'),
  ('role_org_admin','staff.invite','full'),
  ('role_org_admin','staff.roles.manage','full'),
  ('role_org_admin','patients.list','full'),
  ('role_org_admin','patients.record.read','reason'),
  ('role_org_admin','reports.create','reason'),
  ('role_org_admin','reports.send','reason'),
  ('role_org_admin','referrals.manage','full'),
  ('role_org_admin','appointments.manage','full'),
  ('role_org_admin','requests.manage','full'),
  ('role_org_admin','analytics.read','full'),
  ('role_org_admin','exports.create','full'),
  ('role_org_admin','audit.read','full'),
  ('role_org_admin','privacy.deletion.manage','reason'),
  ('role_org_admin','privacy.export.manage','reason'),
  ('role_clinic_manager','staff.invite','reason'),
  ('role_clinic_manager','patients.list','full'),
  ('role_clinic_manager','patients.record.read','reason'),
  ('role_clinic_manager','reports.create','full'),
  ('role_clinic_manager','reports.send','full'),
  ('role_clinic_manager','reports.approve','reason'),
  ('role_clinic_manager','referrals.manage','full'),
  ('role_clinic_manager','appointments.manage','full'),
  ('role_clinic_manager','requests.manage','full'),
  ('role_clinic_manager','analytics.read','full'),
  ('role_clinic_manager','exports.create','full'),
  ('role_care_staff','patients.list','full'),
  ('role_care_staff','patients.record.read','reason'),
  ('role_care_staff','reports.create','full'),
  ('role_care_staff','reports.send','full'),
  ('role_care_staff','referrals.manage','full'),
  ('role_care_staff','appointments.manage','full'),
  ('role_care_staff','requests.manage','full'),
  ('role_physician','patients.list','full'),
  ('role_physician','patients.record.read','full'),
  ('role_physician','patients.record.update','full'),
  ('role_physician','reports.create','full'),
  ('role_physician','reports.send','full'),
  ('role_physician','reports.approve','full'),
  ('role_physician','referrals.manage','reason'),
  ('role_physician','appointments.manage','reason'),
  ('role_support','patients.list','reason'),
  ('role_support','requests.manage','full'),
  ('role_support','appointments.manage','reason')
ON CONFLICT ("roleId","permissionKey") DO NOTHING;
