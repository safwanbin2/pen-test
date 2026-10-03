// Tests for the smaller rule modules: classification, enrolment, results,
// money, student numbers and academic years.
import { describe, expect, it } from "vitest";
import { academicYearFor, academicYearStart, shiftAcademicYear } from "./academicYear";
import { classify, isValidMark } from "./classification";
import { ageOn, checkTransition } from "./enrolment";
import { formatGBP, parsePounds } from "./money";
import { availableReleaseActions, releaseStatusAfterMarkChange, studentVisibleScore } from "./results";
import { formatStudentNumber, parseStudentNumber } from "./studentNumber";
import { calendarDate } from "./time";

describe("classify", () => {
  it.each([
    [0, "Fail"],
    [35, "Fail"],
    [39, "Fail"],
    [40, "Pass"],
    [59, "Pass"],
    [60, "Merit"],
    [69, "Merit"],
    [70, "Distinction"],
    [100, "Distinction"],
  ] as const)("%i -> %s", (score, expected) => {
    expect(classify(score)).toBe(expected);
  });

  it.each([-1, 101, 69.5, Number.NaN])("rejects %s", (score) => {
    expect(isValidMark(score)).toBe(false);
    expect(() => classify(score)).toThrow(RangeError);
  });
});

describe("checkTransition", () => {
  it("allows withdrawing an enrolled student with a reason", () => {
    expect(checkTransition("ENROLLED", "WITHDRAWN", "Personal circumstances")).toEqual({ ok: true });
  });

  it("requires a reason", () => {
    expect(checkTransition("ENROLLED", "WITHDRAWN", "  ")).toMatchObject({ ok: false });
  });

  it("treats Completed as final", () => {
    expect(checkTransition("COMPLETED", "ENROLLED", "Re-admission")).toMatchObject({ ok: false });
  });

  it("rejects transitions that make no sense", () => {
    expect(checkTransition("WITHDRAWN", "COMPLETED", "Finished")).toMatchObject({ ok: false });
    expect(checkTransition("ENROLLED", "ENROLLED", "No change")).toMatchObject({ ok: false });
  });

  it("allows re-admitting a withdrawn student", () => {
    expect(checkTransition("WITHDRAWN", "ENROLLED", "Re-admitted after appeal")).toEqual({ ok: true });
  });
});

describe("ageOn", () => {
  it("is 15 the day before the 16th birthday and 16 on it", () => {
    const dob = calendarDate(2011, 3, 14);
    expect(ageOn(dob, calendarDate(2027, 3, 13))).toBe(15);
    expect(ageOn(dob, calendarDate(2027, 3, 14))).toBe(16);
  });
});

describe("result release", () => {
  it("a published mark that changes needs re-publishing", () => {
    expect(releaseStatusAfterMarkChange("PUBLISHED", true)).toBe("NEEDS_REPUBLISH");
    expect(releaseStatusAfterMarkChange("PUBLISHED", false)).toBe("PUBLISHED");
    expect(releaseStatusAfterMarkChange("PENDING", true)).toBe("PENDING");
    expect(releaseStatusAfterMarkChange("WITHHELD", true)).toBe("WITHHELD");
  });

  it("Mariam keeps seeing the published 58 until re-published", () => {
    expect(studentVisibleScore({ releaseStatus: "NEEDS_REPUBLISH", publishedScore: 58 })).toBe(58);
  });

  it("withheld and pending marks are invisible to the student", () => {
    expect(studentVisibleScore({ releaseStatus: "WITHHELD", publishedScore: 61 })).toBeNull();
    expect(studentVisibleScore({ releaseStatus: "PENDING", publishedScore: null })).toBeNull();
  });

  it("offers the actions the Results screen shows", () => {
    expect(availableReleaseActions("PENDING")).toEqual(["PUBLISH", "WITHHOLD"]);
    expect(availableReleaseActions("NEEDS_REPUBLISH")).toEqual(["REPUBLISH", "WITHHOLD"]);
    expect(availableReleaseActions("WITHHELD")).toEqual(["RELEASE"]);
  });
});

describe("money", () => {
  it("formats pence as pounds", () => {
    expect(formatGBP(953_500)).toBe("£9,535.00");
    expect(formatGBP(12_000)).toBe("£120.00");
    expect(formatGBP(0)).toBe("£0.00");
  });

  it.each([
    ["500", 50_000],
    ["500.00", 50_000],
    ["£1,500.5", 150_050],
    [" 2383.75 ", 238_375],
  ])("parses %j", (input, pence) => {
    expect(parsePounds(input)).toBe(pence);
  });

  it.each(["", "0", "-5", "12.345", "abc", "1.2.3"])("rejects %j", (input) => {
    expect(parsePounds(input)).toBeNull();
  });
});

describe("student numbers", () => {
  it("formats and parses", () => {
    expect(formatStudentNumber(2026, 1)).toBe("SMS-2026-0001");
    expect(formatStudentNumber(2025, 12)).toBe("SMS-2025-0012");
    expect(parseStudentNumber("sms-2026-0001")).toEqual({ year: 2026, sequence: 1 });
    expect(parseStudentNumber("SMS-26-1")).toBeNull();
  });

  it("keeps working past 9999 students in a year", () => {
    expect(formatStudentNumber(2026, 10_000)).toBe("SMS-2026-10000");
  });
});

describe("academic years", () => {
  it("starts on 1 September", () => {
    expect(academicYearFor(calendarDate(2026, 8, 31))).toBe("2025/26");
    expect(academicYearFor(calendarDate(2026, 9, 1))).toBe("2026/27");
    expect(academicYearFor(calendarDate(2027, 1, 15))).toBe("2026/27");
  });

  it("parses and shifts labels, including the century boundary", () => {
    expect(academicYearStart("2026/27")).toBe(2026);
    expect(shiftAcademicYear("2026/27", 1)).toBe("2027/28");
    expect(shiftAcademicYear("2099/00", 0)).toBe("2099/00");
    expect(() => academicYearStart("2026/28")).toThrow();
  });
});
