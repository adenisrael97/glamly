import type { PaginatedResult, ServiceDTO } from "@glamly/shared";
import { client, unwrap } from "./client";

export interface ListServicesParams {
  page?: number;
  limit?: number;
  category?: string;
  stylistId?: string;
}

export const servicesApi = {
  list(params: ListServicesParams = {}): Promise<PaginatedResult<ServiceDTO>> {
    return unwrap<PaginatedResult<ServiceDTO>>(client.get("/services", { params }));
  },

  getById(id: string): Promise<ServiceDTO> {
    return unwrap<ServiceDTO>(client.get(`/services/${id}`));
  },

  getCategories(): Promise<string[]> {
    return unwrap<string[]>(client.get("/services/categories"));
  },
};
