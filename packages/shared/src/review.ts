import { z } from "zod";
import { limitQueryField, pageQueryField } from "./query";

// ─── Reviews ──────────────────────────────────────────────────────────────────
//
// A review is anchored to a COMPLETED booking (one review per booking — enforced
// by a unique constraint on Review.bookingId). Rating is an integer 1–5; the
// stylist's denormalised `rating`/`reviewCount` are recomputed on every write.

export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;

export const createReviewSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(REVIEW_MIN_RATING, `Rating must be at least ${REVIEW_MIN_RATING}`)
    .max(REVIEW_MAX_RATING, `Rating must be at most ${REVIEW_MAX_RATING}`),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
});
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
