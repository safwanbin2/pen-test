import type { FundingSource, Prisma, StudentStatus } from "@/generated/prisma/client";
import type { z } from "zod";
import { db } from "../db";
import { audit } from "../audit";
import { conflict, unprocessable } from "../errors";
import { academicYearFor, academicYearStart } from "../domain/academicYear";
import { ageOn, checkTransition, MIN_AGE, STATUS_LABEL } from "../domain/enrolment";
import { formatGBP, splitByPercent, DEFAULT_INSTALMENT_PERCENTS } from "../domain/money";
import { formatStudentNumber } from "../domain/studentNumber";
import { calendarDate, ukToday } from "../domain/time";
import { formatDate } from "../format";
import type { createStudentInput, updateStudentInput } from "../validation";
import { getAccount, getAccountSummaries } from "./accounts";

// ---------------------------------------------------------------------------
// The student the demo "Student" role is viewing as
// ---------------------------------------------------------------------------

export async function getCurrentStudent(studentNumber: string | null) {
  const include = { programme: true } as const;
  if (studentNumber) {
    const student = await db.student.findUnique({ where: { studentNumber }, include });
    if (student) return student;
  }
  return db.student.findFirst({ where: { status: "ENROLLED" }, orderBy: { studentNumber: "asc" }, include });
}

export function listStudentsForPicker() {
  return db.student.findMany({
    orderBy: { studentNumber: "asc" },
    select: { studentNumber: true, fullName: true, status: true },
  });
}

// ---------------------------------------------------------------------------
// Students list
// ---------------------------------------------------------------------------

export type StudentFilters = {
  q?: string;
  programmeId?: string;
  status?: StudentStatus;
  academicYear?: string;
  funding?: FundingSource;
  overdue?: boolean;
};

export async function listStudents(filters: StudentFilters) {
  const q = filters.q?.trim();
  const where: Prisma.StudentWhereInput = {
    programmeId: filters.programmeId,
    status: filters.status,
    academicYear: filters.academicYear,
    fundingSource: filters.funding,
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { studentNumber: { contains: q.toUpperCase() } },
      ],
    }),
  };
  const [students, total] = await Promise.all([
    db.student.findMany({ where, orderBy: { studentNumber: "asc" }, include: { programme: true } }),
    db.student.count(),
  ]);
  const accounts = await getAccountSummaries(students.map((s) => s.id));
  let rows = students.map((s) => ({ ...s, account: accounts.get(s.id)! }));
  if (filters.overdue) rows = rows.filter((r) => r.account.overduePence > 0);
  return { rows, total };
}

/** Muted note under a balance when nothing is overdue. */
export function balanceNote(account: { balancePence: number; creditPence: number; totalChargedPence: number; nextDue: { dueDate: Date } | null }, status: StudentStatus) {
  if (account.creditPence > 0) return "";
  if (account.totalChargedPence === 0) return status === "DEFERRED" ? "Deferred, not yet charged" : "Not charged";
  if (account.balancePence === 0) return "Paid in full";
  if (account.nextDue) return `Next due ${formatDate(account.nextDue.dueDate)}`;
  return "";
}

export function listProgrammes() {
  return db.programme.findMany({ orderBy: { name: "asc" } });
}

