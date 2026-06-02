import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/bookings.repository", () => ({
  bookingsRepository: {
    findDueReminders: vi.fn(),
    claimReminder: vi.fn(),
  },
}));
vi.mock("../services/notifications.service", () => ({
  notificationsService: { sendBookingReminder: vi.fn().mockResolvedValue(undefined) },
}));

import { runSendReminders } from "./sendReminders";
import { bookingsRepository } from "../repositories/bookings.repository";
import { notificationsService } from "../services/notifications.service";

beforeEach(() => vi.clearAllMocks());

describe("runSendReminders", () => {
  it("only reminds bookings it successfully claims (no double sends)", async () => {
    vi.mocked(bookingsRepository.findDueReminders).mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ]);
    // b2's claim is lost to a concurrent run — it must NOT be reminded here.
    vi.mocked(bookingsRepository.claimReminder).mockImplementation(async (id) => id !== "b2");

    const result = await runSendReminders(new Date("2026-06-01T00:00:00Z"));

    expect(result.reminded).toBe(2);
    const reminded = vi.mocked(notificationsService.sendBookingReminder).mock.calls.map((c) => c[0]);
    expect(reminded).toEqual(["b1", "b3"]);
  });

  it("queries a 24h window from now", async () => {
    vi.mocked(bookingsRepository.findDueReminders).mockResolvedValue([]);
    const now = new Date("2026-06-01T10:00:00.000Z");
    await runSendReminders(now);
    const [calledNow, horizon] = vi.mocked(bookingsRepository.findDueReminders).mock.calls[0]!;
    expect(calledNow).toEqual(now);
    expect(horizon.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("returns 0 and swallows a query failure", async () => {
    vi.mocked(bookingsRepository.findDueReminders).mockRejectedValue(new Error("db down"));
    const result = await runSendReminders();
    expect(result.reminded).toBe(0);
    expect(notificationsService.sendBookingReminder).not.toHaveBeenCalled();
  });
});
