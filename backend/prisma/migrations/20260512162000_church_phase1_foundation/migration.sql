-- CreateEnum
CREATE TYPE "EventTemplateScope" AS ENUM ('LOCATION', 'MINISTRY');

-- AlterTable
ALTER TABLE "Shift"
ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Untitled Shift',
ADD COLUMN "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "eventInstanceId" TEXT;

-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "EventTemplateScope" NOT NULL DEFAULT 'LOCATION',
    "locationId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTemplateRequirement" (
    "id" TEXT NOT NULL,
    "eventTemplateId" TEXT NOT NULL,
    "requiredSkillId" TEXT NOT NULL,
    "headcountNeeded" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplateRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shift_eventInstanceId_idx" ON "Shift"("eventInstanceId");

-- CreateIndex
CREATE INDEX "EventTemplate_scope_locationId_dayOfWeek_isActive_idx" ON "EventTemplate"("scope", "locationId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "EventTemplate_createdById_idx" ON "EventTemplate"("createdById");

-- CreateIndex
CREATE INDEX "EventTemplateRequirement_eventTemplateId_sortOrder_idx" ON "EventTemplateRequirement"("eventTemplateId", "sortOrder");

-- CreateIndex
CREATE INDEX "EventTemplateRequirement_requiredSkillId_idx" ON "EventTemplateRequirement"("requiredSkillId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateRequirement" ADD CONSTRAINT "EventTemplateRequirement_eventTemplateId_fkey" FOREIGN KEY ("eventTemplateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateRequirement" ADD CONSTRAINT "EventTemplateRequirement_requiredSkillId_fkey" FOREIGN KEY ("requiredSkillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
