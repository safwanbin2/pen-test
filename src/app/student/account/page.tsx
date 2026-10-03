import { redirect } from "next/navigation";
import { Money, Mono } from "@/components/money";
import { InstalmentBadge, OverdueBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ukToday } from "@/lib/domain/time";
import { formatDate, PAYMENT_METHOD_LABEL, REGISTRY_CONTACT, relativeDays } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getAccount } from "@/lib/services/accounts";
import { getCurrentStudent } from "@/lib/services/students";
import { cn } from "@/lib/utils";

export const metadata = { title: "My account · Registry" };

export default async function MyAccountPage() {
  const session = await getSession();
  const student = await getCurrentStudent(session.studentNumber);
  if (!student) redirect("/staff");
  const today = ukToday();
  const { charges, payments, summary } = await getAccount(student.id, today);
  const overdueFirst = summary.instalments.filter((i) => i.status === "OVERDUE").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl leading-7 font-semibold tracking-tight">My account</h1>
          <p className="text-muted-foreground">
            {charges[0] ? `Tuition fees for ${student.programme.name}, ${charges[0].academicYear}. Read-only.` : "No fees have been charged yet."}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={REGISTRY_CONTACT}>Contact Registry</a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cn("flex flex-col gap-1 rounded-lg border p-4", summary.overduePence > 0 && "border-status-overdue/30 bg-status-overdue-subtle")}>
          <span className="flex items-center gap-2 text-xs font-medium text-foreground/80">
            Overdue now {summary.overduePence > 0 && <OverdueBadge days={summary.daysOverdue} />}
          </span>
          <Money pence={summary.overduePence} className={cn("text-xl font-medium", summary.overduePence > 0 && "text-status-overdue")} />
          <span className="text-xs text-muted-foreground">
            {overdueFirst ? `Instalment ${overdueFirst.sequence} was due on ${formatDate(overdueFirst.dueDate)}.` : "Nothing overdue."}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-xs font-medium text-foreground/80">Next due</span>
          <Money pence={summary.nextDue?.remainingPence ?? 0} className="text-xl font-medium" />
          <span className="text-xs text-muted-foreground">
            {summary.nextDue ? `${formatDate(summary.nextDue.dueDate)} · ${relativeDays(summary.nextDue.daysUntil)}` : "No upcoming instalments."}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-xs font-medium text-foreground/80">{summary.creditPence ? "Credit" : "Left to pay"}</span>
          <Money pence={summary.creditPence || summary.balancePence} className="text-xl font-medium" />
          <span className="text-xs text-muted-foreground">
            of <Money pence={summary.totalChargedPence} className="text-xs" /> · <Money pence={summary.totalPaidPence} className="text-xs" /> paid
          </span>
        </div>
      </div>

      <section aria-labelledby="sched-h" className="flex flex-col gap-3">
        <h2 id="sched-h" className="text-base font-semibold">Instalment schedule</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr className="h-9">
                <th scope="col" className="px-4 font-medium">Instalment</th>
                <th scope="col" className="px-3 font-medium">Due</th>
                <th scope="col" className="px-3 text-right font-medium">Amount</th>
                <th scope="col" className="px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {charges.flatMap((c) =>
                c.instalments.map((i) => {
                  const s = summary.instalments.find((x) => x.id === i.id)!;
                  return (
                    <tr key={i.id} className={cn("h-11 border-t", s.status === "OVERDUE" && "bg-status-overdue-subtle")}>
                      <td className="px-4">
                        Instalment {i.sequence}{" "}
                        <span className="text-muted-foreground">· {Math.round((i.amountPence / c.amountPence) * 100)}%</span>
                      </td>
                      <td className="px-3"><Mono>{formatDate(i.dueDate)}</Mono></td>
                      <td className="px-3 text-right"><Money pence={i.amountPence} /></td>
                      <td className="px-4"><InstalmentBadge status={s.status} daysOverdue={s.daysOverdue} dueDate={i.dueDate} /></td>
                    </tr>
                  );
                }),
              )}
              {charges.length === 0 && (
                <tr className="border-t"><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nothing charged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="hist-h" className="flex flex-col gap-3">
        <h2 id="hist-h" className="text-base font-semibold">Payment history</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr className="h-9">
                <th scope="col" className="px-4 font-medium">Date</th>
                <th scope="col" className="px-3 font-medium">From</th>
                <th scope="col" className="px-3 font-medium">Reference</th>
                <th scope="col" className="px-4 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr className="border-t"><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No payments received yet.</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="h-11 border-t">
                  <td className="px-4"><Mono>{formatDate(p.paidOn)}</Mono></td>
                  <td className="px-3">{PAYMENT_METHOD_LABEL[p.method]}</td>
                  <td className="px-3"><Mono>{p.reference}</Mono></td>
                  <td className="px-4 text-right"><Money pence={p.amountPence} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Payments can take up to 3 working days to appear. Questions about what you owe?{" "}
          <a href={REGISTRY_CONTACT} className="font-medium text-primary underline-offset-4 hover:underline">Contact Registry</a>.
        </p>
      </section>
    </>
  );
}
