import { prisma } from "../lib/prisma";

export interface ListServicesFilter {
  page: number;
  limit: number;
  category?: string;
  stylistId?: string;
}

const stylistSelect = {
  id: true,
  specialty: true,
  location: true,
  rating: true,
  reviewCount: true,
  isAvailable: true,
  user: { select: { name: true, avatarUrl: true } },
} as const;

export const servicesRepository = {
  async findMany({ page, limit, category, stylistId }: ListServicesFilter) {
    const where = {
      isActive: true,
      ...(category ? { category } : {}),
      ...(stylistId ? { stylistId } : {}),
      stylist: { deletedAt: null },
    };

    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        where,
        include: { stylist: { select: stylistSelect } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id: string) {
    return prisma.service.findFirst({
      where: { id, isActive: true, stylist: { deletedAt: null } },
      include: { stylist: { select: stylistSelect } },
    });
  },

  async findCategories(): Promise<string[]> {
    const rows = await prisma.service.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category);
  },

  // ─── Stylist self-management ──────────────────────────────────────────────────

  async listForStylist(stylistId: string, page: number, limit: number) {
    const where = { stylistId };
    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, category: true, description: true,
          price: true, duration: true, imageUrl: true, isActive: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  },

  async createForStylist(data: {
    stylistId: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    duration: number;
    imageUrl?: string;
  }) {
    return prisma.service.create({
      data,
      select: {
        id: true, name: true, category: true, description: true,
        price: true, duration: true, imageUrl: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
  },

  async updateForStylist(
    id: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      price?: number;
      duration?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    return prisma.service.update({
      where: { id },
      data,
      select: {
        id: true, name: true, category: true, description: true,
        price: true, duration: true, imageUrl: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
  },

  async deactivate(id: string) {
    return prisma.service.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  },

  async findByIdForStylist(id: string, stylistId: string) {
    return prisma.service.findFirst({ where: { id, stylistId } });
  },

  async findAllByIdsForStylist(ids: string[], stylistId: string) {
    return prisma.service.findMany({
      where: { id: { in: ids }, stylistId, isActive: true },
    });
  },
};
