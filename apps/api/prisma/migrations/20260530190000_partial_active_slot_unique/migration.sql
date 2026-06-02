-- Replace the all-status unique slot guard with a PARTIAL unique index scoped to
-- ACTIVE bookings, so cancelled/completed bookings free their slot for rebooking
-- while two concurrent active bookings on the same (stylist, startTime) still
-- collide at the database level (CLAUDE.md §11 double-booking guarantee).

-- Drop the old all-status unique index created by @@unique([stylistId, startTime]).
DROP INDEX "bookings_stylistId_startTime_key";

-- Plain index for availability range scans on (stylistId, startTime).
CREATE INDEX "bookings_stylistId_startTime_idx" ON "bookings"("stylistId", "startTime");

-- The authoritative double-booking guard: at most one PENDING/CONFIRMED booking
-- may exist per (stylist, startTime). CANCELLED/COMPLETED rows are excluded from
-- the index, so the slot becomes bookable again once a booking leaves the active
-- set. A concurrent insert that would violate this surfaces to Prisma as P2002.
CREATE UNIQUE INDEX "bookings_active_slot_key"
  ON "bookings"("stylistId", "startTime")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
