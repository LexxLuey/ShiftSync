ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Location"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");
