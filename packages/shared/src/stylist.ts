import { z } from "zod";
import {
  booleanQueryField,
  limitQueryField,
  numericQueryField,
  pageQueryField,
} from "./query";

// ─── Stylist discovery (GET /stylists) ────────────────────────────────────────
//
// All filters are optional and composable. Sorting is restricted to an allowlist
// of indexed columns so a client can never trigger an unindexed sort (CLAUDE.md
// §12). `category` filters by the category of a service the stylist offers.

export const STYLIST_SORT_FIELDS = ["rating", "reviewCount", "priceFrom", "createdAt"] as const;
export type StylistSortField = (typeof STYLIST_SORT_FIELDS)[number];

export const listStylistsQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  // Free-text match against stylist name / specialty / location.
  search: z.string().trim().min(1).max(80).optional(),
  // Filter by a service category the stylist offers (e.g. "Makeup", "Hair").
  category: z.string().trim().min(1).max(50).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  specialty: z.string().trim().min(1).max(60).optional(),
  minRating: numericQueryField(0, 5),
  available: booleanQueryField,
  sort: z.enum(STYLIST_SORT_FIELDS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export type ListStylistsQuery = z.infer<typeof listStylistsQuerySchema>;

/** Param schema for routes carrying a stylist id (`/stylists/:id/...`). */
export const stylistIdParamSchema = z.object({
  id: z.string().cuid("Invalid stylist id"),
});
