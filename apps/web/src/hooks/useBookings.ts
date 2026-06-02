import useSWR from "swr";
import type { BookingDTO, MyBookingsResult } from "@glamly/shared";
import { bookingsApi, type ListBookingsParams } from "@/lib/api";

// Role-aware "my bookings": the API returns the customer's bookings for a USER
// and the storefront's bookings for a STYLIST, tagged with `view`. Gated on
// `enabled` so it only fetches once the caller knows the user is authenticated.

export function useMyBookings(params: ListBookingsParams = {}, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MyBookingsResult>(
    enabled ? ["my-bookings", params] : null,
    () => bookingsApi.listMine(params),
    { keepPreviousData: true, revalidateOnFocus: true },
  );

  return {
    bookings: data?.items ?? [],
    meta: data?.meta,
    view: data?.view,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useBooking(id: string | null | undefined, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<BookingDTO>(
    id && enabled ? ["booking", id] : null,
    () => bookingsApi.getById(id as string),
    { revalidateOnFocus: true },
  );

  return { booking: data ?? null, isLoading, isError: !!error, error, mutate };
}
