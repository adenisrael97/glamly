import type {
  AuthResult,
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "@glamly/shared";
import { client, unwrap, setAccessToken } from "./client";

// Auth endpoints. The access token returned here is held in memory by the client
// (and mirrored into AuthContext); the refresh token rides the httpOnly cookie
// set by the API, so it never appears in these payloads.

export const authApi = {
  register(input: RegisterInput): Promise<AuthResult> {
    return unwrap<AuthResult>(client.post("/auth/register", input));
  },

  login(input: LoginInput): Promise<AuthResult> {
    return unwrap<AuthResult>(client.post("/auth/login", input));
  },

  async logout(): Promise<void> {
    await client.post("/auth/logout");
    setAccessToken(null);
  },

  me(): Promise<AuthUser> {
    return unwrap<AuthUser>(client.get("/auth/me"));
  },

  updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    return unwrap<AuthUser>(client.patch("/auth/me", input));
  },

  /** Change the signed-in user's password (verifies the current one server-side). */
  changePassword(input: ChangePasswordInput): Promise<void> {
    return unwrap<void>(client.post("/auth/me/password", input));
  },

  /**
   * Upload a new avatar for the authenticated user.
   * Sends multipart/form-data; Axios detects FormData and sets the correct
   * Content-Type header (including the multipart boundary) automatically.
   */
  uploadAvatar(file: File): Promise<AuthUser> {
    const form = new FormData();
    form.append("file", file);
    return unwrap<AuthUser>(
      client.post("/auth/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  /** Request a password reset email. Always resolves (server never reveals if email exists). */
  forgotPassword(input: ForgotPasswordInput): Promise<void> {
    return unwrap<void>(client.post("/auth/forgot-password", input));
  },

  /** Validate a reset token before showing the reset form. */
  validateResetToken(token: string): Promise<{ valid: boolean; maskedEmail?: string }> {
    return unwrap<{ valid: boolean; maskedEmail?: string }>(
      client.get("/auth/reset-password", { params: { token } }),
    );
  },

  /** Consume a reset token and set the new password. */
  resetPassword(input: ResetPasswordInput): Promise<void> {
    return unwrap<void>(client.post("/auth/reset-password", input));
  },
};
