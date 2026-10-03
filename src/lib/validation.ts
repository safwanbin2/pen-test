// Request schemas for every API route (F-FND-07). Messages are written for the
// person filling in the form; they appear next to the field.

import { z } from "zod";
import { calendarDate } from "./domain/time";

// A missing field should read as a person would say it, not "expected string, received undefined".
z.config({
  customError: (issue) =>
    issue.code === "invalid_type" && issue.input === undefined ? "This field is required." : undefined,
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD.")
  .transform((s, ctx) => {
    const [y, m, d] = s.split("-").map(Number);
    const date = calendarDate(y, m, d);
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      ctx.addIssue({ code: "custom", message: "That date doesn't exist." });
      return z.NEVER;
    }
    return date;
  });

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:MM (24-hour).");
const academicYear = z.string().regex(/^\d{4}\/\d{2}$/, "Choose an academic year.");
const pence = z.number().int().positive("Enter an amount greater than £0.").max(100_000_000, "That amount is too large.");

export const fundingSource = z.enum(["SELF_FUNDED", "STUDENT_FINANCE", "SPONSOR"], "Choose a funding source.");

export const sessionInput = z.object({
  role: z.enum(["staff", "student"]),
  studentNumber: z.string().optional(),
});

const studentFields = {
  fullName: z.string().trim().min(2, "Enter the student's full name.").max(120, "Use 120 characters or fewer."),
  email: z.email("Enter a valid email address.").transform((e) => e.trim().toLowerCase()),
  dateOfBirth: isoDate,
  fundingSource,
};

export const createStudentInput = z.object({
  ...studentFields,
  programmeId: z.string().min(1, "Choose a programme."),
  academicYear,
  status: z.enum(["ENROLLED", "DEFERRED"], "New students start as Enrolled or Deferred."),
});

export const updateStudentInput = z.object(studentFields);

export const statusChangeInput = z.object({
  status: z.enum(["ENROLLED", "DEFERRED", "WITHDRAWN", "COMPLETED"]),
  reason: z.string().trim().min(3, "Give a reason for the change.").max(500),
});

export const paymentInput = z.object({
  amountPence: pence,
  paidOn: isoDate,
  reference: z
    .string()
    .trim()
    .min(3, "Enter the reference shown on the statement.")
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9\-/ ]*$/, "Use letters, numbers, dashes or slashes.")
    .transform((r) => r.toUpperCase()),
  method: z.enum(["BANK_TRANSFER", "CARD", "STUDENT_FINANCE", "SPONSOR", "OTHER"]),
  note: z.string().trim().max(500).optional(),
});

export const programmeFeeInput = z.object({ academicYear, amountPence: pence });

export const assessmentInput = z.object({
  moduleId: z.string().min(1, "Choose a module."),
  title: z.string().trim().min(3, "Enter a title.").max(120),
  deadlineDate: isoDate,
  deadlineTime: time,
});

export const extensionInput = z.object({
  studentId: z.string().min(1),
  newDeadlineDate: isoDate,
  newDeadlineTime: time,
  reason: z.enum(["MITIGATING_CIRCUMSTANCES", "REASONABLE_ADJUSTMENT", "TECHNICAL_ISSUE", "OTHER"], "Choose a reason."),
  note: z.string().trim().min(3, "Add a note for the record.").max(1000),
});

export const markInput = z.object({
  studentId: z.string().min(1),
  assessmentId: z.string().min(1),
  score: z.number().int("Enter 0–100").min(0, "Enter 0–100").max(100, "Enter 0–100"),
});

export const releaseInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("PUBLISH") }),
  z.object({ action: z.literal("REPUBLISH") }),
  z.object({ action: z.literal("RELEASE") }),
  z.object({
    action: z.literal("WITHHOLD"),
    reason: z.enum(["FEES_OUTSTANDING", "ACADEMIC_MISCONDUCT", "AWAITING_EXAM_BOARD", "OTHER"], "Choose a reason."),
    note: z.string().trim().min(3, "Add a note for the record.").max(1000),
  }),
]);
