-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ReminderWindow" AS ENUM ('H24', 'H2');

-- CreateEnum
CREATE TYPE "ReminderJobStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReminderJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "window" "ReminderWindow" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderJobStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderJob_userId_shiftId_channel_window_key" ON "ReminderJob"("userId", "shiftId", "channel", "window");

-- CreateIndex
CREATE INDEX "ReminderJob_status_dueAt_idx" ON "ReminderJob"("status", "dueAt");

-- CreateIndex
CREATE INDEX "ReminderJob_shiftId_userId_idx" ON "ReminderJob"("shiftId", "userId");

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
