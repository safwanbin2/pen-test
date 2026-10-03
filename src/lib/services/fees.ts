import type { z } from "zod";
import { db } from "../db";
import { audit } from "../audit";
import { conflict, notFound, unprocessable } from "../errors";
import { academicYearFor, academicYearStart, shiftAcademicYear } from "../domain/academicYear";
import { accountSummary } from "../domain/finance";
import { formatGBP } from "../domain/money";
import { ukToday } from "../domain/time";
import { formatDate } from "../format";
import { DEMO_STAFF } from "../session";
import type { paymentInput } from "../validation";
import { getAccount } from "./accounts";

// ---------------------------------------------------------------------------
// Programme fees
// ---------------------------------------------------------------------------

/** Fees for the previous (closed) and current academic year, with who has been charged. */
export async function listProgrammeFees(today = ukToday()) {
  const current = academicYearFor(today);
  const previous = shiftAcademicYear(current, -1);
  const programmes = await db.programme.findMany({
    orderBy: { name: "asc" },
    include: {
      fees: { where: { academicYear: { in: [previous, current] } } },
      students: {
        where: { feeCharges: { some: { academicYear: current } } },
        select: { fullName: true, feeCharges: { where: { academicYear: current }, select: { amountPence: true } } },
        orderBy: { fullName: "asc" },
      },
    },
  });
  return {
    current,
    previous,
    rows: programmes.map((p) => ({
      id: p.id,
      name: p.name,
      previousFee: p.fees.find((f) => f.academicYear === previous)?.amountPence ?? null,
      currentFee: p.fees.find((f) => f.academicYear === current)?.amountPence ?? null,
      chargedStudents: p.students.map((s) => ({ name: s.fullName, amountPence: s.feeCharges[0]?.amountPence ?? 0 })),
    })),
  };
}

/** Set a programme's fee for the current or a future year. Applies to new charges only (D2). */
export async function setProgrammeFee(programmeId: string, academicYear: string, amountPence: number) {
  const current = academicYearFor(ukToday());
  if (academicYearStart(academicYear) < academicYearStart(current)) {
    throw unprocessable("Closed years can't be edited.", { academicYear: "Closed years can't be edited." });
  }
  const programme = await db.programme.findUnique({ where: { id: programmeId } });
  if (!programme) throw notFound("Programme");
  const existing = await db.programmeFee.findUnique({
    where: { programmeId_academicYear: { programmeId, academicYear } },
  });
  return db.$transaction(async (tx) => {
    const fee = await tx.programmeFee.upsert({
      where: { programmeId_academicYear: { programmeId, academicYear } },
      create: { programmeId, academicYear, amountPence, updatedBy: DEMO_STAFF.actorName },
      update: { amountPence, updatedBy: DEMO_STAFF.actorName },
    });
    await audit(tx, {
      area: "FEES",
      action: "fee.updated",
      subject: `${programme.name}, ${academicYear}`,
      fromValue: existing ? formatGBP(existing.amountPence) : "Not set",
      toValue: formatGBP(amountPence),
      reason: "Applies to new charges only.",
    });
    return fee;
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(studentId: string, input: z.infer<typeof paymentInput>) {
  if (!(await db.student.findUnique({ where: { id: studentId }, select: { id: true } }))) throw notFound("Student");
  const today = ukToday();
  if (input.paidOn > today) {
    throw unprocessable("Payment date can't be in the future", { paidOn: "Today or earlier. Not in the future." });
  }
  const duplicate = await db.payment.findUnique({
    where: { reference: input.reference },
    include: { student: { select: { fullName: true } } },
  });
  if (duplicate) {
    throw conflict("Duplicate reference", {
      reference: `Reference ${duplicate.reference} is already recorded for ${duplicate.student.fullName} on ${formatDate(duplicate.paidOn)}.`,
      duplicateStudentId: duplicate.studentId,
    });
  }
  const account = await getAccount(studentId, today);

  const after = accountSummary(account.instalments, [...account.payments, { amountPence: input.amountPence }], today);
  const before = account.summary;

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { studentId, ...input, note: input.note || null, recordedBy: DEMO_STAFF.actorName },
    });
    // Record what this payment changed, instalment by instalment (D20).
    const changes = after.instalments.filter((a) => {
      const b = before.instalments.find((x) => x.id === a.id);
      return b && b.paidPence !== a.paidPence;
    });
    for (const a of changes) {
      const b = before.instalments.find((x) => x.id === a.id)!;
      await audit(tx, {
        area: "FEES",
        action: "payment.recorded",
        studentId,
        subject: `Instalment ${a.sequence}${a.status === "PAID" ? "" : " (part)"}`,
        fromValue: b.status === "OVERDUE" ? "Overdue" : "Due",
        toValue: a.status === "PAID" ? "Paid" : b.status === "OVERDUE" ? "Overdue" : "Due",
        reason: `Payment ${payment.reference} of ${formatGBP(payment.amountPence)} received.`,
      });
    }
    if (changes.length === 0) {
      await audit(tx, {
        area: "FEES",
        action: "payment.recorded",
        studentId,
        subject: "Credit",
        toValue: formatGBP(after.creditPence),
        reason: `Payment ${payment.reference} of ${formatGBP(payment.amountPence)} received; nothing was owed, so it is held as credit.`,
      });
    }
    return { payment, after };
  });
}

/** Programmes with their fee per academic year, for the new-student form. */
export async function programmesWithFees() {
  const programmes = await db.programme.findMany({ orderBy: { name: "asc" }, include: { fees: true } });
  return programmes.map((p) => ({
    id: p.id,
    name: p.name,
    fees: Object.fromEntries(p.fees.map((f) => [f.academicYear, f.amountPence])),
  }));
}
