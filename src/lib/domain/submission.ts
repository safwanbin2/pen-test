// Submission rules: extensions move one student's deadline (D8); late work is
// accepted and flagged; once the deadline passes, a file already on record
// can't be replaced (D7); only enrolled students can submit (D14).

import type { StudentStatus } from "@/generated/prisma/enums";
import { canSubmitWork, STATUS_LABEL } from "./enrolment";

export function effectiveDeadline(deadline: Date, extension?: { newDeadline: Date } | null): Date {
  return extension?.newDeadline ?? deadline;
}

export function isLate(submittedAt: Date, deadline: Date): boolean {
  return submittedAt.getTime() > deadline.getTime();
}

export type Lateness = { days: number; hours: number; minutes: number };

/** How late a submission was, or null if on time. */
export function lateness(submittedAt: Date, deadline: Date): Lateness | null {
  const totalMinutes = Math.ceil((submittedAt.getTime() - deadline.getTime()) / 60_000);
  if (totalMinutes <= 0) return null;
  return { days: Math.floor(totalMinutes / 1440), hours: Math.floor((totalMinutes % 1440) / 60), minutes: totalMinutes % 60 };
}

/** Badge form: "1d 3h", "5h 12m", "14m". */
export function formatLatenessShort(l: Lateness): string {
  if (l.days > 0) return `${l.days}d ${l.hours}h`;
  if (l.hours > 0) return `${l.hours}h ${l.minutes}m`;
  return `${l.minutes}m`;
}

/** Prose form: "1 day 3 hours". */
export function formatLatenessLong(l: Lateness): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (l.days > 0) return l.hours > 0 ? `${unit(l.days, "day")} ${unit(l.hours, "hour")}` : unit(l.days, "day");
  if (l.hours > 0) return l.minutes > 0 ? `${unit(l.hours, "hour")} ${unit(l.minutes, "minute")}` : unit(l.hours, "hour");
  return unit(l.minutes, "minute");
}

export type SubmitCheck =
  | { ok: true; late: boolean; replacing: boolean }
  | { ok: false; code: "NOT_ENROLLED" | "DEADLINE_PASSED"; message: string };

export function checkSubmission(input: {
  studentStatus: StudentStatus;
  hasExistingSubmission: boolean;
  now: Date;
  effectiveDeadline: Date;
}): SubmitCheck {
  if (!canSubmitWork(input.studentStatus)) {
    return {
      ok: false,
      code: "NOT_ENROLLED",
      message: `Submissions are closed because your enrolment status is ${STATUS_LABEL[input.studentStatus]}. Contact Registry.`,
    };
  }
  const late = isLate(input.now, input.effectiveDeadline);
  if (late && input.hasExistingSubmission) {
    return {
      ok: false,
      code: "DEADLINE_PASSED",
      message: "The deadline has passed, so the file on record can no longer be replaced.",
    };
  }
  return { ok: true, late, replacing: input.hasExistingSubmission };
}
