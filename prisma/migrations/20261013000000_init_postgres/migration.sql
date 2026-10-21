
-- CreateTable
CREATE TABLE "PageVisit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSubmission" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "patientName" TEXT,
    "patientPhone" TEXT,
    "referringPhysician" TEXT,
    "referringPhone" TEXT,
    "referringAddress" TEXT,
    "urgency" TEXT,
    "specialties" TEXT,
    "physicianSlugs" TEXT,
    "exams" TEXT,
    "clinicalNotes" TEXT,
    "sourceText" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "orgId" TEXT NOT NULL DEFAULT 'org_neyu',

    CONSTRAINT "ReferralSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomCheckLog" (
    "id" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emergency" BOOLEAN NOT NULL,
    "urgency" TEXT NOT NULL,
    "recommendedDiscipline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "SymptomCheckLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbaConversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pageContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,

    CONSTRAINT "AlbaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbaMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongevityAssessment" (
    "id" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "focusAreas" TEXT NOT NULL,
    "suggestedNextStep" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,

    CONSTRAINT "LongevityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResultCheck" (
    "id" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "overallSummary" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,

    CONSTRAINT "LabResultCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Edmonton',
    "photoVersion" INTEGER NOT NULL DEFAULT 0,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "orgId" TEXT NOT NULL DEFAULT 'org_neyu',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPhoto" (
    "patientId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPhoto_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "PatientSettings" (
    "patientId" TEXT NOT NULL,
    "shareWearables" BOOLEAN NOT NULL DEFAULT true,
    "shareLabs" BOOLEAN NOT NULL DEFAULT true,
    "shareRecords" BOOLEAN NOT NULL DEFAULT true,
    "albaAccess" BOOLEAN NOT NULL DEFAULT true,
    "notifDaily" BOOLEAN NOT NULL DEFAULT true,
    "notifWorth" BOOLEAN NOT NULL DEFAULT true,
    "notifProtocol" BOOLEAN NOT NULL DEFAULT true,
    "notifAppt" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "province" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "briefEmail" BOOLEAN NOT NULL DEFAULT false,
    "learnUsage" BOOLEAN NOT NULL DEFAULT true,
    "aiInsights" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSettings_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeamMember" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "physicianSlug" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceConnection" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tokenHash" TEXT,
    "tokenHint" TEXT,
    "dataTypes" TEXT NOT NULL DEFAULT '[]',
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "externalUserId" TEXT,
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "valueText" TEXT,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "category" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "valueText" TEXT,
    "unit" TEXT,
    "refLow" DOUBLE PRECISION,
    "refHigh" DOUBLE PRECISION,
    "refText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'final',
    "expectedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'BioAro Labs',
    "panel" TEXT,
    "about" TEXT,
    "guidance" TEXT,
    "staffNote" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolItem" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "timeOfDay" TEXT,
    "dose" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sections" TEXT NOT NULL DEFAULT '[]',
    "guidance" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clinician" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "summaryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleRequestedAt" TIMESTAMP(3),
    "prepShareTrends" BOOLEAN NOT NULL DEFAULT true,
    "prepShareResults" BOOLEAN NOT NULL DEFAULT true,
    "prepShareSymptoms" BOOLEAN NOT NULL DEFAULT true,
    "prepSavedAt" TIMESTAMP(3),
    "prepReviewedAt" TIMESTAMP(3),
    "staffNotes" TEXT,
    "orgId" TEXT NOT NULL DEFAULT 'org_neyu',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitQuestion" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "landingPath" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "patientId" TEXT,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundClick" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fromPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Admin (shared)',
    "kind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "subject" TEXT,
    "reason" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "result" TEXT NOT NULL DEFAULT 'Success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sys" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "pulse" INTEGER,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "day" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BpReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifestyleLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "day" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifestyleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLink" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "caregiverId" TEXT,
    "email" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'Family',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviteHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "CareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '[]',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "goal" DOUBLE PRECISION NOT NULL,
    "startDay" TEXT NOT NULL,
    "endDay" TEXT NOT NULL,
    "org" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeMember" (
    "challengeId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeMember_pkey" PRIMARY KEY ("challengeId","patientId")
);

-- CreateTable
CREATE TABLE "RewardEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "code" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "DevicePairing" (
    "codeHash" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePairing_pkey" PRIMARY KEY ("codeHash")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" TEXT NOT NULL,
    "choice" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postal" TEXT,
    "message" TEXT,
    "page" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "orgId" TEXT NOT NULL DEFAULT 'org_neyu',

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "provider" TEXT,
    "docDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'upload',
    "mime" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "data" BYTEA NOT NULL,
    "extracted" TEXT NOT NULL DEFAULT '{}',
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meal" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "portion" TEXT,
    "photo" BYTEA,
    "photoMime" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheckIn" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "feeling" INTEGER NOT NULL,
    "energy" INTEGER,
    "sleep" INTEGER,
    "stress" INTEGER,
    "activity" INTEGER,
    "pain" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthInsight" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "confidence" TEXT NOT NULL DEFAULT 'limited',
    "go" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "HealthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileChange" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'clinic',
    "status" TEXT NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Edmonton',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "key" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionKey")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "clinicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "url" TEXT,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "policyVersionId" TEXT,
    "granted" BOOLEAN NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianLink" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'Parent',
    "status" TEXT NOT NULL DEFAULT 'active',
    "consentAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailPreference" (
    "patientId" TEXT NOT NULL,
    "reminders" BOOLEAN NOT NULL DEFAULT true,
    "news" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "requestedBy" TEXT NOT NULL DEFAULT 'patient',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "subjectPatientId" TEXT,
    "subjectId" TEXT,
    "reason" TEXT,
    "result" TEXT NOT NULL DEFAULT 'success',
    "ip" TEXT,
    "meta" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectedReason" TEXT,
    "aiCheck" JSONB,
    "sentAt" TIMESTAMP(3),
    "undoUntil" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDelivery" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageVisit_path_idx" ON "PageVisit"("path");

-- CreateIndex
CREATE INDEX "PageVisit_sessionId_idx" ON "PageVisit"("sessionId");

-- CreateIndex
CREATE INDEX "PageVisit_createdAt_idx" ON "PageVisit" USING BRIN ("createdAt" timestamp_minmax_ops);

-- CreateIndex
CREATE INDEX "ReferralSubmission_sessionId_idx" ON "ReferralSubmission"("sessionId");

-- CreateIndex
CREATE INDEX "ReferralSubmission_status_createdAt_idx" ON "ReferralSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralSubmission_patientId_createdAt_idx" ON "ReferralSubmission"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralSubmission_orgId_status_createdAt_idx" ON "ReferralSubmission"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SymptomCheckLog_sessionId_idx" ON "SymptomCheckLog"("sessionId");

-- CreateIndex
CREATE INDEX "SymptomCheckLog_patientId_createdAt_idx" ON "SymptomCheckLog"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "SymptomCheckLog_emergency_reviewedAt_idx" ON "SymptomCheckLog"("emergency", "reviewedAt");

-- CreateIndex
CREATE INDEX "AlbaConversation_sessionId_idx" ON "AlbaConversation"("sessionId");

-- CreateIndex
CREATE INDEX "AlbaConversation_patientId_createdAt_idx" ON "AlbaConversation"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AlbaMessage_conversationId_createdAt_idx" ON "AlbaMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "LongevityAssessment_sessionId_idx" ON "LongevityAssessment"("sessionId");

-- CreateIndex
CREATE INDEX "LongevityAssessment_patientId_createdAt_idx" ON "LongevityAssessment"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "LabResultCheck_sessionId_idx" ON "LabResultCheck"("sessionId");

-- CreateIndex
CREATE INDEX "LabResultCheck_patientId_createdAt_idx" ON "LabResultCheck"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE INDEX "Patient_orgId_createdAt_idx" ON "Patient"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Patient_accountStatus_idx" ON "Patient"("accountStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PatientSession_tokenHash_key" ON "PatientSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PatientSession_patientId_idx" ON "PatientSession"("patientId");

-- CreateIndex
CREATE INDEX "PatientSession_expiresAt_idx" ON "PatientSession"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailCode_patientId_purpose_createdAt_idx" ON "EmailCode"("patientId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "Goal_patientId_idx" ON "Goal"("patientId");

-- CreateIndex
CREATE INDEX "CareTeamMember_patientId_idx" ON "CareTeamMember"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceConnection_tokenHash_key" ON "DeviceConnection"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceConnection_patientId_provider_key" ON "DeviceConnection"("patientId", "provider");

-- CreateIndex
CREATE INDEX "HealthReading_patientId_metric_day_idx" ON "HealthReading"("patientId", "metric", "day");

-- CreateIndex
CREATE UNIQUE INDEX "HealthReading_patientId_metric_day_source_key" ON "HealthReading"("patientId", "metric", "day", "source");

-- CreateIndex
CREATE INDEX "LabResult_patientId_code_collectedAt_idx" ON "LabResult"("patientId", "code", "collectedAt");

-- CreateIndex
CREATE INDEX "LabResult_patientId_collectedAt_idx" ON "LabResult"("patientId", "collectedAt");

-- CreateIndex
CREATE INDEX "LabResult_documentId_idx" ON "LabResult"("documentId");

-- CreateIndex
CREATE INDEX "ProtocolItem_patientId_active_idx" ON "ProtocolItem"("patientId", "active");

-- CreateIndex
CREATE INDEX "ProtocolLog_patientId_day_idx" ON "ProtocolLog"("patientId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolLog_itemId_day_key" ON "ProtocolLog"("itemId", "day");

-- CreateIndex
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_orgId_startsAt_idx" ON "Appointment"("orgId", "startsAt");

-- CreateIndex
CREATE INDEX "VisitQuestion_patientId_createdAt_idx" ON "VisitQuestion"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessLog_patientId_createdAt_idx" ON "AccessLog"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_sessionId_key" ON "Visitor"("sessionId");

-- CreateIndex
CREATE INDEX "Visitor_patientId_idx" ON "Visitor"("patientId");

-- CreateIndex
CREATE INDEX "Visitor_lastSeenAt_idx" ON "Visitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "OutboundClick_createdAt_idx" ON "OutboundClick" USING BRIN ("createdAt" timestamp_minmax_ops);

-- CreateIndex
CREATE INDEX "OutboundClick_host_createdAt_idx" ON "OutboundClick"("host", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "AdminAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_subjectId_createdAt_idx" ON "AdminAuditEvent"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_kind_createdAt_idx" ON "AdminAuditEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "BpReading_patientId_day_idx" ON "BpReading"("patientId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "BpReading_patientId_takenAt_source_key" ON "BpReading"("patientId", "takenAt", "source");

-- CreateIndex
CREATE INDEX "LifestyleLog_patientId_day_idx" ON "LifestyleLog"("patientId", "day");

-- CreateIndex
CREATE INDEX "LifestyleLog_patientId_kind_day_idx" ON "LifestyleLog"("patientId", "kind", "day");

-- CreateIndex
CREATE UNIQUE INDEX "CareLink_inviteHash_key" ON "CareLink"("inviteHash");

-- CreateIndex
CREATE INDEX "CareLink_ownerId_idx" ON "CareLink"("ownerId");

-- CreateIndex
CREATE INDEX "CareLink_caregiverId_idx" ON "CareLink"("caregiverId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLink_patientId_idx" ON "ShareLink"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_code_key" ON "Challenge"("code");

-- CreateIndex
CREATE INDEX "ChallengeMember_patientId_idx" ON "ChallengeMember"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardEvent_code_key" ON "RewardEvent"("code");

-- CreateIndex
CREATE INDEX "RewardEvent_patientId_createdAt_idx" ON "RewardEvent"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardEvent_patientId_kind_day_key" ON "RewardEvent"("patientId", "kind", "day");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedNote_patientId_kind_period_key" ON "GeneratedNote"("patientId", "kind", "period");

-- CreateIndex
CREATE INDEX "DevicePairing_patientId_idx" ON "DevicePairing"("patientId");

-- CreateIndex
CREATE INDEX "ServiceRequest_createdAt_idx" ON "ServiceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_service_idx" ON "ServiceRequest"("service");

-- CreateIndex
CREATE INDEX "ServiceRequest_orgId_status_createdAt_idx" ON "ServiceRequest"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HealthDocument_patientId_docDate_idx" ON "HealthDocument"("patientId", "docDate");

-- CreateIndex
CREATE INDEX "HealthDocument_patientId_createdAt_idx" ON "HealthDocument"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "FoodLog_patientId_day_idx" ON "FoodLog"("patientId", "day");

-- CreateIndex
CREATE INDEX "ActivityEvent_patientId_at_idx" ON "ActivityEvent"("patientId", "at");

-- CreateIndex
CREATE INDEX "HealthCheckIn_patientId_day_idx" ON "HealthCheckIn"("patientId", "day");

-- CreateIndex
CREATE INDEX "HealthInsight_patientId_createdAt_idx" ON "HealthInsight"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthInsight_patientId_key_key" ON "HealthInsight"("patientId", "key");

-- CreateIndex
CREATE INDEX "ProfileChange_patientId_at_idx" ON "ProfileChange"("patientId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_orgId_slug_key" ON "Clinic"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffSession_staffId_idx" ON "StaffSession"("staffId");

-- CreateIndex
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_orgId_key_key" ON "Role"("orgId", "key");

-- CreateIndex
CREATE INDEX "Membership_orgId_status_idx" ON "Membership"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_staffId_orgId_roleId_key" ON "Membership"("staffId", "orgId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_kind_version_key" ON "PolicyVersion"("kind", "version");

-- CreateIndex
CREATE INDEX "Consent_patientId_kind_createdAt_idx" ON "Consent"("patientId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "GuardianLink_wardId_idx" ON "GuardianLink"("wardId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianLink_guardianId_wardId_key" ON "GuardianLink"("guardianId", "wardId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_unsubscribeToken_key" ON "EmailPreference"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "DeletionRequest_status_scheduledFor_idx" ON "DeletionRequest"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "DeletionRequest_patientId_idx" ON "DeletionRequest"("patientId");

-- CreateIndex
CREATE INDEX "ExportRequest_patientId_createdAt_idx" ON "ExportRequest"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent" USING BRIN ("at" timestamp_minmax_ops);

-- CreateIndex
CREATE INDEX "AuditEvent_subjectPatientId_at_idx" ON "AuditEvent"("subjectPatientId", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_at_idx" ON "AuditEvent"("actorId", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_action_at_idx" ON "AuditEvent"("orgId", "action", "at");

-- CreateIndex
CREATE INDEX "PatientReport_patientId_status_createdAt_idx" ON "PatientReport"("patientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientReport_orgId_status_createdAt_idx" ON "PatientReport"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientReport_createdById_status_idx" ON "PatientReport"("createdById", "status");

-- CreateIndex
CREATE INDEX "ReportDelivery_reportId_idx" ON "ReportDelivery"("reportId");

-- CreateIndex
CREATE INDEX "ReportDelivery_status_createdAt_idx" ON "ReportDelivery"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ReferralSubmission" ADD CONSTRAINT "ReferralSubmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomCheckLog" ADD CONSTRAINT "SymptomCheckLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbaConversation" ADD CONSTRAINT "AlbaConversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbaMessage" ADD CONSTRAINT "AlbaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AlbaConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongevityAssessment" ADD CONSTRAINT "LongevityAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultCheck" ADD CONSTRAINT "LabResultCheck_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSession" ADD CONSTRAINT "PatientSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPhoto" ADD CONSTRAINT "PatientPhoto_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSettings" ADD CONSTRAINT "PatientSettings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMember" ADD CONSTRAINT "CareTeamMember_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceConnection" ADD CONSTRAINT "DeviceConnection_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReading" ADD CONSTRAINT "HealthReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolItem" ADD CONSTRAINT "ProtocolItem_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolLog" ADD CONSTRAINT "ProtocolLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProtocolItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolLog" ADD CONSTRAINT "ProtocolLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitQuestion" ADD CONSTRAINT "VisitQuestion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitQuestion" ADD CONSTRAINT "VisitQuestion_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpReading" ADD CONSTRAINT "BpReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifestyleLog" ADD CONSTRAINT "LifestyleLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMember" ADD CONSTRAINT "ChallengeMember_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMember" ADD CONSTRAINT "ChallengeMember_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEvent" ADD CONSTRAINT "RewardEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedNote" ADD CONSTRAINT "GeneratedNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDocument" ADD CONSTRAINT "HealthDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheckIn" ADD CONSTRAINT "HealthCheckIn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthInsight" ADD CONSTRAINT "HealthInsight_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChange" ADD CONSTRAINT "ProfileChange_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "PolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HealthDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PatientReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

