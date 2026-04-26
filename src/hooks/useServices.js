import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

/**
 * Fetches paginated services from the mock API.
 *
 * @param {{
 *   category?: string,
 *   query?: string,
 *   page?: number,
 *   pageSize?: number,
 * }} params
 */
export function useServices(params = {}) {
  const search = new URLSearchParams();

  if (params.category && params.category !== "All")
    search.set("category", params.category);
  if (params.query)    search.set("q",        params.query);
  if (params.page)     search.set("page",     String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));

  const key = `/api/services?${search.toString()}`;

  const { data, error, isLoading } = useSWR(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    services:   data?.data ?? [],
    meta:       data?.meta ?? { total: 0, page: 1, pageSize: 8, totalPages: 1 },
    isLoading,
    isError:    !!error,
    error,
  };
}
