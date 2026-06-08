import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/auth.repository", () => ({
  authRepository: {
    purgeExpiredRefreshTokens: vi.fn(),
    purgeExpiredPasswordResets: vi.fn(),
  },
}));

import { runCleanTokens } from "./cleanTokens";
import { authRepository } from "../repositories/auth.repository";

beforeEach(() => {
  vi.clearAllMocks();
  // Default both purges to 0 so each test only sets what it asserts on.
  vi.mocked(authRepository.purgeExpiredRefreshTokens).mockResolvedValue(0);
  vi.mocked(authRepository.purgeExpiredPasswordResets).mockResolvedValue(0);
});

describe("runCleanTokens", () => {
  it("reports the number of refresh tokens and password resets purged", async () => {
    vi.mocked(authRepository.purgeExpiredRefreshTokens).mockResolvedValue(7);
    vi.mocked(authRepository.purgeExpiredPasswordResets).mockResolvedValue(3);
    const now = new Date("2026-06-01T03:00:00Z");
    const result = await runCleanTokens(now);
    expect(result.purged).toBe(7);
    expect(result.purgedResets).toBe(3);
    expect(authRepository.purgeExpiredRefreshTokens).toHaveBeenCalledWith(now);
    expect(authRepository.purgeExpiredPasswordResets).toHaveBeenCalledWith(now);
  });

  it("returns 0 and swallows a failure", async () => {
    vi.mocked(authRepository.purgeExpiredRefreshTokens).mockRejectedValue(new Error("db down"));
    const result = await runCleanTokens();
    expect(result.purged).toBe(0);
    expect(result.purgedResets).toBe(0);
  });
});
