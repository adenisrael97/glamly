import { z } from "zod";

const PHONE_RE = /^[\d\s+\-()\\.]{7,20}$/;

export const createGiftVoucherSchema = z.object({
  serviceIds: z.array(z.string().cuid()).min(1).max(10),
  recipientName: z.string().trim().min(1).max(120),
  recipientEmail: z.string().email(),
  recipientPhone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number").optional(),
  message: z.string().trim().max(500).optional(),
  // Optional stylistId to restrict the voucher to a specific stylist's services.
  stylistId: z.string().cuid().optional(),
});
export type CreateGiftVoucherInput = z.infer<typeof createGiftVoucherSchema>;

export const redeemGiftVoucherSchema = z.object({
  // The booking details to create when redeeming
  stylistId: z.string().cuid(),
  startTime: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional(),
});
export type RedeemGiftVoucherInput = z.infer<typeof redeemGiftVoucherSchema>;

export const giftVoucherCodeParamSchema = z.object({
  code: z.string().min(1).max(200),
});
