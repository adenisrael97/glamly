import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  type CreatePackageInput,
  type UpdatePackageInput,
} from "@glamly/shared";
import { stylistsRepository } from "../repositories/stylists.repository";
import { servicesRepository } from "../repositories/services.repository";
import { packagesRepository } from "../repositories/packages.repository";
import { authRepository } from "../repositories/auth.repository";
import { AppError, NotFoundError } from "../errors/AppError";
import { ERROR_CODES } from "@glamly/shared";
import {
  cloudinary,
  publicIdFromUrl,
  UploadFailedError,
  UploadNotConfiguredError,
} from "../integrations/cloudinary";

const MAX_PORTFOLIO_IMAGES = 20;

function clamp(page?: number, limit?: number) {
  return {
    page: Math.max(1, page ?? 1),
    limit: Math.min(Math.max(1, limit ?? PAGINATION_DEFAULT_PAGE_SIZE), PAGINATION_MAX_PAGE_SIZE),
  };
}

async function requireStylist(userId: string) {
  const stylist = await stylistsRepository.findByUserId(userId);
  if (!stylist) throw new NotFoundError("Stylist profile not found");
  return stylist;
}

async function requireOwnedService(serviceId: string, stylistId: string) {
  const svc = await servicesRepository.findByIdForStylist(serviceId, stylistId);
  if (!svc) throw new NotFoundError("Service not found");
  return svc;
}

async function requireOwnedPackage(packageId: string, stylistId: string) {
  const pkg = await packagesRepository.findById(packageId);
  if (!pkg || pkg.stylistId !== stylistId) throw new NotFoundError("Package not found");
  return pkg;
}

/**
 * Flatten a package's nested PackageService join rows to a plain service[] so the
 * shape matches the shared PackageDTO (services: StylistServiceSummary[]).
 */
function flattenPackage<T extends { services: { service: unknown }[] }>(pkg: T) {
  const { services, ...rest } = pkg;
  return { ...rest, services: services.map((ps) => ps.service) };
}

