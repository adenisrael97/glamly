// The form-validation helpers now live in @glamly/shared so the same rules run on
// both web and api (CLAUDE.md §4: one schema, shared FE + BE). This module
// re-exports them so existing `@/lib/validation` imports keep working; prefer
// importing from "@glamly/shared" directly in new code.
export {
  EMAIL_RE,
  PHONE_RE,
  validateBookingStep,
  validateLogin,
  validateRegister,
  validateGiftService,
  passwordStrength,
} from "@glamly/shared";
