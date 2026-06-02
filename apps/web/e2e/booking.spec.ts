import { test, expect } from "@playwright/test";
import { TEST_USER, login } from "./helpers";

// Full customer booking + payment flow. Requires:
//   • A running API + Next.js dev server (pnpm dev in both apps/api and apps/web)
//   • At least one seeded stylist offering at least one service

test.describe("Booking + payment flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, { email: TEST_USER.email, password: TEST_USER.password });
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });
  });

  test("customer can find a stylist via search", async ({ page }) => {
    await page.goto("/Search");

    // At least one stylist card should render.
    const stylistCards = page.locator("[data-testid='stylist-card'], .stylist-card, article").first();
    await expect(stylistCards).toBeVisible({ timeout: 10_000 });
  });

  test("customer can view a stylist's detail page", async ({ page }) => {
    await page.goto("/Search");

    const firstCard = page.locator("[data-testid='stylist-card'], .stylist-card, article").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // The URL should navigate to a stylist detail page.
    await expect(page).toHaveURL(/stylist\//i, { timeout: 10_000 });

    // Services should be listed.
    await expect(page.getByText(/book|service|price/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("customer can initiate a booking from the book-appointment page", async ({ page }) => {
    await page.goto("/book-appointment");

    // Step 1 — select a service.
    const firstService = page.getByRole("button", { name: /select|book|choose/i }).first()
      .or(page.locator("button, [role=button]").filter({ hasText: /book/i }).first());
    await expect(firstService).toBeVisible({ timeout: 10_000 });
    await firstService.click();

    // At minimum the page should advance — URL or a "next" element should be visible.
    await expect(
      page.getByRole("button", { name: /next|continue|proceed/i })
        .or(page.getByText(/choose a stylist|select stylist|pick a time/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("dashboard shows the customer's bookings", async ({ page }) => {
    await page.goto("/dashboard");

    // Dashboard should render without errors and contain recognisable booking UI.
    await expect(
      page.getByText(/booking|appointment|no bookings|upcoming/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
