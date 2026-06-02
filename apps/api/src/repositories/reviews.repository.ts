import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  bookingId: true,
  user: { select: { name: true, avatarUrl: true } },
} satisfies Prisma.ReviewSelect;

export interface CreateReviewData {
  bookingId: string;
  userId: string;
  stylistId: string;
  rating: number;
  comment?: string;
}

export type CreateReviewResult =
  | { ok: true; review: Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>; average: number; count: number }
  | { ok: false; reason: "ALREADY_EXISTS" };

function isUnique(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export const reviewsRepository = {
  async findByBookingId(bookingId: string) {
    return prisma.review.findUnique({ where: { bookingId }, select: { id: true } });
  },

  /**
   * Insert a review and atomically recompute the stylist's denormalised
   * `rating`/`reviewCount` from the surviving (non-deleted) reviews — both land
   * together or not at all (CLAUDE.md §11). The unique constraint on
   * `Review.bookingId` is the race-safe guard for "one review per booking".
   */
  async createAndRecompute(data: CreateReviewData): Promise<CreateReviewResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: {
            bookingId: data.bookingId,
            userId: data.userId,
            stylistId: data.stylistId,
            rating: data.rating,
            comment: data.comment,
          },
          select: reviewSelect,
        });

        const agg = await tx.review.aggregate({
          where: { stylistId: data.stylistId, deletedAt: null },
          _avg: { rating: true },
          _count: true,
        });
        const average = agg._avg.rating ?? 0;
        const count = agg._count;

        await tx.stylist.update({
          where: { id: data.stylistId },
          data: { rating: average, reviewCount: count },
        });

        return { ok: true as const, review, average, count };
      });
    } catch (err) {
      if (isUnique(err)) return { ok: false, reason: "ALREADY_EXISTS" };
      throw err;
    }
  },

  /** Page of non-deleted reviews for a stylist + the live average/count summary. */
  async listForStylist(params: { stylistId: string; page: number; limit: number }) {
    const where: Prisma.ReviewWhereInput = { stylistId: params.stylistId, deletedAt: null };

    const [items, total, agg] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        select: reviewSelect,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return { items, total, average: agg._avg.rating ?? 0 };
  },
};
