import type { CreateGiftVoucherInput, RedeemGiftVoucherInput } from "@glamly/shared";
import { ERROR_CODES } from "@glamly/shared";
import { giftVouchersRepository } from "../repositories/gift-vouchers.repository";
import { servicesRepository } from "../repositories/services.repository";
import { bookingsService } from "./bookings.service";
import { AppError, NotFoundError } from "../errors/AppError";

export const giftVouchersService = {
  async create(userId: string, input: CreateGiftVoucherInput) {
    // Validate all serviceIds exist and are active in ONE query (no N+1). The
    // count check also rejects duplicate ids (findMany dedupes by id).
    const services = await servicesRepository.findManyByIds(input.serviceIds);
    if (services.length !== input.serviceIds.length) {
      throw new AppError("One or more services not found or inactive", 422, ERROR_CODES.VALIDATION_ERROR);
    }

    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

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

    // Atomically claim the voucher BEFORE creating the booking so two concurrent
    // redemptions can never both succeed (§11). The fast-path check above is just a
    // friendly early error; this guarded claim is the authoritative one-redeem gate.
    const claimed = await giftVouchersRepository.claimForRedemption(voucher.id);
    if (!claimed) {
      throw new AppError(
        "This gift voucher has already been redeemed",
        409,
        ERROR_CODES.GIFT_VOUCHER_ALREADY_REDEEMED,
      );
    }

    const serviceIds = voucher.services.map((s) => s.serviceId);

    // Create the booking using the gift voucher's services. If it fails (e.g. the
    // slot is taken or the stylist isn't approved), release the claim so the
    // voucher remains usable — the customer isn't charged a voucher for nothing.
    let booking;
    try {
      ({ booking } = await bookingsService.create(
        { userId, role: "USER" },
        {
          stylistId: input.stylistId,
          serviceIds,
          startTime: input.startTime,
          notes: input.notes,
        },
      ));
    } catch (err) {
      await giftVouchersRepository.releaseRedemption(voucher.id);
      throw err;
    }

    // Re-read the now-redeemed voucher (with its service includes) for the response.
    const redeemed = await giftVouchersRepository.findById(voucher.id);

    return { booking, voucher: redeemed };
  },
};
