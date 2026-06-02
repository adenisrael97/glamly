import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const packageInclude = {
  services: {
    select: {
      id: true,
      serviceId: true,
      service: {
        select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true },
      },
    },
  },
} satisfies Prisma.PackageInclude;

export const packagesRepository = {
  async findManyByStylist(params: { stylistId: string; activeOnly?: boolean; page: number; limit: number }) {
    const where: Prisma.PackageWhereInput = { stylistId: params.stylistId };
    if (params.activeOnly) where.isActive = true;

    const [items, total] = await prisma.$transaction([
      prisma.package.findMany({
        where,
        include: packageInclude,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.package.count({ where }),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.package.findUnique({ where: { id }, include: packageInclude });
  },

  async create(data: {
    stylistId: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
    serviceIds: string[];
    imageUrl?: string;
  }) {
    return prisma.package.create({
      data: {
        stylistId: data.stylistId,
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        imageUrl: data.imageUrl,
        services: {
          create: data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: packageInclude,
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      duration?: number;
      serviceIds?: string[];
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.serviceIds !== undefined) {
        await tx.packageService.deleteMany({ where: { packageId: id } });
      }

      return tx.package.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.duration !== undefined ? { duration: data.duration } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.serviceIds !== undefined
            ? { services: { create: data.serviceIds.map((sid) => ({ serviceId: sid })) } }
            : {}),
        },
        include: packageInclude,
      });
    });
  },

  async deactivate(id: string) {
    return prisma.package.update({
      where: { id },
      data: { isActive: false },
      include: packageInclude,
    });
  },
};