export async function listAcademicYears() {
  const rows = await db.student.findMany({ distinct: ["academicYear"], select: { academicYear: true } });
  return rows.map((r) => r.academicYear).sort().reverse();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getStudentProfile(id: string) {
  const student = await db.student.findUnique({
    where: { id },
    include: {
      programme: true,
      auditLogs: { orderBy: { createdAt: "desc" } },
      marks: { include: { assessment: { include: { module: true } } }, orderBy: { updatedAt: "desc" } },
      submissions: {
        include: {
          assessment: { include: { module: true } },
          versions: { orderBy: { version: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      },
      extensions: true,
    },
  });
  if (!student) return null;
  const account = await getAccount(student.id);
  return { student, account };
}

// ---------------------------------------------------------------------------
// Create, update, change status
// ---------------------------------------------------------------------------

/**
 * Check everything a person can fix in the form at once, so the error summary
 * lists every problem in one go ("Fix 2 problems before saving").
 */
async function checkStudentFields(input: { email: string; dateOfBirth: Date }, exceptId?: string) {
  const fields: Record<string, string> = {};
  const existing = await db.student.findUnique({
    where: { email: input.email },
    select: { id: true, fullName: true, studentNumber: true },
  });
  if (existing && existing.id !== exceptId) {
    fields.email = `This email is already registered to ${existing.fullName} (${existing.studentNumber}).`;
    fields.duplicateStudentId = existing.id;
  }
  const today = ukToday();
  if (input.dateOfBirth > today) {
    fields.dateOfBirth = "Date of birth can't be in the future.";
  } else {
    const age = ageOn(input.dateOfBirth, today);
    if (age < MIN_AGE) {
      fields.dateOfBirth = `Student must be at least ${MIN_AGE}. ${formatDate(input.dateOfBirth)} makes them ${age} today.`;
    }
  }
  return fields;
}

function throwIfAny(fields: Record<string, string>) {
  const problems = Object.keys(fields).filter((k) => k !== "duplicateStudentId");
  if (problems.length === 0) return;
  // A duplicate email is a conflict with an existing record; everything else is invalid input.
  const message = `Fix ${problems.length} ${problems.length === 1 ? "problem" : "problems"} before saving`;
  throw fields.email ? conflict(message, fields) : unprocessable(message, fields);
}

/**
 * Default instalment dates for an academic year: 1 Sep, 1 Oct, 1 Feb (the
 * pattern in the design). Dates before enrolment move to the enrolment date,
 * so a student who joins late is never overdue on day one (D28).
 */
export function defaultDueDates(academicYear: string, enrolledOn: Date): Date[] {
  const start = academicYearStart(academicYear);
  return [calendarDate(start, 9, 1), calendarDate(start, 10, 1), calendarDate(start + 1, 2, 1)].map((d) =>
    d < enrolledOn ? enrolledOn : d,
  );
}

export async function createStudent(input: z.infer<typeof createStudentInput>) {
  const fields = await checkStudentFields(input);
  const programme = await db.programme.findUnique({ where: { id: input.programmeId } });
  if (!programme) fields.programmeId = "Choose a programme.";
  const fee = programme
    ? await db.programmeFee.findUnique({
        where: { programmeId_academicYear: { programmeId: programme.id, academicYear: input.academicYear } },
      })
    : null;
  if (programme && input.status === "ENROLLED" && !fee) {
    fields.academicYear = `No ${input.academicYear} fee is set for ${programme.name}. Add it in Fees first.`;
  }
  throwIfAny(fields);
  if (!programme) throw unprocessable("Choose a programme", { programmeId: "Choose a programme." });

  const today = ukToday();
  const intakeYear = academicYearStart(academicYearFor(today));

  return db.$transaction(async (tx) => {
    // Atomic increment: concurrent enrolments can't get the same number (D4).
    const counter = await tx.studentNumberCounter.upsert({
      where: { year: intakeYear },
      create: { year: intakeYear, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const student = await tx.student.create({
      data: {
        studentNumber: formatStudentNumber(intakeYear, counter.lastValue),
        fullName: input.fullName,
        email: input.email,
        dateOfBirth: input.dateOfBirth,
        programmeId: programme.id,
        academicYear: input.academicYear,
        status: input.status,
        fundingSource: input.fundingSource,
      },
    });
    await audit(tx, {
      area: "ENROLMENT",
      action: "student.enrolled",
      studentId: student.id,
      fromValue: "No status",
      toValue: STATUS_LABEL[input.status],
      reason: "Created in Registry.",
    });
    if (input.status === "ENROLLED" && fee) {
      const amounts = splitByPercent(fee.amountPence, DEFAULT_INSTALMENT_PERCENTS);
      const dueDates = defaultDueDates(input.academicYear, today);
      await tx.feeCharge.create({
        data: {
          studentId: student.id,
          academicYear: input.academicYear,
          description: `Tuition fee · ${programme.name}, ${input.academicYear}`,
          amountPence: fee.amountPence,
          instalments: {
            create: amounts.map((amountPence, i) => ({ sequence: i + 1, dueDate: dueDates[i], amountPence })),
          },
        },
      });
      await audit(tx, {
        area: "FEES",
        action: "fee.charged",
        studentId: student.id,
        subject: "Tuition fee",
        toValue: formatGBP(fee.amountPence),
        reason: `${input.academicYear} fee for ${programme.name}, in three instalments (25% / 25% / 50%).`,
      });
    }
    return student;
  });
}

export async function updateStudent(id: string, input: z.infer<typeof updateStudentInput>) {
  const before = await db.student.findUnique({ where: { id } });
  if (!before) return null;
  throwIfAny(await checkStudentFields(input, id));
  return db.$transaction(async (tx) => {
    const student = await tx.student.update({ where: { id }, data: input });
    const changed = [
      before.fullName !== student.fullName && "name",
      before.email !== student.email && "email",
      before.fundingSource !== student.fundingSource && "funding source",
      before.dateOfBirth.getTime() !== student.dateOfBirth.getTime() && "date of birth",
    ].filter(Boolean);
    if (changed.length) {
      await audit(tx, {
        area: "ENROLMENT",
        action: "student.updated",
        studentId: id,
        subject: "Details",
        reason: `Updated ${changed.join(", ")}.`,
      });
    }
    return student;
  });
}

/**
 * Change enrolment status with a reason (F-ENR-08). Withdrawing cancels
 * instalments not yet due; instalments already due stay payable (D21).
 */
export async function changeStatus(id: string, to: StudentStatus, reason: string) {
  const student = await db.student.findUnique({ where: { id } });
  if (!student) return null;
  const check = checkTransition(student.status, to, reason);
  if (!check.ok) throw unprocessable(check.message, { status: check.message });
  const today = ukToday();

  return db.$transaction(async (tx) => {
    const updated = await tx.student.update({ where: { id }, data: { status: to } });
    await audit(tx, {
      area: "ENROLMENT",
      action: "student.status_changed",
      studentId: id,
      fromValue: STATUS_LABEL[student.status],
      toValue: STATUS_LABEL[to],
      reason: reason.trim(),
    });
    if (to === "WITHDRAWN") {
      // Cancel only future instalments with nothing paid against them. Money already
      // received stays where it is: refunds are a finance decision, not an automatic one (D21).
      const { summary } = await getAccount(id, today);
      const cancellable = summary.instalments.filter(
        (i) => i.status === "DUE" && i.dueDate > today && i.paidPence === 0,
      );
      for (const inst of cancellable) {
        await tx.instalment.update({ where: { id: inst.id }, data: { cancelledAt: new Date() } });
        await audit(tx, {
          area: "FEES",
          action: "instalment.cancelled",
          studentId: id,
          subject: `Instalment ${inst.sequence}`,
          fromValue: "Due",
          toValue: "Cancelled",
          reason: "Withdrawn before this instalment was due. Instalments already due remain payable.",
        });
      }
    }
    return updated;
  });
}
