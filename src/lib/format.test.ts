import { describe, expect, it } from "vitest";
import { formatDate, formatLongToday, formatUkDateTime, formatUkDayTime, relativeDays } from "./format";
import { calendarDate } from "./domain/time";

describe("format", () => {
  it("uses Sep, not Sept", () => {
    expect(formatDate(calendarDate(2026, 9, 1))).toBe("1 Sep 2026");
  });

  it("shows instants in UK time", () => {
    expect(formatUkDateTime(new Date("2026-10-14T22:59:00Z"))).toBe("14 Oct 2026, 23:59");
    expect(formatUkDayTime(new Date("2026-11-18T23:59:00Z"))).toBe("18 Nov, 23:59");
  });

  it("names the UK weekday", () => {
    expect(formatLongToday(new Date("2026-10-22T09:00:00Z"))).toBe("Thursday 22 Oct 2026");
  });

  it("describes day distances", () => {
    expect(relativeDays(2)).toBe("in 2 days");
    expect(relativeDays(-8)).toBe("8 days ago");
    expect(relativeDays(0)).toBe("today");
  });
});
