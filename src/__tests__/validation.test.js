import { describe, it, expect } from "vitest";
import {
  validateBookingStep,
  validateLogin,
  validateRegister,
  validateGiftService,
  passwordStrength,
  EMAIL_RE,
  PHONE_RE,
} from "@/lib/validation";

// ── EMAIL_RE ─────────────────────────────────────────────────────────────────

describe("EMAIL_RE", () => {
  it("accepts standard email addresses", () => {
    expect(EMAIL_RE.test("user@example.com")).toBe(true);
    expect(EMAIL_RE.test("ada.okafor+test@domain.co.uk")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(EMAIL_RE.test("notanemail")).toBe(false);
    expect(EMAIL_RE.test("missing@domain")).toBe(false);
    expect(EMAIL_RE.test("@nodomain.com")).toBe(false);
  });
});

// ── PHONE_RE ─────────────────────────────────────────────────────────────────

describe("PHONE_RE", () => {
  it("accepts valid phone formats", () => {
    expect(PHONE_RE.test("+234 800 123 4567")).toBe(true);
    expect(PHONE_RE.test("08001234567")).toBe(true);
  });

  it("rejects strings that are too short", () => {
    expect(PHONE_RE.test("123")).toBe(false);
  });
});

// ── validateLogin ─────────────────────────────────────────────────────────────

describe("validateLogin", () => {
  it("returns empty object for valid credentials", () => {
    expect(validateLogin({ email: "a@b.com", password: "secret" })).toEqual({});
  });

  it("requires email", () => {
    const errs = validateLogin({ email: "", password: "secret" });
    expect(errs.email).toBeDefined();
  });

  it("rejects invalid email format", () => {
    const errs = validateLogin({ email: "bademail", password: "secret" });
    expect(errs.email).toMatch(/valid/i);
  });

  it("requires password", () => {
    const errs = validateLogin({ email: "a@b.com", password: "" });
    expect(errs.password).toBeDefined();
  });

  it("rejects password shorter than 6 characters", () => {
    const errs = validateLogin({ email: "a@b.com", password: "abc" });
    expect(errs.password).toMatch(/6/);
  });
});

// ── validateRegister ──────────────────────────────────────────────────────────

describe("validateRegister", () => {
  const valid = { name: "Ada Okafor", email: "ada@test.com", password: "Password1!", confirm: "Password1!" };

  it("returns empty object for valid user registration", () => {
    expect(validateRegister(valid, "user")).toEqual({});
  });

  it("requires full name", () => {
    expect(validateRegister({ ...valid, name: "" }, "user").name).toBeDefined();
  });

  it("rejects single-character name", () => {
    expect(validateRegister({ ...valid, name: "A" }, "user").name).toBeDefined();
  });

  it("requires password to be at least 8 characters", () => {
    expect(validateRegister({ ...valid, password: "abc", confirm: "abc" }, "user").password).toBeDefined();
  });

  it("rejects mismatched passwords", () => {
    expect(validateRegister({ ...valid, confirm: "different" }, "user").confirm).toMatch(/match/i);
  });

  it("requires phone for stylist role", () => {
    expect(validateRegister({ ...valid, phone: "" }, "stylist").phone).toBeDefined();
  });

  it("does not require phone for user role", () => {
    expect(validateRegister({ ...valid, phone: "" }, "user").phone).toBeUndefined();
  });
});

// ── validateBookingStep ───────────────────────────────────────────────────────

describe("validateBookingStep", () => {
  it("step 1 requires a service", () => {
    expect(validateBookingStep(1, { service: "" }).service).toBeDefined();
    expect(validateBookingStep(1, { service: "Hair" })).toEqual({});
  });

  it("step 2 requires a stylist", () => {
    expect(validateBookingStep(2, { stylist: null }).stylist).toBeDefined();
    expect(validateBookingStep(2, { stylist: 1 })).toEqual({});
  });

  it("step 3 requires date and time", () => {
    const errs = validateBookingStep(3, { date: "", time: "" });
    expect(errs.date).toBeDefined();
    expect(errs.time).toBeDefined();
  });

  it("step 3 passes when both date and time are set", () => {
    expect(validateBookingStep(3, { date: "2025-12-01", time: "10:00" })).toEqual({});
  });

  it("step 4 validates contact details", () => {
    const errs = validateBookingStep(4, { name: "", email: "bad", phone: "" });
    expect(errs.name).toBeDefined();
    expect(errs.email).toMatch(/valid/i);
    expect(errs.phone).toBeDefined();
  });

  it("step 4 passes with valid contact details", () => {
    expect(
      validateBookingStep(4, { name: "Ada", email: "a@b.com", phone: "+234 800 123 4567" })
    ).toEqual({});
  });
});

// ── validateGiftService ───────────────────────────────────────────────────────

describe("validateGiftService", () => {
  const valid = {
    senderName: "Funmi",
    recipientName: "Temi",
    phone: "+234 800 000 0000",
    service: "Makeup",
    date: "2025-12-01",
  };

  it("returns empty object for valid fields", () => {
    expect(validateGiftService(valid)).toEqual({});
  });

  it("requires senderName, recipientName, service, date", () => {
    const errs = validateGiftService({ ...valid, senderName: "", recipientName: "", service: "", date: "" });
    expect(errs.senderName).toBeDefined();
    expect(errs.recipientName).toBeDefined();
    expect(errs.service).toBeDefined();
    expect(errs.date).toBeDefined();
  });

  it("rejects invalid phone number", () => {
    const errs = validateGiftService({ ...valid, phone: "123" });
    expect(errs.phone).toBeDefined();
  });
});

// ── passwordStrength ──────────────────────────────────────────────────────────

describe("passwordStrength", () => {
  it("returns null for empty string", () => {
    expect(passwordStrength("")).toBeNull();
  });

  it("returns weak for short passwords", () => {
    expect(passwordStrength("abc").level).toBe(1);
  });

  it("returns fair for medium passwords without uppercase/number", () => {
    expect(passwordStrength("abcdefgh").level).toBe(2);
  });

  it("returns strong for long passwords with uppercase and number", () => {
    expect(passwordStrength("StrongPass1!").level).toBe(3);
  });
});
