-- Phase 6 · Mobile app: phones that receive push notifications.
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX "PushDevice_patientId_idx" ON "PushDevice"("patientId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
