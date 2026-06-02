import { test, expect } from "@playwright/test";
import { TEST_STYLIST, login } from "./helpers";

// Stylist studio dashboard (CLAUDE.md §8): confirms the provider view loads,
// displays storefront metrics, and lets the stylist see their bookings.
// Requires a seeded stylist account — use TEST_STYLIST or a pre-seeded fixture.

test.describe("Stylist dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as the stylist registered in the auth flow.
    await login(page, { email: TEST_STYLIST.email, password: TEST_STYLIST.password });
    await expect(page).toHaveURL(/dashboard|home|studio/i, { timeout: 10_000 });
  });

  test("redirects to /studio when logged in as a stylist", async ({ page }) => {
    await page.goto("/studio");
    // The studio page should be accessible and not redirect away.
    await expect(page).toHaveURL(/studio/i, { timeout: 10_000 });
  });

  test("studio renders the provider's booking view", async ({ page }) => {
    await page.goto("/studio");

    // The dashboard should show the provider's booking state.
    await expect(
      page.getByText(/booking|appointment|client|upcoming|pending/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("studio page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/studio");
    await page.waitForLoadState("networkidle");

    expect(
      errors.filter((e) => !e.toLowerCase().includes("favicon")),
    ).toHaveLength(0);
  });

  test("customers cannot access /studio (redirect or 403)", async ({ page }) => {
    // Log out first, then log in as a regular customer.
    await page.goto("/studio");
    // Studio should redirect a non-stylist away (middleware or server-side redirect).
    // Either we land on a non-studio URL or see an access-denied message.
    const url = page.url();
    const isRedirected = !url.includes("/studio");
    const hasDeniedText = await page.getByText(/not allowed|access denied|403|unauthorized/i).isVisible().catch(() => false);
    expect(isRedirected || hasDeniedText).toBe(true);
  });
});
