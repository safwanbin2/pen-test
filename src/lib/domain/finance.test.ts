import { describe, expect, it } from "vitest";
import { accountSummary, paymentsByInstalment, planInstalments, previewPayment, type InstalmentInput } from "./finance";
import { DEFAULT_INSTALMENT_PERCENTS, splitByPercent } from "./money";
import { addDays, calendarDate } from "./time";

const TODAY = calendarDate(2026, 10, 22);

/** £9,535 split 25/25/50, due 1 Sep, 1 Oct, 1 Feb (Aisha's plan in the design). */
function businessPlan(): InstalmentInput[] {
  const amounts = splitByPercent(953_500, DEFAULT_INSTALMENT_PERCENTS);
  return planInstalments(amounts, [calendarDate(2026, 9, 1), calendarDate(2026, 10, 1), calendarDate(2027, 2, 1)]).map(
    (i) => ({ ...i, id: `i${i.sequence}` }),
  );
}

describe("accountSummary", () => {
  it("Aisha: instalment 1 paid, instalment 2 overdue 21 days", () => {
    const s = accountSummary(businessPlan(), [{ amountPence: 238_375 }], TODAY);
    expect(s.totalChargedPence).toBe(953_500);
    expect(s.balancePence).toBe(715_125); // £7,151.25
    expect(s.overduePence).toBe(238_375); // £2,383.75
    expect(s.daysOverdue).toBe(21);
    expect(s.instalments.map((i) => i.status)).toEqual(["PAID", "OVERDUE", "DUE"]);
    expect(s.nextDue).toEqual({ dueDate: calendarDate(2027, 2, 1), remainingPence: 476_750, daysUntil: 102 });
    expect(s.creditPence).toBe(0);
  });

  it("Tom: a part-payment leaves the remainder of instalment 2 overdue", () => {
    const plan = businessPlan();
    plan[1].dueDate = addDays(TODAY, -4);
    const s = accountSummary(plan, [{ amountPence: 238_375 }, { amountPence: 150_000 }], TODAY);
    expect(s.overduePence).toBe(88_375); // £883.75
    expect(s.daysOverdue).toBe(4);
    expect(s.balancePence).toBe(565_125); // £5,651.25
    expect(s.instalments[1]).toMatchObject({ paidPence: 150_000, remainingPence: 88_375, status: "OVERDUE" });
  });

  it("Priya: a balance with nothing due yet is not overdue", () => {
    const amounts = splitByPercent(825_000, DEFAULT_INSTALMENT_PERCENTS);
    const plan = planInstalments(amounts, [addDays(TODAY, 9), addDays(TODAY, 40), addDays(TODAY, 102)]).map((i) => ({
      ...i,
      id: `p${i.sequence}`,
    }));
    const s = accountSummary(plan, [], TODAY);
    expect(s.balancePence).toBe(825_000);
    expect(s.overduePence).toBe(0);
    expect(s.daysOverdue).toBe(0);
    expect(s.instalments.every((i) => i.status === "DUE")).toBe(true);
  });

  it("adds up instalments that share the next due date", () => {
    const plan = businessPlan();
    plan[0].dueDate = TODAY;
    plan[1].dueDate = TODAY;
    const s = accountSummary(plan, [], TODAY);
    expect(s.nextDue).toEqual({ dueDate: TODAY, remainingPence: 476_750, daysUntil: 0 });
  });

  it("is due, not overdue, on the due date itself", () => {
    const plan = businessPlan();
    const s = accountSummary(plan, [{ amountPence: 238_375 }], calendarDate(2026, 10, 1));
    expect(s.instalments[1].status).toBe("DUE");
    expect(s.overduePence).toBe(0);
  });

  it("Chen: paying more than charged becomes credit", () => {
    const plan = planInstalments([400_000, 400_000], [calendarDate(2025, 9, 1), calendarDate(2026, 2, 1)]).map((i) => ({
      ...i,
      id: `c${i.sequence}`,
    }));
    const s = accountSummary(plan, [{ amountPence: 400_000 }, { amountPence: 412_000 }], TODAY);
    expect(s.balancePence).toBe(0);
    expect(s.creditPence).toBe(12_000); // £120.00
    expect(s.instalments.every((i) => i.status === "PAID")).toBe(true);
  });

  it("James: cancelled instalments don't count towards the balance", () => {
    const plan = businessPlan();
    plan[2].cancelled = true;
    const s = accountSummary(plan, [{ amountPence: 238_375 }], TODAY);
    expect(s.totalChargedPence).toBe(476_750);
    expect(s.balancePence).toBe(238_375);
    expect(s.instalments[2].status).toBe("CANCELLED");
    expect(s.nextDue).toBeNull();
  });

  it("applies payments to the oldest instalment first, whatever order they are listed in", () => {
    const plan = businessPlan().reverse();
    const s = accountSummary(plan, [{ amountPence: 300_000 }], TODAY);
    const bySeq = Object.fromEntries(s.instalments.map((i) => [i.sequence, i]));
    expect(bySeq[1].status).toBe("PAID");
    expect(bySeq[2]).toMatchObject({ paidPence: 61_625, status: "OVERDUE" });
    expect(bySeq[3].paidPence).toBe(0);
  });
});

describe("previewPayment", () => {
  it("shows which instalment a payment clears and the new figures", () => {
    const { appliedTo, after } = previewPayment(businessPlan(), [{ amountPence: 238_375 }], 50_000, TODAY);
    expect(appliedTo?.sequence).toBe(2);
    expect(after.overduePence).toBe(188_375); // £1,883.75 still overdue
    expect(after.balancePence).toBe(665_125);
  });

  it("clears the overdue amount when the payment covers it", () => {
    const { after } = previewPayment(businessPlan(), [{ amountPence: 238_375 }], 238_375, TODAY);
    expect(after.overduePence).toBe(0);
    expect(after.daysOverdue).toBe(0);
  });

  it("reports credit when a payment exceeds the balance", () => {
    const { after } = previewPayment(businessPlan(), [{ amountPence: 238_375 }], 800_000, TODAY);
    expect(after.balancePence).toBe(0);
    expect(after.creditPence).toBe(84_875);
  });
});

describe("splitByPercent", () => {
  it("splits £9,535 into 25/25/50", () => {
    expect(splitByPercent(953_500, [25, 25, 50])).toEqual([238_375, 238_375, 476_750]);
  });

  it("puts rounding pennies on the last instalment so the total is exact", () => {
    const parts = splitByPercent(100_001, [25, 25, 50]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100_001);
    expect(parts).toEqual([25_000, 25_000, 50_001]);
  });

  it("rejects percentages that don't add up to 100", () => {
    expect(() => splitByPercent(1000, [50, 40])).toThrow();
  });
});

describe("paymentsByInstalment", () => {
  it("links each instalment to the payments that cleared it, oldest first", () => {
    const plan = businessPlan();
    const p1 = { amountPence: 238_375, paidOn: calendarDate(2026, 9, 1), ref: "SFE-1" };
    const p2 = { amountPence: 300_000, paidOn: calendarDate(2026, 10, 5), ref: "BACS-2" };
    const map = paymentsByInstalment(plan, [p2, p1]);
    expect(map.get("i1")!.map((p) => p.ref)).toEqual(["SFE-1"]);
    expect(map.get("i2")!.map((p) => p.ref)).toEqual(["BACS-2"]);
    expect(map.get("i3")!.map((p) => p.ref)).toEqual(["BACS-2"]);
  });
});
