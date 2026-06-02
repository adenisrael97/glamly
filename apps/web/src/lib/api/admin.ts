import type { AxiosResponse } from "axios";
import { client } from "./client";

// Thin wrapper so callers can `as Promise<T>` the return values without
// dealing with AxiosResponse envelopes directly. The API always returns
// `{ success, data }` so we unwrap to `.data.data`.
function unwrapData<T>(res: AxiosResponse<{ data: T }>): T {
  return res.data.data;
}

export const adminApi = {
  // ─── Analytics ──────────────────────────────────────────────────────────────

  getAnalytics: () =>
    client.get<{ data: unknown }>("/admin/analytics").then(unwrapData),

  getPendingCount: () =>
    client.get<{ data: unknown }>("/admin/stylists/pending-count").then(unwrapData),

  // ─── Stylists ───────────────────────────────────────────────────────────────

  listStylists: (params?: Record<string, string | number>) =>
    client
      .get<{ data: unknown }>("/admin/stylists", { params })
      .then(unwrapData),

  getStylist: (id: string) =>
    client.get<{ data: unknown }>(`/admin/stylists/${id}`).then(unwrapData),

  updateStylistStatus: (id: string, body: { status: string; reason?: string }) =>
    client.patch<{ data: unknown }>(`/admin/stylists/${id}/status`, body).then(unwrapData),

  // ─── Users ──────────────────────────────────────────────────────────────────

  listUsers: (params?: Record<string, string | number>) =>
    client.get<{ data: unknown }>("/admin/users", { params }).then(unwrapData),

  getUser: (id: string) =>
    client.get<{ data: unknown }>(`/admin/users/${id}`).then(unwrapData),

  changeUserRole: (id: string, role: string) =>
    client.patch<{ data: unknown }>(`/admin/users/${id}/role`, { role }).then(unwrapData),

  deleteUser: (id: string) =>
    client.delete<{ data: unknown }>(`/admin/users/${id}`).then(unwrapData),

  // ─── Bookings ───────────────────────────────────────────────────────────────

  listBookings: (params?: Record<string, string | number>) =>
    client.get<{ data: unknown }>("/admin/bookings", { params }).then(unwrapData),

  getBooking: (id: string) =>
    client.get<{ data: unknown }>(`/admin/bookings/${id}`).then(unwrapData),

  // ─── Services ───────────────────────────────────────────────────────────────

  listServices: (params?: Record<string, string | number>) =>
    client.get<{ data: unknown }>("/admin/services", { params }).then(unwrapData),

  deactivateService: (id: string) =>
    client.delete<{ data: unknown }>(`/admin/services/${id}`).then(unwrapData),
};
