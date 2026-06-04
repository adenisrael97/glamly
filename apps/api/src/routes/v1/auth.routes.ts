import { Router } from "express";
import { Request, Response } from "express";
import { loginSchema, registerSchema, updateProfileSchema } from "@glamly/shared";
import { authController } from "../../controllers/auth.controller";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { uploadAvatar } from "../../middleware/upload";
import { asyncHandler } from "../../middleware/asyncHandler";
import { authService } from "../../services/auth.service";
import { sendSuccess } from "../../lib/apiResponse";
import { ValidationError } from "../../errors/AppError";

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

// Avatar upload — multipart/form-data with field "file" (JPEG/PNG/WebP, ≤ 5 MB).
// Multer is applied inline (not as route-level middleware) so its errors flow through
// the global errorHandler rather than Express's default error emitter.
router.post(
  "/me/avatar",
  authenticate,
  (req: Request, res: Response, next: (err?: unknown) => void) => {
    uploadAvatar(req, res as never, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new ValidationError("No file provided — attach an image as field 'file'");
    const user = await authService.uploadAvatar(req.user!.id, req.file.buffer, {
      ipAddress: req.ip,
    });
    sendSuccess(res, user, "Avatar updated successfully");
  }),
);

export default router;
