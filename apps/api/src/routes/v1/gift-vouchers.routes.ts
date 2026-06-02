import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { sendSuccess, sendCreated } from "../../lib/apiResponse";
import { giftVouchersService } from "../../services/gift-vouchers.service";
import {
  createGiftVoucherSchema,
  redeemGiftVoucherSchema,
  giftVoucherCodeParamSchema,
} from "@glamly/shared";

const router = Router();

// Create a gift voucher (authenticated)
router.post(
  "/",
  authenticate,
  validateBody(createGiftVoucherSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const voucher = await giftVouchersService.create(req.user!.id, req.body);
    sendCreated(res, voucher, "Gift voucher created");
  }),
);

// Check voucher validity (public — no auth needed)
router.get(
  "/:code",
  validateParams(giftVoucherCodeParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const voucher = await giftVouchersService.getByCode(req.params.code);
    sendSuccess(res, voucher, "Gift voucher retrieved");
  }),
);

// Redeem a voucher (authenticated)
router.post(
  "/:code/redeem",
  authenticate,
  validateParams(giftVoucherCodeParamSchema),
  validateBody(redeemGiftVoucherSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await giftVouchersService.redeem(req.user!.id, req.params.code, req.body);
    sendCreated(res, result, "Gift voucher redeemed and booking created");
  }),
);

export default router;
