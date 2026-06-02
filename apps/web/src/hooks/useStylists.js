import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

/**
 * Fetches a paginated, filtered list of stylists from the mock API.
 *
 * @param {{
 *   query?: string,
 *   location?: string,
 *   service?: string,
 *   minRating?: number,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   availableOnly?: boolean,
 *   sortBy?: string,
 *   page?: number,
 *   pageSize?: number,
 * }} params
 */
export function useStylists(params = {}) {
  const search = new URLSearchParams();

  if (params.query)        search.set("q",            params.query);
  if (params.location)     search.set("location",     params.location);
  if (params.service)      search.set("service",      params.service);
  if (params.minRating)    search.set("minRating",    String(params.minRating));
  if (params.minPrice)     search.set("minPrice",     String(params.minPrice));
  if (params.maxPrice && params.maxPrice < 999999)
                           search.set("maxPrice",     String(params.maxPrice));
  if (params.availableOnly) search.set("availableOnly", "true");
  if (params.sortBy)       search.set("sortBy",       params.sortBy);
  if (params.page)         search.set("page",         String(params.page));
  if (params.pageSize)     search.set("pageSize",     String(params.pageSize));

  const key = `/api/stylists?${search.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,   // no flash when filters change
    revalidateOnFocus: false, // stale-while-revalidate is enough for static data
    dedupingInterval: 5000,
  });

  return {
    stylists:   data?.data ?? [],
    meta:       data?.meta ?? { total: 0, page: 1, pageSize: 6, totalPages: 1 },
    isLoading,
    isError:    !!error,
    error,
    mutate,
  };
}

/**
 * Fetches a single stylist by ID.
 * @param {number|string|null} id
 */
export function useStylist(id) {
  const { data, error, isLoading } = useSWR(
    id != null ? `/api/stylists/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    stylist:  data?.data ?? null,
    isLoading,
    isError:  !!error,
    error,
  };
}
