// Fee account maths. Nothing here is stored: balances, overdue amounts and
// instalment statuses are derived from charges (instalments) and payments
// every time (D3). Payments clear the oldest unpaid instalment first (D20).
// An instalment is overdue from the day after its due date (D1).

import { daysBetween } from "./time";

export type InstalmentInput = {
  id: string;
  sequence: number;
  dueDate: Date;
  amountPence: number;
  cancelled?: boolean;
};

export type PaymentInput = { amountPence: number };

export type InstalmentStatus = "PAID" | "DUE" | "OVERDUE" | "CANCELLED";

export type InstalmentState = InstalmentInput & {
  paidPence: number;
  remainingPence: number;
  status: InstalmentStatus;
  /** > 0 only when OVERDUE. */
  daysOverdue: number;
};

export type AccountSummary = {
  totalChargedPence: number;
  totalPaidPence: number;
  /** Still to pay across all active instalments (never negative). */
  balancePence: number;
  /** Paid beyond what is charged. */
  creditPence: number;
  overduePence: number;
  /** Days the oldest unpaid overdue instalment is late; 0 when nothing is overdue. */
  daysOverdue: number;
  nextDue: { dueDate: Date; remainingPence: number; daysUntil: number } | null;
  instalments: InstalmentState[];
};

/** Rows on the dashboard are highlighted beyond this many days overdue. */
export const SEVERE_OVERDUE_DAYS = 14;

export function accountSummary(
  instalments: InstalmentInput[],
  payments: PaymentInput[],
  today: Date,
): AccountSummary {
  const totalPaidPence = payments.reduce((sum, p) => sum + p.amountPence, 0);
  const active = instalments
    .filter((i) => !i.cancelled)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.sequence - b.sequence);

  let pool = totalPaidPence;
  const allocated = new Map<InstalmentInput, InstalmentState>();
  for (const inst of active) {
    const paidPence = Math.min(pool, inst.amountPence);
    pool -= paidPence;
    const remainingPence = inst.amountPence - paidPence;
    const late = daysBetween(inst.dueDate, today);
    const status: InstalmentStatus = remainingPence === 0 ? "PAID" : late > 0 ? "OVERDUE" : "DUE";
    allocated.set(inst, { ...inst, paidPence, remainingPence, status, daysOverdue: status === "OVERDUE" ? late : 0 });
  }

  // Keep the caller's order and include cancelled instalments for display.
  const states = instalments.map(
    (inst) =>
      allocated.get(inst) ?? { ...inst, paidPence: 0, remainingPence: 0, status: "CANCELLED" as const, daysOverdue: 0 },
  );

  const totalChargedPence = active.reduce((sum, i) => sum + i.amountPence, 0);
  const overdue = states.filter((s) => s.status === "OVERDUE");
  const upcoming = active.map((i) => allocated.get(i)!).find((s) => s.status === "DUE");

  return {
    totalChargedPence,
    totalPaidPence,
    balancePence: Math.max(0, totalChargedPence - totalPaidPence),
    creditPence: Math.max(0, totalPaidPence - totalChargedPence),
    overduePence: overdue.reduce((sum, s) => sum + s.remainingPence, 0),
    daysOverdue: overdue.reduce((max, s) => Math.max(max, s.daysOverdue), 0),
    // Everything due on the next due date (two instalments can share a date, e.g. after a late enrolment).
    nextDue: upcoming
      ? {
          dueDate: upcoming.dueDate,
          remainingPence: active
            .map((i) => allocated.get(i)!)
            .filter((s) => s.status === "DUE" && s.dueDate.getTime() === upcoming.dueDate.getTime())
            .reduce((sum, s) => sum + s.remainingPence, 0),
          daysUntil: daysBetween(today, upcoming.dueDate),
        }
      : null,
    instalments: states,
  };
}

/**
 * What recording a payment would do, for the "New balance after this payment"
 * panel: which instalment it clears first and the account afterwards.
 */
export function previewPayment(
  instalments: InstalmentInput[],
  payments: PaymentInput[],
  amountPence: number,
  today: Date,
): { appliedTo: InstalmentState | null; after: AccountSummary } {
  const before = accountSummary(instalments, payments, today);
  const appliedTo =
    before.instalments
      .filter((s) => s.remainingPence > 0)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.sequence - b.sequence)[0] ?? null;
  return { appliedTo, after: accountSummary(instalments, [...payments, { amountPence }], today) };
}

/** Instalment amounts and due dates for a new charge. */
export function planInstalments(
  amounts: number[],
  dueDates: Date[],
): { sequence: number; dueDate: Date; amountPence: number }[] {
  if (amounts.length !== dueDates.length) throw new Error("Need one due date per instalment");
  return amounts.map((amountPence, i) => ({ sequence: i + 1, dueDate: dueDates[i], amountPence }));
}


/**
 * Which payments cleared which instalment, for display ("1 Sep 2026 ·
 * SFE-2026-118204"). Payments are applied in date order to the oldest unpaid
 * instalment first (D20), the same rule as accountSummary.
 */
export function paymentsByInstalment<P extends PaymentInput & { paidOn: Date }>(
  instalments: InstalmentInput[],
  payments: P[],
): Map<string, P[]> {
  const queue = instalments
    .filter((i) => !i.cancelled)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.sequence - b.sequence)
    .map((i) => ({ id: i.id, remaining: i.amountPence }));
  const result = new Map<string, P[]>(queue.map((q) => [q.id, []]));
  for (const payment of [...payments].sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime())) {
    let left = payment.amountPence;
    for (const q of queue) {
      if (left === 0) break;
      if (q.remaining === 0) continue;
      const used = Math.min(left, q.remaining);
      q.remaining -= used;
      left -= used;
      result.get(q.id)!.push(payment);
    }
  }
  return result;
}
