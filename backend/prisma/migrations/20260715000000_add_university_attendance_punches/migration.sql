CREATE TABLE "UniversityAttendancePunch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityAttendancePunch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UniversityAttendancePunch_organizationId_checkInTime_idx"
ON "UniversityAttendancePunch"("organizationId", "checkInTime");

CREATE INDEX "UniversityAttendancePunch_userId_checkInTime_idx"
ON "UniversityAttendancePunch"("userId", "checkInTime");

ALTER TABLE "UniversityAttendancePunch"
ADD CONSTRAINT "UniversityAttendancePunch_userId_organizationId_fkey"
FOREIGN KEY ("userId", "organizationId")
REFERENCES "User"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UniversityAttendancePunch"
ADD CONSTRAINT "UniversityAttendancePunch_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
