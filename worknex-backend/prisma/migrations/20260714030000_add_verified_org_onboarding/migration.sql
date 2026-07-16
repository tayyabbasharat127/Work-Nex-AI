ALTER TABLE "Organization"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT;

ALTER TABLE "OrganizationSettings"
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onboardingStep" TEXT NOT NULL DEFAULT 'HR_CONFIGURATION';

CREATE TABLE "OrganizationSignup" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "verificationCodeHash" TEXT NOT NULL,
  "verificationExpiresAt" TIMESTAMP(3) NOT NULL,
  "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastCodeSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "completionTokenHash" TEXT,
  "completionTokenExpiresAt" TIMESTAMP(3),
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSignup_email_key" ON "OrganizationSignup"("email");
CREATE UNIQUE INDEX "OrganizationSignup_completionTokenHash_key" ON "OrganizationSignup"("completionTokenHash");
CREATE INDEX "OrganizationSignup_verificationExpiresAt_idx" ON "OrganizationSignup"("verificationExpiresAt");
CREATE INDEX "OrganizationSignup_completionTokenExpiresAt_idx" ON "OrganizationSignup"("completionTokenExpiresAt");
