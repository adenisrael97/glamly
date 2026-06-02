import { prisma } from "../lib/prisma";

const voucherInclude = {
  services: {
    select: {
      id: true,
      serviceId: true,
      service: {
        select: { id: true, name: true, category: true, price: true, duration: true, imageUrl: true },
      },
    },
  },
};

export const giftVouchersRepository = {
  async create(data: {
    purchasedById: string;
    serviceIds: string[];
    recipientName: string;
    recipientEmail: string;
    recipientPhone?: string;
    message?: string;
    totalAmount: number;
    expiresAt: Date;
  }) {
    return prisma.giftVoucher.create({
      data: {
        purchasedById: data.purchasedById,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        message: data.message,
        totalAmount: data.totalAmount,
        expiresAt: data.expiresAt,
        services: {
          create: data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: voucherInclude,
    });
  },

  async findByCode(code: string) {
    return prisma.giftVoucher.findUnique({ where: { code }, include: voucherInclude });
  },

  async markRedeemed(id: string) {
    return prisma.giftVoucher.update({
      where: { id },
      data: { isRedeemed: true, redeemedAt: new Date() },
      include: voucherInclude,
    });
  },
};
