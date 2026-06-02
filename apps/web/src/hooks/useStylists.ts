import useSWR from "swr";
import type {
  AvailabilityResult,
  StylistDetail,
  StylistReviewsResult,
} from "@glamly/shared";
import {
  stylistsApi,
  type AvailabilityParams,
  type ListReviewsParams,
  type ListStylistsParams,
} from "@/lib/api";

// SWR hooks for stylist discovery. `keepPreviousData` avoids a flash of empty
// state when filters change (CLAUDE.md §4). Array keys let SWR dedupe by value.

const SWR_LIST_OPTIONS = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  dedupingInterval: 5000,
} as const;

export function useStylists(params: ListStylistsParams = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ["stylists", params],
    () => stylistsApi.list(params),
    SWR_LIST_OPTIONS,
  );

  return {
    stylists: data?.items ?? [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useStylist(id: string | null | undefined) {
  const { data, error, isLoading } = useSWR<StylistDetail>(
    id ? ["stylist", id] : null,
    () => stylistsApi.getById(id as string),
    { revalidateOnFocus: false },
  );

  return { stylist: data ?? null, isLoading, isError: !!error, error };
}

export function useStylistReviews(id: string | null | undefined, params: ListReviewsParams = {}) {
  const { data, error, isLoading, mutate } = useSWR<StylistReviewsResult>(
    id ? ["stylist-reviews", id, params] : null,
    () => stylistsApi.listReviews(id as string, params),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return {
    reviews: data?.items ?? [],
    ratingsSummary: data?.ratingsSummary,
    meta: data?.meta,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useAvailability(
  id: string | null | undefined,
  params: AvailabilityParams = {},
) {
  const { data, error, isLoading, mutate } = useSWR<AvailabilityResult>(
    id ? ["availability", id, params] : null,
    () => stylistsApi.getAvailability(id as string, params),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return {
    availability: data ?? null,
    slots: data?.slots ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
