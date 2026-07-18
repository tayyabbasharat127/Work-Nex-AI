ALTER TABLE "BiometricDevice" ADD COLUMN "hmacSecretEncrypted" TEXT;

CREATE UNIQUE INDEX "BiometricDevice_deviceSerial_key" ON "BiometricDevice"("deviceSerial");

CREATE TABLE "BiometricWebhookNonce" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BiometricWebhookNonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BiometricWebhookNonce_deviceId_nonce_key" ON "BiometricWebhookNonce"("deviceId", "nonce");
CREATE INDEX "BiometricWebhookNonce_expiresAt_idx" ON "BiometricWebhookNonce"("expiresAt");
ALTER TABLE "BiometricWebhookNonce" ADD CONSTRAINT "BiometricWebhookNonce_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
