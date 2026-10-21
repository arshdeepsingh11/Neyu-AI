-- Phase 5 · Performance: indexes for dashboard date ranges (no data changes).
-- At 5,000 visitors a day these turn full-table reads into small index reads.
CREATE INDEX IF NOT EXISTS "Visitor_firstSeenAt_idx" ON "Visitor"("firstSeenAt");
CREATE INDEX IF NOT EXISTS "Patient_createdAt_idx" ON "Patient"("createdAt");
CREATE INDEX IF NOT EXISTS "Patient_emailVerifiedAt_idx" ON "Patient"("emailVerifiedAt");
CREATE INDEX IF NOT EXISTS "AlbaConversation_createdAt_idx" ON "AlbaConversation"("createdAt");
CREATE INDEX IF NOT EXISTS "SymptomCheckLog_createdAt_idx" ON "SymptomCheckLog"("createdAt");
CREATE INDEX IF NOT EXISTS "LongevityAssessment_createdAt_idx" ON "LongevityAssessment"("createdAt");
CREATE INDEX IF NOT EXISTS "LabResultCheck_createdAt_idx" ON "LabResultCheck"("createdAt");
CREATE INDEX IF NOT EXISTS "ReferralSubmission_createdAt_idx" ON "ReferralSubmission"("createdAt");
CREATE INDEX IF NOT EXISTS "AlbaMessage_createdAt_idx" ON "AlbaMessage" USING BRIN ("createdAt" timestamp_minmax_ops);

-- Daily totals (filled by the background worker from raw activity).
CREATE TABLE IF NOT EXISTS "DailyStat" (
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "m" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("day","kind","key")
);
CREATE INDEX IF NOT EXISTS "DailyStat_kind_day_idx" ON "DailyStat"("kind", "day");
