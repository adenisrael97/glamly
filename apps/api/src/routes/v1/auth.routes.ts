import { Router } from "express";
import { loginSchema, registerSchema, updateProfileSchema } from "@glamly/shared";
import { authController } from "../../controllers/auth.controller";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// Auth responses carry access tokens and PII. Forbid every cache layer (browser,
// proxy, CDN) from storing them — otherwise a shared cache could replay one
// user's token to another, and Express's default ETag would let the browser
// revalidate (304) and re-serve sensitive bodies.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Credential-accepting endpoints are rate-limited (§6) to blunt brute force.
router.post("/register", authRateLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);

// Refresh reads the httpOnly cookie (no body to validate). Rate-limited too so a
// stolen-cookie replay can't be hammered.
router.post("/refresh", authRateLimiter, authController.refresh);

// Logout is idempotent and safe; no rate limit needed.
router.post("/logout", authController.logout);

// Protected: requires a valid access token. Serves as the canonical "who am I".
router.get("/me", authenticate, authController.me);

// Self-service profile edit (name/phone/address). Validated at the boundary.
router.patch("/me", authenticate, validateBody(updateProfileSchema), authController.updateProfile);

export default router;
