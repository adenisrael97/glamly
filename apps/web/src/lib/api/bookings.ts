import type {
  BookingDTO,
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  MyBookingsResult,
  RescheduleBookingInput,
} from "@glamly/shared";
import { client, unwrap } from "./client";

export type ListBookingsParams = Partial<ListBookingsQuery>;

export const bookingsApi = {
  create(input: CreateBookingInput): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.post("/bookings", input));
  },

  listMine(params: ListBookingsParams = {}): Promise<MyBookingsResult> {
    return unwrap<MyBookingsResult>(client.get("/bookings/me", { params }));
  },

  getById(id: string): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.get(`/bookings/${id}`));
  },

  cancel(id: string, input: CancelBookingInput = {}): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.patch(`/bookings/${id}/cancel`, input));
  },

  reschedule(id: string, input: RescheduleBookingInput): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.patch(`/bookings/${id}/reschedule`, input));
  },

  complete(id: string): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.patch(`/bookings/${id}/complete`));
  },
};
