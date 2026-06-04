import type { BookingDTO, PackageDTO, PaginatedResult, ServiceDTO } from "@glamly/shared";
import { client, unwrap } from "./client";

// Stylist self-management API — all endpoints require STYLIST role.
// The JWT carried by the axios client identifies which stylist is acting.

export interface CreateServiceInput {
  name: string;
  category: string;
  description?: string;
  price: number;
  duration: number;
  imageUrl?: string;
}

export interface UpdateServiceInput {
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  duration?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface CreatePackageInput {
  name: string;
  price: number;
  duration: number;
  serviceIds: string[];
  description?: string;
  imageUrl?: string;
}

export interface UpdatePackageInput {
  name?: string;
  price?: number;
  duration?: number;
  serviceIds?: string[];
  description?: string;
  isActive?: boolean;
}

export interface UpdateProfileInput {
  bio?: string;
  specialty?: string;
  location?: string;
  tags?: string[];
  experience?: number;
  isAvailable?: boolean;
}

/** The stylist's own storefront profile, as returned by GET /stylists/me/profile. */
export interface StylistProfile {
  bio: string | null;
  specialty: string;
  location: string;
  tags: string[];
  experience: number | null;
  isAvailable: boolean;
  avatarUrl: string | null;
  portfolioUrls: string[];
}

export const stylistMeApi = {
  // ─── Services ──────────────────────────────────────────────────────────────

  listServices(): Promise<PaginatedResult<ServiceDTO>> {
    return unwrap<PaginatedResult<ServiceDTO>>(client.get("/stylists/me/services"));
  },

  createService(input: CreateServiceInput): Promise<ServiceDTO> {
    return unwrap<ServiceDTO>(client.post("/stylists/me/services", input));
  },

  updateService(id: string, input: UpdateServiceInput): Promise<ServiceDTO> {
    return unwrap<ServiceDTO>(client.patch(`/stylists/me/services/${id}`, input));
  },

  deactivateService(id: string): Promise<{ id: string; isActive: boolean }> {
    return unwrap<{ id: string; isActive: boolean }>(client.delete(`/stylists/me/services/${id}`));
  },

  // ─── Packages ──────────────────────────────────────────────────────────────

  listPackages(): Promise<PaginatedResult<PackageDTO>> {
    return unwrap<PaginatedResult<PackageDTO>>(client.get("/stylists/me/packages"));
  },

  createPackage(input: CreatePackageInput): Promise<PackageDTO> {
    return unwrap<PackageDTO>(client.post("/stylists/me/packages", input));
  },

  updatePackage(id: string, input: UpdatePackageInput): Promise<PackageDTO> {
    return unwrap<PackageDTO>(client.patch(`/stylists/me/packages/${id}`, input));
  },

  deactivatePackage(id: string): Promise<{ id: string; isActive: boolean }> {
    return unwrap<{ id: string; isActive: boolean }>(client.delete(`/stylists/me/packages/${id}`));
  },

  // ─── Profile ───────────────────────────────────────────────────────────────

  getProfile(): Promise<StylistProfile> {
    return unwrap<StylistProfile>(client.get("/stylists/me/profile"));
  },

  updateProfile(input: UpdateProfileInput): Promise<{ isAvailable: boolean }> {
    return unwrap<{ isAvailable: boolean }>(client.patch("/stylists/me/profile", input));
  },

  // ─── Avatar ────────────────────────────────────────────────────────────────

  uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const form = new FormData();
    form.append("file", file);
    return unwrap<{ avatarUrl: string }>(
      client.post("/stylists/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  // ─── Portfolio ─────────────────────────────────────────────────────────────

  addPortfolioImage(file: File): Promise<{ portfolioUrls: string[] }> {
    const form = new FormData();
    form.append("file", file);
    return unwrap<{ portfolioUrls: string[] }>(
      client.post("/stylists/me/portfolio", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  removePortfolioImage(url: string): Promise<{ portfolioUrls: string[] }> {
    return unwrap<{ portfolioUrls: string[] }>(
      client.delete("/stylists/me/portfolio", { data: { url } }),
    );
  },

  // ─── Booking actions (provider side) ──────────────────────────────────────

  completeBooking(id: string): Promise<BookingDTO> {
    return unwrap<BookingDTO>(client.patch(`/bookings/${id}/complete`));
  },
};
