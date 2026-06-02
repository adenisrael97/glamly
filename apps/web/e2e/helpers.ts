import { type Page, expect } from "@playwright/test";

// A unique run prefix so E2E tests use dedicated, never-overlapping accounts.
export const RUN = `e2e_${Date.now()}`;

export const TEST_USER = {
  name: "E2E Customer",
  email: `${RUN}_customer@glamlytest.com`,
  password: "Sup3rSecret",
  role: "user" as const,
};

export const TEST_STYLIST = {
  name: "E2E Stylist",
  email: `${RUN}_stylist@glamlytest.com`,
  password: "Sup3rSecret",
  phone: "+2348012345678",
  specialty: "Hair & Makeup",
  location: "Lagos",
  role: "stylist" as const,
};

/** Fill and submit the registration form. */
export async function registerUser(
  page: Page,
  user: typeof TEST_USER | typeof TEST_STYLIST,
): Promise<void> {
  const isStylist = user.role === "stylist";
  const path = isStylist ? "/register/stylist-register" : "/register";
  await page.goto(path);

  await page.getByLabel(/name/i).fill(user.name);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);

  if ("phone" in user) {
    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible()) await phoneField.fill(user.phone);
  }

  await page.getByRole("button", { name: /sign up|register|create account/i }).click();
}

/** Log in via the login page and wait for the dashboard to appear. */
export async function login(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto("/Login");
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
}

/** Assert no JS errors appeared on the page during this test. */
export async function assertNoConsoleErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
}
