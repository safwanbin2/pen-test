import { describe, expect, it } from "vitest";
import {
  checkSubmission,
  effectiveDeadline,
  formatLatenessLong,
  formatLatenessShort,
  isLate,
  lateness,
} from "./submission";
import { calendarDate, ukDateTime } from "./time";

const DEADLINE = ukDateTime(calendarDate(2026, 10, 14), 23, 59); // BUS4001
const EXTENDED = ukDateTime(calendarDate(2026, 10, 21), 23, 59); // Mariam's extension

describe("deadlines and lateness", () => {
  it("uses the extension when there is one", () => {
    expect(effectiveDeadline(DEADLINE, { newDeadline: EXTENDED })).toEqual(EXTENDED);
    expect(effectiveDeadline(DEADLINE, null)).toEqual(DEADLINE);
  });

  it("Tom: submitted 16 Oct 02:59 is 1d 3h late", () => {
    const submitted = ukDateTime(calendarDate(2026, 10, 16), 2, 59);
    const l = lateness(submitted, DEADLINE)!;
    expect(formatLatenessShort(l)).toBe("1d 3h");
    expect(formatLatenessLong(l)).toBe("1 day 3 hours");
  });

  it("Mariam: after the original deadline but before her extension is not late", () => {
    const submitted = ukDateTime(calendarDate(2026, 10, 19), 16, 40);
    expect(isLate(submitted, DEADLINE)).toBe(true);
    expect(isLate(submitted, effectiveDeadline(DEADLINE, { newDeadline: EXTENDED }))).toBe(false);
  });

  it("submitting exactly at the deadline is on time", () => {
    expect(isLate(DEADLINE, DEADLINE)).toBe(false);
    expect(lateness(DEADLINE, DEADLINE)).toBeNull();
  });

  it("formats short lateness without zero days", () => {
    expect(formatLatenessShort({ days: 0, hours: 5, minutes: 12 })).toBe("5h 12m");
    expect(formatLatenessShort({ days: 0, hours: 0, minutes: 14 })).toBe("14m");
    expect(formatLatenessLong({ days: 2, hours: 0, minutes: 0 })).toBe("2 days");
    expect(formatLatenessLong({ days: 0, hours: 0, minutes: 1 })).toBe("1 minute");
  });
});

describe("checkSubmission", () => {
  const before = new Date(DEADLINE.getTime() - 60_000);
  const after = new Date(DEADLINE.getTime() + 60_000);

  it("allows a first submission and a resubmission before the deadline", () => {
    expect(checkSubmission({ studentStatus: "ENROLLED", hasExistingSubmission: false, now: before, effectiveDeadline: DEADLINE }))
      .toEqual({ ok: true, late: false, replacing: false });
    expect(checkSubmission({ studentStatus: "ENROLLED", hasExistingSubmission: true, now: before, effectiveDeadline: DEADLINE }))
      .toEqual({ ok: true, late: false, replacing: true });
  });

  it("accepts a first submission after the deadline, flagged late", () => {
    expect(checkSubmission({ studentStatus: "ENROLLED", hasExistingSubmission: false, now: after, effectiveDeadline: DEADLINE }))
      .toEqual({ ok: true, late: true, replacing: false });
  });

  it("blocks replacing a file once the deadline has passed", () => {
    const result = checkSubmission({ studentStatus: "ENROLLED", hasExistingSubmission: true, now: after, effectiveDeadline: DEADLINE });
    expect(result).toMatchObject({ ok: false, code: "DEADLINE_PASSED" });
  });

  it.each(["WITHDRAWN", "DEFERRED", "COMPLETED"] as const)("blocks %s students with a plain-English reason", (status) => {
    const result = checkSubmission({ studentStatus: status, hasExistingSubmission: false, now: before, effectiveDeadline: DEADLINE });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/^Submissions are closed because your enrolment status is \w+\. Contact Registry\.$/);
  });
});
