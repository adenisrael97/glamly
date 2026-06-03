import { Prisma, StylistStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ACTIVE_BOOKING_STATUSES, type StylistSortField } from "@glamly/shared";

export interface ListStylistsFilter {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  location?: string;
  specialty?: string;
  minRating?: number;
  available?: boolean;
  sort: StylistSortField;
  order: "asc" | "desc";
}

// Lean projection for list cards — never the underlying user PII beyond the
// public display name + avatar.
const listSelect = {
  id: true,
  specialty: true,
  location: true,
  bio: true,
  avatarUrl: true,
  priceFrom: true,
  rating: true,
  reviewCount: true,
  isAvailable: true,
  isVerified: true,
  status: true,
  experience: true,
  tags: true,
  createdAt: true,
  user: { select: { name: true, avatarUrl: true } },
} satisfies Prisma.StylistSelect;

function buildWhere(filter: ListStylistsFilter): Prisma.StylistWhereInput {
  // Public routes only surface APPROVED stylists (D4).
  const where: Prisma.StylistWhereInput = { deletedAt: null, status: StylistStatus.APPROVED };

  if (filter.available !== undefined) where.isAvailable = filter.available;
  if (filter.minRating !== undefined) where.rating = { gte: filter.minRating };
  if (filter.location) where.location = { contains: filter.location, mode: "insensitive" };
  if (filter.specialty) where.specialty = { contains: filter.specialty, mode: "insensitive" };

  // Category filters to stylists offering at least one active service in it.
  if (filter.category) {
    where.services = { some: { category: filter.category, isActive: true } };
  }

  if (filter.search) {
    where.OR = [
      { specialty: { contains: filter.search, mode: "insensitive" } },
      { location: { contains: filter.search, mode: "insensitive" } },
      { user: { is: { name: { contains: filter.search, mode: "insensitive" } } } },
    ];
  }

  return where;
}

export const stylistsRepository = {
  async findMany(filter: ListStylistsFilter) {
    const where = buildWhere(filter);

    // Secondary `id` sort makes pagination deterministic when the primary key
    // (e.g. rating) ties across rows.
    const orderBy: Prisma.StylistOrderByWithRelationInput[] = [
      { [filter.sort]: filter.order },
      { id: "asc" },
    ];

    const [items, total] = await prisma.$transaction([
      prisma.stylist.findMany({
        where,
        select: listSelect,
        orderBy,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.stylist.count({ where }),
    ]);

    return { items, total };
  },

  /** Full public profile: core fields + active services + denormalised ratings. Only APPROVED. */
  async findDetailById(id: string) {
    return prisma.stylist.findFirst({
      where: { id, deletedAt: null, status: StylistStatus.APPROVED },
      select: {
        ...listSelect,
        lat: true,
        lng: true,
        portfolioUrls: true,
        updatedAt: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            price: true,
            duration: true,
            imageUrl: true,
          },
          orderBy: { price: "asc" },
        },
        // Active packages the stylist offers (shown on the profile + booking wizard).
        packages: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            duration: true,
            imageUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            stylistId: true,
            services: {
              select: {
                service: {
                  select: { id: true, name: true, category: true, description: true, price: true, duration: true, imageUrl: true },
                },
              },
            },
          },
          orderBy: { price: "asc" },
        },
      },
    });
  },

  /**
   * Minimal existence/availability check used by the booking, availability, and
   * public-reviews flows. Scoped to APPROVED stylists only — a customer must not
   * be able to book, view availability for, or browse reviews of a stylist who is
   * PENDING_APPROVAL, REJECTED, or SUSPENDED, even by guessing the id directly.
   */
  async findActiveById(id: string) {
    return prisma.stylist.findFirst({
      where: { id, deletedAt: null, status: StylistStatus.APPROVED },
      select: { id: true, isAvailable: true },
    });
  },

  /** Resolve a STYLIST user's own storefront id (for their provider booking view). */
  async findIdByUserId(userId: string): Promise<string | null> {
    const row = await prisma.stylist.findUnique({ where: { userId }, select: { id: true } });
    return row?.id ?? null;
  },

  /** Full stylist record for the owning user (self-management). */
  async findByUserId(userId: string) {
    return prisma.stylist.findUnique({ where: { userId } });
  },

  /** Update mutable profile fields (bio, location, tags, etc.). */
  async updateProfile(
    id: string,
    data: {
      bio?: string;
      specialty?: string;
      location?: string;
      tags?: string[];
      experience?: number;
      isAvailable?: boolean;
    },
  ) {
    return prisma.stylist.update({ where: { id }, data });
  },

  /**
   * Active (slot-occupying) bookings for a stylist whose interval overlaps
   * [from, to). Used to subtract booked time from the generated slot grid.
   */
  async findActiveBookingsInRange(stylistId: string, from: Date, to: Date) {
    return prisma.booking.findMany({
      where: {
        stylistId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startTime: { lt: to },
        endTime: { gt: from },
      },
      select: { startTime: true, endTime: true },
    });
  },
};
