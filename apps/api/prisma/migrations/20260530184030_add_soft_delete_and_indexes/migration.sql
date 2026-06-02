-- DropIndex
DROP INDEX "services_isActive_idx";

-- DropIndex
DROP INDEX "services_stylistId_idx";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stylists" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_idx" ON "audit_logs"("userId", "action");

-- CreateIndex
CREATE INDEX "bookings_userId_status_idx" ON "bookings"("userId", "status");

-- CreateIndex
CREATE INDEX "bookings_stylistId_status_idx" ON "bookings"("stylistId", "status");

-- CreateIndex
CREATE INDEX "bookings_serviceId_idx" ON "bookings"("serviceId");

-- CreateIndex
CREATE INDEX "reviews_stylistId_deletedAt_idx" ON "reviews"("stylistId", "deletedAt");

-- CreateIndex
CREATE INDEX "reviews_deletedAt_idx" ON "reviews"("deletedAt");

-- CreateIndex
CREATE INDEX "services_stylistId_isActive_idx" ON "services"("stylistId", "isActive");

-- CreateIndex
CREATE INDEX "stylists_deletedAt_idx" ON "stylists"("deletedAt");

-- CreateIndex
CREATE INDEX "stylists_isAvailable_rating_idx" ON "stylists"("isAvailable", "rating");

-- CreateIndex
CREATE INDEX "stylists_location_isAvailable_idx" ON "stylists"("location", "isAvailable");
