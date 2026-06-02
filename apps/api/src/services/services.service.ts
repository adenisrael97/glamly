import { servicesRepository } from "../repositories/services.repository";
import { NotFoundError } from "../errors/AppError";
import { PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from "@glamly/shared";

export interface ListServicesQuery {
  page?: number;
  limit?: number;
  category?: string;
  stylistId?: string;
}

export const servicesService = {
  async list(query: ListServicesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(
      Math.max(1, query.limit ?? PAGINATION_DEFAULT_PAGE_SIZE),
      PAGINATION_MAX_PAGE_SIZE,
    );

    const { items, total } = await servicesRepository.findMany({
      page,
      limit,
      category: query.category,
      stylistId: query.stylistId,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const service = await servicesRepository.findById(id);
    if (!service) throw new NotFoundError("Service not found");
    return service;
  },

  async getCategories() {
    return servicesRepository.findCategories();
  },
};
