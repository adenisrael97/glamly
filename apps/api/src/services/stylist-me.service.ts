import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  type CreatePackageInput,
  type UpdatePackageInput,
} from "@glamly/shared";
import { stylistsRepository } from "../repositories/stylists.repository";
import { servicesRepository } from "../repositories/services.repository";
import { packagesRepository } from "../repositories/packages.repository";
import { AppError, NotFoundError } from "../errors/AppError";
import { ERROR_CODES } from "@glamly/shared";

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

  // ─── Profile ──────────────────────────────────────────────────────────────────

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
