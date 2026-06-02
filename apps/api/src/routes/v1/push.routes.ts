import { Router } from "express";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@glamly/shared";
import { pushController } from "../../controllers/push.controller";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

// Push subscription state is per-user and must never be cached by a proxy.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Every push route requires a signed-in user — subscriptions belong to an account.
router.use(authenticate);

router.get("/vapid-public-key", pushController.vapidPublicKey);
router.post("/subscribe", validateBody(pushSubscriptionSchema), pushController.subscribe);
router.delete("/subscribe", validateBody(pushUnsubscribeSchema), pushController.unsubscribe);

export default router;
