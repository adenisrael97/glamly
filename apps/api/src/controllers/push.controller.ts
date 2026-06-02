import { Request, Response } from "express";
import type { PushSubscriptionInput, PushUnsubscribeInput } from "@glamly/shared";
import { pushService } from "../services/push.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendCreated, sendSuccess } from "../lib/apiResponse";
import { requireActor } from "../lib/requestContext";

export const pushController = {
  // The VAPID public key is non-secret by design — the browser needs it to build
  // a subscription. Returned to any authenticated user.
  vapidPublicKey: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, pushService.getVapidPublicKey(), "VAPID public key");
  }),

  subscribe: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    await pushService.subscribe(actor.userId, req.body as PushSubscriptionInput);
    sendCreated(res, { subscribed: true }, "Push subscription registered");
  }),

  unsubscribe: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { endpoint } = req.body as PushUnsubscribeInput;
    await pushService.unsubscribe(actor.userId, endpoint);
    sendSuccess(res, { unsubscribed: true }, "Push subscription removed");
  }),
};
