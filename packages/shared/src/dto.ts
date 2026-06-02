// Response DTOs — the JSON shapes the REST API returns, shared so apps/web can
// consume them with the same types apps/api produces. The API currently returns
// Prisma payloads; these interfaces mirror those payloads AFTER JSON
// serialization (every `DateTime` becomes an ISO string, `Decimal`/`Int`/`Float`
// become `number`). Keep them in lockstep with the repository `select`/`include`
// shapes referenced in each section.

import type { BookingStatus } from "./booking";

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginatedMeta;
}

/** Denormalised rating roll-up returned alongside a stylist or a reviews page. */
export interface RatingsSummary {
  average: number;
  count: number;
}

// ─── Stylists ─────────────────────────────────────────────────────────────────
// Mirrors stylistsRepository.listSelect (apps/api/src/repositories/stylists.repository.ts).

export interface StylistUserSummary {
  name: string;
  avatarUrl: string | null;
}

export interface StylistListItem {
  id: string;
  specialty: string;
  location: string;
  bio: string | null;
  avatarUrl: string | null;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isVerified: boolean;
  experience: number | null;
  tags: string[];
  createdAt: string;
  user: StylistUserSummary;
}

/** A service as embedded in a stylist's public detail (findDetailById select). */
export interface StylistServiceSummary {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration: number;
  imageUrl: string | null;
}

/**
 * Mirrors stylistsService.getById: the list fields MINUS `rating`/`reviewCount`
 * (replaced by `ratingsSummary`), PLUS geo, portfolio, active services, and a
 * light availability summary.
 */
export interface StylistDetail {
  id: string;
  specialty: string;
  location: string;
  bio: string | null;
  avatarUrl: string | null;
  priceFrom: number;
  isAvailable: boolean;
  isVerified: boolean;
  experience: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lat: number | null;
  lng: number | null;
  portfolioUrls: string[];
  user: StylistUserSummary;
  services: StylistServiceSummary[];
  ratingsSummary: RatingsSummary;
  availability: {
    isAvailable: boolean;
    nextAvailableSlot: string | null;
  };
}

// ─── Services ─────────────────────────────────────────────────────────────────
// Mirrors servicesRepository.findMany/findById (full service + stylistSelect).

export interface ServiceStylistSummary {
  id: string;
  specialty: string;
  location: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  user: StylistUserSummary;
}

export interface ServiceDTO {
  id: string;
  stylistId: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stylist: ServiceStylistSummary;
}

// ─── Availability ─────────────────────────────────────────────────────────────
// Mirrors stylistsService.getAvailability.

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  stylistId: string;
  isAvailable: boolean;
  durationMinutes: number;
  from: string;
  days: number;
  slots: AvailabilitySlot[];
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
// Mirrors bookingsRepository.bookingInclude.

export interface BookingServiceSummary {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
}

export interface BookingStylistSummary {
  id: string;
  specialty: string;
  location: string;
  avatarUrl: string | null;
  user: { name: string };
}

export interface BookingDTO {
  id: string;
  userId: string;
  stylistId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  totalAmount: number;
  idempotencyKey: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: BookingServiceSummary;
  stylist: BookingStylistSummary;
}

/** Role-aware "my bookings" — `view` tells the client whose perspective it is. */
export interface MyBookingsResult {
  items: BookingDTO[];
  meta: PaginatedMeta;
  view: "customer" | "provider";
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
// Mirrors reviewsRepository.reviewSelect.

export interface ReviewDTO {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  bookingId: string;
  user: StylistUserSummary;
}

/** GET /stylists/:id/reviews — a reviews page plus the live ratings roll-up. */
export interface StylistReviewsResult {
  items: ReviewDTO[];
  ratingsSummary: RatingsSummary;
  meta: PaginatedMeta;
}

/** POST /reviews — the created review plus the recomputed ratings roll-up. */
export interface CreateReviewResult {
  review: ReviewDTO;
  ratingsSummary: RatingsSummary;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
// InitiatePaymentResult / PaymentStatusResult / PaymentStatus already live in
// ./payment and are re-exported from the package index.
