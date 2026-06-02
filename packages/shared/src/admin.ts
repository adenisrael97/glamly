import { z } from "zod";
import { limitQueryField, pageQueryField } from "./query";
import { BOOKING_STATUSES } from "./booking";

// ─── Stylist status ───────────────────────────────────────────────────────────

export const STYLIST_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
] as const;
export type StylistStatus = (typeof STYLIST_STATUSES)[number];

// ─── Stylist approval ─────────────────────────────────────────────────────────

export const approveStylistSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().min(1).max(500).optional(),
});
export type ApproveStylistInput = z.infer<typeof approveStylistSchema>;

// ─── Admin list queries ───────────────────────────────────────────────────────

export const listAdminStylistsQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  status: z.enum(STYLIST_STATUSES).optional(),
  search: z.string().trim().min(1).max(80).optional(),
});
export type ListAdminStylistsQuery = z.infer<typeof listAdminStylistsQuerySchema>;

export const listAdminUsersQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  search: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["USER", "STYLIST", "ADMIN"]).optional(),
});
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

export const listAdminBookingsQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  status: z.enum(BOOKING_STATUSES).optional(),
  stylistId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type ListAdminBookingsQuery = z.infer<typeof listAdminBookingsQuerySchema>;

export const adminAnalyticsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;

// ─── Role change ──────────────────────────────────────────────────────────────

export const changeUserRoleSchema = z.object({
  role: z.enum(["USER", "STYLIST", "ADMIN"]),
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
