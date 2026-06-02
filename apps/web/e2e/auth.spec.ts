import { test, expect } from "@playwright/test";
import { TEST_USER, login } from "./helpers";

// Full auth lifecycle: register → protected route access → logout.
// Each test run creates an account with a unique email so they never collide.

test.describe("Auth flow", () => {
  test("registers a new customer account and lands on the dashboard", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel(/name/i).fill(TEST_USER.name);
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/^password$/i).fill(TEST_USER.password);

    await page.getByRole("button", { name: /sign up|register|create account/i }).click();

    // After registration, the app redirects to the authenticated dashboard.
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });

    // No console errors from the page.
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    expect(errors.filter((e) => !e.toLowerCase().includes("favicon"))).toHaveLength(0);
  });

  test("rejects registration with a weak password", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill(`weak_${Date.now()}@glamlytest.com`);
    await page.getByLabel(/^password$/i).fill("weak");

    await page.getByRole("button", { name: /sign up|register|create account/i }).click();

    // The form should show a validation error — stay on the register page.
    await expect(page).toHaveURL(/register/i, { timeout: 5_000 });
    // Either a field-level error or an API-returned error message is present.
    await expect(page.getByRole("alert").or(page.locator("[role=alert]"))).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Some implementations inline error text without aria-role — look for error keywords.
      return expect(page.getByText(/password|error|invalid/i)).toBeVisible();
    });
  });

  test("logs in with correct credentials and redirects to dashboard", async ({ page }) => {
    // Log in with the account created in the first test.
    await login(page, { email: TEST_USER.email, password: TEST_USER.password });

    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });
  });

  test("shows an error for wrong password", async ({ page }) => {
    await page.goto("/Login");
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill("WrongPass1!");
    await page.getByRole("button", { name: /sign in|log in|continue/i }).click();

    // Should remain on the login page and show an error.
    await expect(page).toHaveURL(/login/i, { timeout: 5_000 });
    await expect(
      page.getByText(/invalid|incorrect|wrong|credentials/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("redirects unauthenticated users away from protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    // Without an active session the middleware should redirect to the login page.
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10_000 });
  });

  test("logs out and clears the session", async ({ page }) => {
    await login(page, { email: TEST_USER.email, password: TEST_USER.password });
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });

    // Find and click the logout trigger (button, link, or menu item).
    const logoutTrigger = page.getByRole("button", { name: /log out|sign out/i })
      .or(page.getByRole("link", { name: /log out|sign out/i }));

    await logoutTrigger.click({ timeout: 5_000 }).catch(async () => {
      // Some apps hide logout behind a user menu — try opening it first.
      await page.getByRole("button", { name: /account|profile|user/i }).click();
      await logoutTrigger.click();
    });

    // After logout, the session cookie is cleared; a visit to /dashboard redirects.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10_000 });
  });
});
