-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'PENDING_SWAP');

-- CreateEnum
CREATE TYPE "SwapType" AS ENUM ('SWAP', 'DROP');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "locationId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exception" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,

    CONSTRAINT "Exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "requiredSkillId" TEXT NOT NULL,
    "headcountNeeded" INTEGER NOT NULL DEFAULT 1,
    "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requestingUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "type" "SwapType" NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationManager" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "Certification_locationId_userId_revokedAt_idx" ON "Certification"("locationId", "userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_userId_locationId_key" ON "Certification"("userId", "locationId");

-- CreateIndex
CREATE INDEX "Availability_userId_dayOfWeek_idx" ON "Availability"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Availability_locationId_idx" ON "Availability"("locationId");

-- CreateIndex
CREATE INDEX "Exception_userId_date_idx" ON "Exception"("userId", "date");

-- CreateIndex
CREATE INDEX "Shift_locationId_startTime_idx" ON "Shift"("locationId", "startTime");

-- CreateIndex
CREATE INDEX "ShiftAssignment_userId_shiftId_idx" ON "ShiftAssignment"("userId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_userId_key" ON "ShiftAssignment"("shiftId", "userId");

-- CreateIndex
CREATE INDEX "SwapRequest_shiftId_status_idx" ON "SwapRequest"("shiftId", "status");

-- CreateIndex
CREATE INDEX "SwapRequest_requestingUserId_status_idx" ON "SwapRequest"("requestingUserId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "LocationManager_userId_locationId_idx" ON "LocationManager"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationManager_locationId_userId_key" ON "LocationManager"("locationId", "userId");

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_requiredSkillId_fkey" FOREIGN KEY ("requiredSkillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_requestingUserId_fkey" FOREIGN KEY ("requestingUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationManager" ADD CONSTRAINT "LocationManager_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationManager" ADD CONSTRAINT "LocationManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
