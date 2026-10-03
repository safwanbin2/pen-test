// Loads charges and payments and derives account figures with the pure
// finance rules. Nothing about balances is stored (D3).

import { db } from "../db";
import { accountSummary, type AccountSummary, type InstalmentInput } from "../domain/finance";
import { ukToday } from "../domain/time";

type ChargeWithInstalments = {
  id: string;
  academicYear: string;
  description: string;
  amountPence: number;
  createdAt: Date;
  instalments: { id: string; sequence: number; dueDate: Date; amountPence: number; cancelledAt: Date | null }[];
};

export function toInstalmentInputs(charges: ChargeWithInstalments[]): InstalmentInput[] {
  return charges.flatMap((c) =>
    c.instalments.map((i) => ({
      id: i.id,
      sequence: i.sequence,
      dueDate: i.dueDate,
      amountPence: i.amountPence,
      cancelled: i.cancelledAt !== null,
    })),
  );
}

/** Full account for one student: the charges, payments and derived summary. */
export async function getAccount(studentId: string, today = ukToday()) {
  const [charges, payments] = await Promise.all([
    db.feeCharge.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
      include: { instalments: { orderBy: { sequence: "asc" } } },
    }),
    db.payment.findMany({ where: { studentId }, orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }] }),
  ]);
  const instalments = toInstalmentInputs(charges);
  return { charges, payments, instalments, summary: accountSummary(instalments, payments, today) };
}

/** Summaries for many students in two queries (lists and the dashboard). */
export async function getAccountSummaries(studentIds: string[], today = ukToday()) {
  const [charges, payments] = await Promise.all([
    db.feeCharge.findMany({ where: { studentId: { in: studentIds } }, include: { instalments: true } }),
    db.payment.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, amountPence: true, paidOn: true },
      orderBy: { paidOn: "desc" },
    }),
  ]);
  const result = new Map<
    string,
    AccountSummary & { lastPayment: { paidOn: Date; amountPence: number } | null }
  >();
  for (const id of studentIds) {
    const own = charges.filter((c) => c.studentId === id);
    const paid = payments.filter((p) => p.studentId === id);
    result.set(id, {
      ...accountSummary(toInstalmentInputs(own), paid, today),
      lastPayment: paid[0] ? { paidOn: paid[0].paidOn, amountPence: paid[0].amountPence } : null,
    });
  }
  return result;
}
