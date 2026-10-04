// Enrolment status rules (D5, D14). Every change needs a reason; Completed is final.

import type { StudentStatus } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<StudentStatus, string> = {
  ENROLLED: "Enrolled",
  DEFERRED: "Deferred",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

const ALLOWED: Record<StudentStatus, StudentStatus[]> = {
  ENROLLED: ["DEFERRED", "WITHDRAWN", "COMPLETED"],
  DEFERRED: ["ENROLLED", "WITHDRAWN"],
  WITHDRAWN: ["ENROLLED"], // re-admission
  COMPLETED: [],
};

export function allowedTransitions(from: StudentStatus): StudentStatus[] {
  return ALLOWED[from];
}

export type TransitionCheck = { ok: true } | { ok: false; message: string };

export function checkTransition(from: StudentStatus, to: StudentStatus, reason: string): TransitionCheck {
  if (from === to) return { ok: false, message: `Student is already ${STATUS_LABEL[to]}.` };
  if (from === "COMPLETED") return { ok: false, message: "Completed records are final and can't change status." };
  if (!ALLOWED[from].includes(to)) {
    return { ok: false, message: `Can't change from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}.` };
  }
  if (reason.trim().length < 3) return { ok: false, message: "Give a reason for the change." };
  return { ok: true };
}

/**
 * Why a student can't be marked Completed yet (D37). Unfinished assessment work blocks it:
 * an assessment still open for the student, or a submission without a mark. A missed
 * deadline with nothing submitted doesn't block (it stands as a non-submission), and
 * outstanding fees don't block either: they stay payable, as on withdrawal.
 */
export function completionBlockers(
  assessments: { label: string; isOpen: boolean; submitted: boolean; marked: boolean }[],
): string[] {
  const open = assessments.filter((a) => a.isOpen).map((a) => a.label);
  const unmarked = assessments.filter((a) => !a.isOpen && a.submitted && !a.marked).map((a) => a.label);
  return [
    open.length > 0 && `still open for submission: ${open.join(", ")}`,
    unmarked.length > 0 && `submitted but not marked: ${unmarked.join(", ")}`,
  ].filter((x): x is string => !!x);
}

/** Only enrolled students can submit work (D14). */
export function canSubmitWork(status: StudentStatus): boolean {
  return status === "ENROLLED";
}

/** Minimum age at enrolment (F-ENR-09). */
export const MIN_AGE = 16;

export function ageOn(dateOfBirth: Date, on: Date): number {
  let age = on.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (on.getUTCMonth() === dateOfBirth.getUTCMonth() && on.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
