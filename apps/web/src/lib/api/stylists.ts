import type {
  AvailabilityResult,
  ListStylistsQuery,
  PaginatedResult,
  StylistDetail,
  StylistListItem,
  StylistReviewsResult,
} from "@glamly/shared";
import { client, unwrap } from "./client";

// Query params for the stylist list. Mirrors the API's listStylistsQuerySchema;
// axios serialises numbers/booleans to query strings, which the API coerces back.
export type ListStylistsParams = Partial<ListStylistsQuery>;

export interface AvailabilityParams {
  date?: string; // YYYY-MM-DD
  days?: number;
  serviceId?: string;
}

export interface ListReviewsParams {
  page?: number;
  limit?: number;
}

export const stylistsApi = {
  list(params: ListStylistsParams = {}): Promise<PaginatedResult<StylistListItem>> {
    return unwrap<PaginatedResult<StylistListItem>>(client.get("/stylists", { params }));
  },

  getById(id: string): Promise<StylistDetail> {
    return unwrap<StylistDetail>(client.get(`/stylists/${id}`));
  },

  getAvailability(id: string, params: AvailabilityParams = {}): Promise<AvailabilityResult> {
    return unwrap<AvailabilityResult>(client.get(`/stylists/${id}/availability`, { params }));
  },

  listReviews(id: string, params: ListReviewsParams = {}): Promise<StylistReviewsResult> {
    return unwrap<StylistReviewsResult>(client.get(`/stylists/${id}/reviews`, { params }));
  },
};
