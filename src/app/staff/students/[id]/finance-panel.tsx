import { InstalmentBadge, StatusBadge } from "@/components/status-badge";
import { Money } from "@/components/money";
import { TableFrame, Td, Th, THead, Tr, EmptyRow } from "@/components/data-table";
import { paymentsByInstalment, type AccountSummary } from "@/lib/domain/finance";
import { daysBetween } from "@/lib/domain/time";
import { formatDate, formatUkDate, PAYMENT_METHOD_LABEL, relativeDays } from "@/lib/format";
import type { getAccount } from "@/lib/services/accounts";
import { cn } from "@/lib/utils";

type Account = Awaited<ReturnType<typeof getAccount>>;

const SEGMENT: Record<string, string> = {
  PAID: "bg-foreground/75",
  OVERDUE: "bg-status-overdue",
  DUE: "border border-dashed border-input bg-background",
  CANCELLED: "bg-muted",
};

export function FinancePanel({
  account,
  today,
  recordPayment,
  withheldNote,
}: {
  account: Account;
  today: Date;
  recordPayment: React.ReactNode;
  withheldNote: boolean;
}) {
  const { charges, payments, summary } = account;
  const states = new Map(summary.instalments.map((s) => [s.id, s]));
  const clearedBy = paymentsByInstalment(account.instalments, payments);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="ch-h" className="flex flex-col gap-3">
          <h2 id="ch-h" className="text-base font-semibold">Charge and instalments</h2>
          {charges.length === 0 && (
            <p className="rounded-lg border px-4 py-6 text-center text-muted-foreground">No fees charged yet.</p>
          )}
          {charges.map((charge) => {
            const total = charge.instalments.reduce((s, i) => s + i.amountPence, 0) || 1;
            return (
              <div key={charge.id} className="overflow-hidden rounded-lg border">
                <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
                  <div>
                    <div className="font-medium">{charge.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Charged {formatUkDate(charge.createdAt)} · paid in {charge.instalments.length} instalments
                    </div>
                  </div>
                  <Money pence={charge.amountPence} className="text-[15px] font-medium" />
                </div>
                <div className="px-4 pb-4" aria-hidden>
                  <div className="flex h-2 gap-[3px]">
                    {charge.instalments.map((i) => (
                      <div
                        key={i.id}
                        className={cn("rounded-full", SEGMENT[states.get(i.id)!.status])}
                        style={{ flex: `${(i.amountPence / total) * 100} 1 0` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-[3px] text-xs">
                    {charge.instalments.map((i) => {
                      const s = states.get(i.id)!;
                      return (
                        <div
                          key={i.id}
                          style={{ flex: `${(i.amountPence / total) * 100} 1 0` }}
                          className={cn(
                            "text-muted-foreground",
                            s.status === "OVERDUE" && "font-medium text-status-overdue",
                            s.status === "PAID" && "text-foreground/80",
                          )}
                        >
                          {i.sequence} ·{" "}
                          {s.status === "PAID"
                            ? "Paid"
                            : s.status === "OVERDUE"
                              ? `Overdue ${s.daysOverdue} days`
                              : s.status === "CANCELLED"
                                ? "Cancelled"
                                : `Due ${formatDate(i.dueDate)}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <table className="w-full border-collapse border-t text-left" aria-label="Instalments">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr className="h-9">
                      <th scope="col" className="px-4 font-medium">Instalment</th>
                      <th scope="col" className="px-3 font-medium">Due date</th>
                      <th scope="col" className="px-3 text-right font-medium">Amount</th>
                      <th scope="col" className="px-3 font-medium">Status</th>
                      <th scope="col" className="px-4 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charge.instalments.map((i) => {
                      const s = states.get(i.id)!;
                      const percent = Math.round((i.amountPence / charge.amountPence) * 100);
                      const cleared = clearedBy.get(i.id) ?? [];
                      return (
                        <tr key={i.id} className={cn("h-11 border-t", s.status === "OVERDUE" && "bg-status-overdue-subtle")}>
                          <td className="px-4">
                            {i.sequence} <span className="text-muted-foreground">· {percent}%</span>
                          </td>
                          <td className="px-3 font-mono text-[13px]">{formatDate(i.dueDate)}</td>
                          <td className="px-3 text-right">
                            <Money pence={i.amountPence} className={cn(s.status === "OVERDUE" && "font-medium text-status-overdue")} />
                            {s.status !== "PAID" && s.paidPence > 0 && (
                              <div className="text-xs text-muted-foreground"><Money pence={s.remainingPence} className="text-xs" /> left</div>
                            )}
                          </td>
                          <td className="px-3">
                            <InstalmentBadge status={s.status} daysOverdue={s.daysOverdue} dueDate={i.dueDate} />
                          </td>
                          <td className="px-4 text-xs text-muted-foreground">
                            {s.status === "PAID" && cleared.length > 0
                              ? cleared.map((p) => `${formatDate(p.paidOn)} · ${p.reference}`).join(", ")
                              : s.status === "OVERDUE"
                                ? cleared.length > 0
                                  ? `Part-paid · ${cleared.map((p) => p.reference).join(", ")}`
                                  : "No payment received"
                                : s.status === "DUE"
                                  ? relativeDays(daysBetween(today, i.dueDate))
                                  : "Not payable"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="pay-h" className="flex flex-col gap-3">
          <h2 id="pay-h" className="text-base font-semibold">Payments</h2>
          <TableFrame label="Payments">
            <THead>
              <Th>Date</Th>
              <Th>Reference</Th>
              <Th>Method</Th>
              <Th align="right">Amount</Th>
              <Th>Recorded by</Th>
            </THead>
            <tbody>
              {payments.length === 0 && <EmptyRow colSpan={5}>No payments received yet.</EmptyRow>}
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td mono>{formatDate(p.paidOn)}</Td>
                  <Td mono>{p.reference}</Td>
                  <Td>{PAYMENT_METHOD_LABEL[p.method]}</Td>
                  <Td align="right"><Money pence={p.amountPence} /></Td>
                  <Td className="text-muted-foreground">{p.recordedBy === "Registry" ? "SFE payment import" : p.recordedBy}</Td>
                </Tr>
              ))}
            </tbody>
          </TableFrame>
        </section>
      </div>

      <BalanceCard summary={summary} recordPayment={recordPayment} withheldNote={withheldNote} />
    </div>
  );
}

function BalanceCard({
  summary,
  recordPayment,
  withheldNote,
}: {
  summary: AccountSummary;
  recordPayment: React.ReactNode;
  withheldNote: boolean;
}) {
  return (
    <aside aria-labelledby="bal-h" className="flex h-fit flex-col gap-3 rounded-lg border p-4 lg:sticky lg:top-4">
      <h2 id="bal-h" className="text-base font-semibold">Balance</h2>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
        <dt className="text-muted-foreground">Charged</dt>
        <dd className="text-right"><Money pence={summary.totalChargedPence} /></dd>
        <dt className="text-muted-foreground">Paid</dt>
        <dd className="text-right"><Money pence={summary.totalPaidPence} /></dd>
        <dt className="border-t pt-1.5 font-medium">{summary.creditPence ? "Credit" : "Balance"}</dt>
        <dd className="border-t pt-1.5 text-right">
          <Money pence={summary.creditPence || summary.balancePence} className="text-[15px] font-medium" />
        </dd>
      </dl>
      {summary.overduePence > 0 && (
        <div className="flex items-center justify-between rounded-md bg-status-overdue-subtle px-3 py-2">
          <span className="flex flex-col">
            <span className="text-xs font-medium text-status-overdue">Overdue now</span>
            <span className="text-xs text-muted-foreground">{summary.daysOverdue} days</span>
          </span>
          <Money pence={summary.overduePence} className="font-medium text-status-overdue" />
        </div>
      )}
      {summary.nextDue && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Next due {formatDate(summary.nextDue.dueDate)}</span>
          <Money pence={summary.nextDue.remainingPence} />
        </div>
      )}
      {summary.creditPence > 0 && (
        <StatusBadge tone="submitted" className="self-start">Held as credit</StatusBadge>
      )}
      <div className="[&_button]:w-full">{recordPayment}</div>
      {withheldNote && (
        <p className="text-xs text-muted-foreground">
          Results stay withheld (Fees outstanding) until someone releases them in Results. Recording a payment does not
          release them.
        </p>
      )}
    </aside>
  );
}
