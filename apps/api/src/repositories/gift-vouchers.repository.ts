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

  /**
   * Atomically claim a voucher for redemption: flip isRedeemed false→true only if
   * it is still unredeemed. Returns true if THIS call won the claim — so two
   * concurrent redemptions can never both proceed to create a booking (§11).
   */
  async claimForRedemption(id: string): Promise<boolean> {
    const res = await prisma.giftVoucher.updateMany({
      where: { id, isRedeemed: false },
      data: { isRedeemed: true, redeemedAt: new Date() },
    });
    return res.count === 1;
  },

  /** Undo a claim when the follow-on booking creation fails, so the voucher stays usable. */
  async releaseRedemption(id: string): Promise<void> {
    await prisma.giftVoucher.updateMany({
      where: { id, isRedeemed: true },
      data: { isRedeemed: false, redeemedAt: null },
    });
  },

  async findById(id: string) {
    return prisma.giftVoucher.findUnique({ where: { id }, include: voucherInclude });
  },
};
