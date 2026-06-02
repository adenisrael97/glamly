export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[\d\s+\-()\\.]{7,20}$/;

export function validateBookingStep(step: number, booking: Record<string, string | undefined>) {
  const errors: Record<string, string> = {};

  if (step === 1 && !booking.service) {
    errors.service = "Please select a service";
  }
  if (step === 2 && !booking.stylist) {
    errors.stylist = "Please select a stylist";
  }
  if (step === 3) {
    if (!booking.date) errors.date = "Please pick a date";
    if (!booking.time) errors.time = "Please pick a time slot";
  }
  if (step === 4) {
    if (!booking.name?.trim()) errors.name = "Your name is required";
    if (!booking.email?.trim()) errors.email = "Email is required";
    else if (!EMAIL_RE.test(booking.email)) errors.email = "Enter a valid email address";
    if (!booking.phone?.trim()) errors.phone = "Phone number is required";
    else if (!PHONE_RE.test(booking.phone)) errors.phone = "Enter a valid phone number";
  }

  return errors;
}

export function validateLogin(fields: { email?: string; password?: string }) {
  const errors: Record<string, string> = {};

  if (!fields.email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address";

  if (!fields.password) errors.password = "Password is required";
  else if (fields.password.length < 6) errors.password = "Must be at least 6 characters";

  return errors;
}

export function validateRegister(
  fields: { name?: string; email?: string; password?: string; confirm?: string; phone?: string },
  role: "user" | "stylist",
) {
  const errors: Record<string, string> = {};

  if (!fields.name?.trim()) errors.name = "Full name is required";
  else if (fields.name.trim().length < 2) errors.name = "Name is too short";

  if (!fields.email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email";

  if (!fields.password) errors.password = "Password is required";
  else if (fields.password.length < 8) errors.password = "Must be at least 8 characters";

  if (!fields.confirm) errors.confirm = "Please confirm your password";
  else if (fields.confirm !== fields.password) errors.confirm = "Passwords do not match";

  if (role === "stylist" && !fields.phone?.trim()) errors.phone = "Phone number is required";

  return errors;
}

export function validateGiftService(fields: {
  senderName?: string;
  recipientName?: string;
  phone?: string;
  service?: string;
  date?: string;
}) {
  const errors: Record<string, string> = {};

  if (!fields.senderName?.trim()) errors.senderName = "Your name is required";
  if (!fields.recipientName?.trim()) errors.recipientName = "Recipient name is required";

  if (!fields.phone?.trim()) errors.phone = "Phone number is required";
  else if (!PHONE_RE.test(fields.phone)) errors.phone = "Enter a valid phone number";

  if (!fields.service) errors.service = "Please select a service";
  if (!fields.date) errors.date = "Please pick a date";

  return errors;
}

export function passwordStrength(pw: string): { level: 1 | 2 | 3; label: string; color: string } | null {
  if (!pw) return null;
  if (pw.length < 6) return { level: 1, label: "Weak", color: "bg-red-400" };
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return { level: 2, label: "Fair", color: "bg-yellow-400" };
  }
  return { level: 3, label: "Strong", color: "bg-green-500" };
}
