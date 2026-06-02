import { describe, expect, it } from "vitest";
import {
  isValidSlotStart,
  generateDaySlots,
  intervalsOverlap,
  BOOKING_WORKING_HOURS_START,
  BOOKING_WORKING_HOURS_END,
} from "@glamly/shared";
import { availableSlotsForRange } from "./stylists.service";

const at = (y: number, m: number, d: number, h: number) => new Date(Date.UTC(y, m, d, h, 0, 0, 0));

describe("slot grid helpers", () => {
  it("accepts only on-the-hour times inside working hours", () => {
    expect(isValidSlotStart(at(2999, 0, 1, BOOKING_WORKING_HOURS_START))).toBe(true);
    expect(isValidSlotStart(at(2999, 0, 1, BOOKING_WORKING_HOURS_END - 1))).toBe(true);
    expect(isValidSlotStart(at(2999, 0, 1, BOOKING_WORKING_HOURS_END))).toBe(false); // closing
    expect(isValidSlotStart(at(2999, 0, 1, 3))).toBe(false); // before opening
    expect(isValidSlotStart(new Date("2999-01-01T09:30:00.000Z"))).toBe(false); // half past
  });

  it("generates one slot per working hour", () => {
    const slots = generateDaySlots(at(2999, 0, 1, 0));
    expect(slots).toHaveLength(BOOKING_WORKING_HOURS_END - BOOKING_WORKING_HOURS_START);
    expect(slots[0].getUTCHours()).toBe(BOOKING_WORKING_HOURS_START);
  });

  it("detects interval overlap correctly", () => {
    const a0 = at(2999, 0, 1, 10);
    const a1 = at(2999, 0, 1, 11);
    expect(intervalsOverlap(a0, a1, at(2999, 0, 1, 10), at(2999, 0, 1, 11))).toBe(true); // identical
    expect(intervalsOverlap(a0, a1, at(2999, 0, 1, 11), at(2999, 0, 1, 12))).toBe(false); // adjacent
    expect(intervalsOverlap(a0, a1, at(2999, 0, 1, 9), at(2999, 0, 1, 10, ))).toBe(false); // before
  });
});

describe("availableSlotsForRange", () => {
  const now = at(2999, 0, 1, 0); // far-future midnight so nothing is "past"

  it("returns every working-hour slot when there are no bookings", () => {
    const slots = availableSlotsForRange({ fromDay: now, days: 1, durationMinutes: 60, bookings: [], now });
    expect(slots).toHaveLength(BOOKING_WORKING_HOURS_END - BOOKING_WORKING_HOURS_START);
  });

  it("removes slots overlapping an existing booking", () => {
    const bookings = [{ startTime: at(2999, 0, 1, 10), endTime: at(2999, 0, 1, 11) }];
    const slots = availableSlotsForRange({ fromDay: now, days: 1, durationMinutes: 60, bookings, now });
    expect(slots.some((s) => s.startTime.getUTCHours() === 10)).toBe(false);
    expect(slots.some((s) => s.startTime.getUTCHours() === 9)).toBe(true);
  });

  it("excludes slots whose service would run past closing", () => {
    // A 120-min service at the last grid hour would spill past closing.
    const slots = availableSlotsForRange({ fromDay: now, days: 1, durationMinutes: 120, bookings: [], now });
    const lastStart = BOOKING_WORKING_HOURS_END - 1;
    expect(slots.some((s) => s.startTime.getUTCHours() === lastStart)).toBe(false);
  });

  it("excludes past slots relative to now", () => {
    const midday = at(2999, 0, 1, 12);
    const slots = availableSlotsForRange({ fromDay: now, days: 1, durationMinutes: 60, bookings: [], now: midday });
    expect(slots.every((s) => s.startTime.getTime() >= midday.getTime())).toBe(true);
  });
});
