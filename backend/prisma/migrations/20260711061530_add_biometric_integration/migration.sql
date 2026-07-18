-- Biometric Integration module: per-organization sync source config +
-- device registry. Purely additive — no existing tables/columns touched.

CREATE TYPE "BiometricIntegrationType" AS ENUM ('DATABASE', 'API', 'ADMS');
CREATE TYPE "BiometricDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

CREATE TABLE "BiometricIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationType" "BiometricIntegrationType" NOT NULL DEFAULT 'DATABASE',
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    "dbType" TEXT,
    "dbHost" TEXT,
    "dbPort" INTEGER,
    "dbName" TEXT,
    "dbUsername" TEXT,
    "dbPasswordEncrypted" TEXT,
    "dbTableName" TEXT,

    "apiBaseUrl" TEXT,
    "apiKeyEncrypted" TEXT,

    "admsCommunicationKeyEncrypted" TEXT,

    "fieldMapping" JSONB NOT NULL DEFAULT '{}',
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 60,

    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BiometricIntegration_organizationId_key" ON "BiometricIntegration"("organizationId");

ALTER TABLE "BiometricIntegration" ADD CONSTRAINT "BiometricIntegration_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "biometricIntegrationId" TEXT,
    "name" TEXT NOT NULL,
    "deviceSerial" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER,
    "location" TEXT,
    "status" "BiometricDeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BiometricDevice_organizationId_idx" ON "BiometricDevice"("organizationId");

ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_biometricIntegrationId_fkey"
    FOREIGN KEY ("biometricIntegrationId") REFERENCES "BiometricIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
