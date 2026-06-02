import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  ROLES,
  type CreateReviewInput,
  type ListReviewsQuery,
  type Role,
} from "@glamly/shared";
import { reviewsRepository } from "../repositories/reviews.repository";
import { bookingsRepository } from "../repositories/bookings.repository";
import { stylistsRepository } from "../repositories/stylists.repository";
import { auditRepository } from "../repositories/audit.repository";
import {
  BookingNotCompletedError,
  BookingNotFoundError,
  ForbiddenError,
  NotFoundError,
  ReviewAlreadyExistsError,
} from "../errors/AppError";

interface Actor {
  userId: string;
  role: Role;
}
interface Context {
  ipAddress?: string;
}

export const reviewsService = {
  async create(actor: Actor, input: CreateReviewInput, ctx: Context = {}) {
    const booking = await bookingsRepository.findById(input.bookingId);
    if (!booking) throw new BookingNotFoundError();

    // Ownership: a customer may only review their OWN booking (admins exempt).
    if (actor.role !== ROLES.ADMIN && booking.userId !== actor.userId) {
      throw new ForbiddenError("You can only review your own bookings");
    }

    // Only a completed appointment can be reviewed.
    if (booking.status !== "COMPLETED") throw new BookingNotCompletedError();

    const result = await reviewsRepository.createAndRecompute({
      bookingId: booking.id,
      userId: booking.userId,
      stylistId: booking.stylistId,
      rating: input.rating,
      comment: input.comment,
    });
    if (!result.ok) throw new ReviewAlreadyExistsError();

    await auditRepository.record({
      userId: actor.userId,
      action: "REVIEW_CREATED",
      entityType: "Review",
      entityId: result.review.id,
      metadata: { stylistId: booking.stylistId, rating: input.rating },
      ipAddress: ctx.ipAddress,
    });

    return {
      review: result.review,
      ratingsSummary: { average: round2(result.average), count: result.count },
    };
  },

  async listForStylist(stylistId: string, query: ListReviewsQuery) {
    // 404 for an unknown stylist rather than a silent empty page.
    const stylist = await stylistsRepository.findActiveById(stylistId);
    if (!stylist) throw new NotFoundError("Stylist not found");

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(
      Math.max(1, query.limit ?? PAGINATION_DEFAULT_PAGE_SIZE),
      PAGINATION_MAX_PAGE_SIZE,
    );

    const { items, total, average } = await reviewsRepository.listForStylist({
      stylistId,
      page,
      limit,
    });

    return {
      items,
      ratingsSummary: { average: round2(average), count: total },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}
