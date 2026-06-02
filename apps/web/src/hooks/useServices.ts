import useSWR from "swr";
import { servicesApi, type ListServicesParams } from "@/lib/api";

export function useServices(params: ListServicesParams = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ["services", params],
    () => servicesApi.list(params),
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    services: data?.items ?? [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useServiceCategories() {
  const { data, error, isLoading } = useSWR<string[]>(
    "service-categories",
    () => servicesApi.getCategories(),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return { categories: data ?? [], isLoading, isError: !!error, error };
}
