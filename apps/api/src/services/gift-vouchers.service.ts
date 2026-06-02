import { PAGINATION_DEFAULT_PAGE_SIZE } from "@glamly/shared";
import type { CreateGiftVoucherInput, RedeemGiftVoucherInput } from "@glamly/shared";
import { giftVouchersRepository } from "../repositories/gift-vouchers.repository";
import { servicesRepository } from "../repositories/services.repository";
import { bookingsService } from "./bookings.service";
import { AppError, NotFoundError } from "../errors/AppError";
import { ERROR_CODES } from "@glamly/shared";
import { isValidSlotStart } from "@glamly/shared";

export const giftVouchersService = {
  async create(userId: string, input: CreateGiftVoucherInput) {
    // Validate all serviceIds exist and are active
    const services = await Promise.all(
      input.serviceIds.map((id) => servicesRepository.findById(id))
    );
    const missing = services.filter((s) => !s);
    if (missing.length > 0) {
      throw new AppError("One or more services not found or inactive", 422, ERROR_CODES.VALIDATION_ERROR);
    }

    const validServices = services.filter(Boolean) as NonNullable<typeof services[number]>[];
    const totalAmount = validServices.reduce((sum, s) => sum + s.price, 0);

    // Vouchers expire 90 days from purchase
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return giftVouchersRepository.create({
      purchasedById: userId,
      serviceIds: input.serviceIds,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,
      message: input.message,
      totalAmount,
      expiresAt,
    });
  },

  async getByCode(code: string) {
    const voucher = await giftVouchersRepository.findByCode(code);
    if (!voucher) throw new NotFoundError("Gift voucher not found");
    return voucher;
  },

  async redeem(userId: string, code: string, input: RedeemGiftVoucherInput) {
    const voucher = await giftVouchersRepository.findByCode(code);
    if (!voucher) throw new NotFoundError("Gift voucher not found");

    if (voucher.isRedeemed) {
      throw new AppError(
        "This gift voucher has already been redeemed",
        409,
        ERROR_CODES.GIFT_VOUCHER_ALREADY_REDEEMED,
      );
    }

    if (new Date() > voucher.expiresAt) {
      throw new AppError("This gift voucher has expired", 410, ERROR_CODES.GIFT_VOUCHER_EXPIRED);
    }

    const serviceIds = voucher.services.map((s) => s.serviceId);

    // Create the booking using the gift voucher's services
    const { booking } = await bookingsService.create(
      { userId, role: "USER" },
      {
        stylistId: input.stylistId,
        serviceIds,
        startTime: input.startTime,
        notes: input.notes,
      },
    );

    // Mark voucher redeemed after booking succeeds (post-tx, §11)
    const redeemed = await giftVouchersRepository.markRedeemed(voucher.id);

    return { booking, voucher: redeemed };
  },
};
