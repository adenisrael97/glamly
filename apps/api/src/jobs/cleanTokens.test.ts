import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/auth.repository", () => ({
  authRepository: { purgeExpiredRefreshTokens: vi.fn() },
}));

import { runCleanTokens } from "./cleanTokens";
import { authRepository } from "../repositories/auth.repository";

beforeEach(() => vi.clearAllMocks());

describe("runCleanTokens", () => {
  it("reports the number of tokens purged", async () => {
    vi.mocked(authRepository.purgeExpiredRefreshTokens).mockResolvedValue(7);
    const result = await runCleanTokens(new Date("2026-06-01T03:00:00Z"));
    expect(result.purged).toBe(7);
    expect(authRepository.purgeExpiredRefreshTokens).toHaveBeenCalledWith(
      new Date("2026-06-01T03:00:00Z"),
    );
  });

  it("returns 0 and swallows a failure", async () => {
    vi.mocked(authRepository.purgeExpiredRefreshTokens).mockRejectedValue(new Error("db down"));
    const result = await runCleanTokens();
    expect(result.purged).toBe(0);
  });
});
