import { describe, it, expect } from "vitest";

// This test intentionally fails to verify that CI blocks PRs on red.
// Delete this file — do NOT merge it.
describe("CI gate", () => {
  it("INTENTIONAL FAILURE — CI must block this PR", () => {
    expect(true).toBe(false);
  });
});