export const stylistMeService = {
  // ─── Services ─────────────────────────────────────────────────────────────────

  async listServices(userId: string, page?: number, limit?: number) {
    const { page: p, limit: l } = clamp(page, limit);
    const stylist = await requireStylist(userId);
    const { items, total } = await servicesRepository.listForStylist(stylist.id, p, l);
    return { items, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async createService(
    userId: string,
    data: {
      name: string;
      category: string;
      description?: string;
      price: number;
      duration: number;
      imageUrl?: string;
    },
  ) {
    const stylist = await requireStylist(userId);
    return servicesRepository.createForStylist({ stylistId: stylist.id, ...data });
  },

  async updateService(userId: string, serviceId: string, data: Record<string, unknown>) {
    const stylist = await requireStylist(userId);
    await requireOwnedService(serviceId, stylist.id);
    return servicesRepository.updateForStylist(serviceId, data as Parameters<typeof servicesRepository.updateForStylist>[1]);
  },

  async deactivateService(userId: string, serviceId: string) {
    const stylist = await requireStylist(userId);
    await requireOwnedService(serviceId, stylist.id);
    return servicesRepository.deactivate(serviceId);
  },

  // ─── Packages ─────────────────────────────────────────────────────────────────

  async listPackages(userId: string, page?: number, limit?: number) {
    const { page: p, limit: l } = clamp(page, limit);
    const stylist = await requireStylist(userId);
    const { items, total } = await packagesRepository.findManyByStylist({ stylistId: stylist.id, page: p, limit: l });
    return { items: items.map(flattenPackage), meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async createPackage(userId: string, input: CreatePackageInput) {
    const stylist = await requireStylist(userId);
    // Validate all serviceIds belong to this stylist
    const services = await servicesRepository.findAllByIdsForStylist(input.serviceIds, stylist.id);
    if (services.length !== input.serviceIds.length) {
      throw new AppError("One or more services not found for this stylist", 422, ERROR_CODES.VALIDATION_ERROR);
    }
    return flattenPackage(await packagesRepository.create({ stylistId: stylist.id, ...input }));
  },

  async updatePackage(userId: string, packageId: string, input: UpdatePackageInput) {
    const stylist = await requireStylist(userId);
    await requireOwnedPackage(packageId, stylist.id);

    if (input.serviceIds) {
      const services = await servicesRepository.findAllByIdsForStylist(input.serviceIds, stylist.id);
      if (services.length !== input.serviceIds.length) {
        throw new AppError("One or more services not found for this stylist", 422, ERROR_CODES.VALIDATION_ERROR);
      }
    }

    return flattenPackage(await packagesRepository.update(packageId, input));
  },

  async deactivatePackage(userId: string, packageId: string) {
    const stylist = await requireStylist(userId);
    await requireOwnedPackage(packageId, stylist.id);
    return flattenPackage(await packagesRepository.deactivate(packageId));
  },

  // ─── Avatar ───────────────────────────────────────────────────────────────────

  /**
   * Upload and persist a new avatar for the stylist's storefront.
   * Both the stylist record and the underlying user record are updated so the
   * avatar is consistent across both the public storefront and the auth profile.
   */
  async uploadAvatar(userId: string, buffer: Buffer): Promise<{ avatarUrl: string }> {
    if (!cloudinary.isConfigured()) throw new UploadNotConfiguredError();

    const stylist = await requireStylist(userId);
    // Prefer the Stylist avatarUrl as the "old" asset to delete (it is the one we
    // manage), falling back to the User record's URL.
    const oldUrl = stylist.avatarUrl ?? null;
    const result = await cloudinary.upload(buffer, "avatar", oldUrl);

    if (result.status === "not_configured") throw new UploadNotConfiguredError();
    if (result.status === "failed") throw new UploadFailedError(result.error);

    // Update BOTH records: Stylist.avatarUrl (storefront) and User.avatarUrl
    // (AuthUser). The User record is what AuthContext reads via toAuthUser(), so
    // both must be in sync or the avatar reverts to the initials placeholder on
    // any hard reload / session refresh.
    await Promise.all([
      stylistsRepository.updateAvatar(stylist.id, result.url),
      authRepository.updateAvatar(userId, result.url),
    ]);

    return { avatarUrl: result.url };
  },

  // ─── Portfolio ────────────────────────────────────────────────────────────────

  /** Upload one portfolio image and append it to the stylist's portfolio array. */
  async addPortfolioImage(userId: string, buffer: Buffer): Promise<{ portfolioUrls: string[] }> {
    if (!cloudinary.isConfigured()) throw new UploadNotConfiguredError();

    const stylist = await requireStylist(userId);

    if (stylist.portfolioUrls.length >= MAX_PORTFOLIO_IMAGES) {
      throw new AppError(
        `Portfolio is full — remove an image before adding another (max ${MAX_PORTFOLIO_IMAGES})`,
        422,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const result = await cloudinary.upload(buffer, "portfolio");
    if (result.status === "not_configured") throw new UploadNotConfiguredError();
    if (result.status === "failed") throw new UploadFailedError(result.error);

    const portfolioUrls = await stylistsRepository.addPortfolioImage(stylist.id, result.url);
    return { portfolioUrls };
  },

  /**
   * Remove a portfolio image by URL. Deletes the asset from Cloudinary
   * best-effort (a Cloudinary failure does NOT prevent the DB update).
   */
  async removePortfolioImage(userId: string, url: string): Promise<{ portfolioUrls: string[] }> {
    const stylist = await requireStylist(userId);

    if (!stylist.portfolioUrls.includes(url)) {
      throw new NotFoundError("Image not found in portfolio");
    }

    // Remove from DB first — even if Cloudinary cleanup fails the user's gallery is correct.
    const portfolioUrls = await stylistsRepository.removePortfolioImage(stylist.id, url);

    // Best-effort Cloudinary cleanup.
    const publicId = publicIdFromUrl(url);
    if (publicId) {
      void cloudinary.delete(publicId);
    }

    return { portfolioUrls };
  },

  // ─── Profile ──────────────────────────────────────────────────────────────────

  /**
   * The stylist's own storefront profile, for the studio edit form. Returns the
   * editable storefront fields plus avatar/portfolio so the form can
   * pre-populate. The AuthUser projection deliberately omits these
   * storefront-only fields, so the studio fetches them through here.
   */
  async getProfile(userId: string): Promise<{
    bio: string | null;
    specialty: string;
    location: string;
    tags: string[];
    experience: number | null;
    isAvailable: boolean;
    avatarUrl: string | null;
    portfolioUrls: string[];
  }> {
    const stylist = await requireStylist(userId);
    return {
      bio: stylist.bio ?? null,
      specialty: stylist.specialty,
      location: stylist.location,
      tags: stylist.tags,
      experience: stylist.experience ?? null,
      isAvailable: stylist.isAvailable,
      avatarUrl: stylist.avatarUrl ?? null,
      portfolioUrls: stylist.portfolioUrls,
    };
  },

  async updateProfile(
    userId: string,
    data: {
      bio?: string;
      specialty?: string;
      location?: string;
      tags?: string[];
      experience?: number;
      isAvailable?: boolean;
    },
  ) {
    const stylist = await requireStylist(userId);
    return stylistsRepository.updateProfile(stylist.id, data);
  },
};
