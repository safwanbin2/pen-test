import { describe, expect, it } from "vitest";
import { addDays, calendarDate, daysBetween, ukDateTime, ukToday } from "./time";

describe("ukDateTime", () => {
  it("converts a BST wall-clock time to UTC (one hour behind)", () => {
    expect(ukDateTime(calendarDate(2026, 10, 14), 23, 59).toISOString()).toBe("2026-10-14T22:59:00.000Z");
  });

  it("converts a GMT wall-clock time to UTC (same hour)", () => {
    expect(ukDateTime(calendarDate(2026, 11, 18), 23, 59).toISOString()).toBe("2026-11-18T23:59:00.000Z");
  });

  it("handles the day the clocks go back (25 Oct 2026)", () => {
    expect(ukDateTime(calendarDate(2026, 10, 25), 0, 30).toISOString()).toBe("2026-10-24T23:30:00.000Z");
    expect(ukDateTime(calendarDate(2026, 10, 25), 23, 59).toISOString()).toBe("2026-10-25T23:59:00.000Z");
  });

  it("handles the day the clocks go forward (29 Mar 2026)", () => {
    expect(ukDateTime(calendarDate(2026, 3, 29), 23, 59).toISOString()).toBe("2026-03-29T22:59:00.000Z");
  });
});

describe("ukToday", () => {
  it("uses the UK date, not the UTC date, just after midnight in BST", () => {
    // 23:30 UTC on 14 Oct is 00:30 on 15 Oct in London.
    expect(ukToday(new Date("2026-10-14T23:30:00Z"))).toEqual(calendarDate(2026, 10, 15));
  });

  it("matches the UTC date in winter", () => {
    expect(ukToday(new Date("2026-12-01T23:30:00Z"))).toEqual(calendarDate(2026, 12, 1));
  });
});

describe("calendar arithmetic", () => {
  it("counts whole days between calendar dates", () => {
    expect(daysBetween(calendarDate(2026, 10, 1), calendarDate(2026, 10, 22))).toBe(21);
    expect(daysBetween(calendarDate(2026, 10, 22), calendarDate(2027, 2, 1))).toBe(102);
  });

  it("adds days across month ends", () => {
    expect(addDays(calendarDate(2026, 10, 22), -51)).toEqual(calendarDate(2026, 9, 1));
  });
});
