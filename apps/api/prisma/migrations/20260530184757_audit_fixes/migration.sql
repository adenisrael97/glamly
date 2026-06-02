-- DropIndex
DROP INDEX "reviews_stylistId_idx";

-- DropIndex
DROP INDEX "stylists_isAvailable_idx";

-- DropIndex
DROP INDEX "stylists_location_idx";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AddConstraint: enforce rating is always 1–5 at the DB level.
-- The service layer validates this too, but belt-and-suspenders prevents
-- any future code path (admin tools, direct DB access) from writing garbage.
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_check" CHECK (rating >= 1 AND rating <= 5);

-- AddConstraint: a booking where endTime <= startTime is nonsensical.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_end_after_start_check" CHECK ("endTime" > "startTime");
