// Barrel for the configured API client and typed endpoint modules. Import data
// access from here (or the individual modules) — never call fetch/axios directly.
export {
  client,
  ApiError,
  API_BASE_URL,
  unwrap,
  setAccessToken,
  getAccessToken,
  setAuthEvents,
  refreshSession,
} from "./client";
export { authApi } from "./auth";
export { stylistsApi } from "./stylists";
export type { ListStylistsParams, AvailabilityParams, ListReviewsParams } from "./stylists";
export { servicesApi } from "./services";
export type { ListServicesParams } from "./services";
export { bookingsApi } from "./bookings";
export type { ListBookingsParams } from "./bookings";
export { paymentsApi } from "./payments";
export { reviewsApi } from "./reviews";
export { stylistMeApi } from "./stylist-me";
export type { CreateServiceInput, UpdateServiceInput, CreatePackageInput, UpdatePackageInput, UpdateProfileInput } from "./stylist-me";
