import type { AuthResult, AuthUser, LoginInput, RegisterInput } from "@glamly/shared";
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
};
