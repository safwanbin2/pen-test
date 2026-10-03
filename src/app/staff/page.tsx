import Link from "next/link";
import { Lock } from "lucide-react";
import { Money, Mono } from "@/components/money";
import { OverdueBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SEVERE_OVERDUE_DAYS } from "@/lib/domain/finance";
import { formatDate, formatGBP, formatLongToday, FUNDING_LABEL, plural, WITHHOLD_REASON_LABEL } from "@/lib/format";
import { getDashboard } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard · Registry" };

function QueueLink({
  href,
  label,
  count,
  detail,
  tone,
  current,
}: {
  href: string;
  label: string;
  count: number;
  detail: string;
  tone?: "overdue" | "late" | "withheld";
  current?: boolean;
}) {
  const color =
    count === 0
      ? "text-foreground"
      : tone === "overdue"
        ? "text-status-overdue"
        : tone === "late"
          ? "text-status-late"
          : tone === "withheld"
            ? "text-status-withheld"
            : "text-foreground";
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={cn(
        "flex flex-col gap-0.5 border-b px-4 py-3 last:border-b-0 hover:bg-muted sm:border-r sm:border-b-0 sm:last:border-r-0",
        current && "bg-muted shadow-[inset_0_-2px_0_var(--primary)]",
      )}
    >
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={cn("font-mono text-xl leading-7 font-medium", color)}>{count}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const { today, academicYear, overdue, overdueTotalPence, queues } = await getDashboard();
  const oldest = overdue[0]?.account.daysOverdue ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`What needs action today, ${formatLongToday(new Date())}.`}
        actions={
          <span className="text-xs text-muted-foreground">
            Academic year <Mono className="ml-1 text-foreground">{academicYear}</Mono>
          </span>
        }
      />

      <nav aria-label="Work queues" className="grid overflow-hidden rounded-lg border sm:grid-cols-5">
        <QueueLink
          href="#overdue"
          current
          label="Overdue fees"
          count={queues.overdue.count}
          tone="overdue"
          detail={queues.overdue.count ? `${formatGBP(overdueTotalPence)} · oldest ${plural(oldest, "day")}` : "Nothing overdue"}
        />
        <QueueLink
          href="/staff/assessments?filter=late"
          label="Late submissions (7 days)"
          count={queues.late.count}
          tone="late"
          detail={queues.late.codes.join(", ") || "None this week"}
        />
        <QueueLink
          href={queues.awaitingMarking.assessmentId ? `/staff/assessments/${queues.awaitingMarking.assessmentId}?filter=unmarked` : "/staff/assessments"}
          label="Awaiting marking"
          count={queues.awaitingMarking.count}
          detail={queues.awaitingMarking.codes.join(", ") || "All marked"}
        />
        <QueueLink
          href={queues.toPublish.assessmentId ? `/staff/results?assessment=${queues.toPublish.assessmentId}` : "/staff/results"}
          label="Marked, not published"
          count={queues.toPublish.count}
          detail={queues.toPublish.count ? `${queues.toPublish.codes.join(", ")} · ready to publish` : "Nothing waiting"}
        />
        <QueueLink
          href={queues.withheld.assessmentId ? `/staff/results?assessment=${queues.withheld.assessmentId}` : "/staff/results"}
          label="Withheld results"
          count={queues.withheld.count}
          tone="withheld"
          detail={queues.withheld.reasons.map((r) => WITHHOLD_REASON_LABEL[r]).join(", ") || "None withheld"}
        />
      </nav>

      <section id="overdue" aria-labelledby="overdue-h" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="overdue-h" className="text-base font-semibold">Overdue fees</h2>
            <p className="text-xs text-muted-foreground">
              {plural(overdue.length, "student")} · <Money pence={overdueTotalPence} className="text-xs" /> past due ·
              sorted by days overdue
            </p>
          </div>
          <Link href="/staff/students?overdue=1" className="font-medium text-primary underline-offset-4 hover:underline">
            Open in Students
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[960px] border-collapse whitespace-nowrap">
            <thead className="bg-muted text-left text-xs font-medium text-muted-foreground">
              <tr className="h-9">
                <th scope="col" className="px-3 font-medium">Student</th>
                <th scope="col" className="px-3 font-medium">Student ID</th>
                <th scope="col" className="px-3 font-medium">Programme</th>
                <th scope="col" className="px-3 font-medium">Funding</th>
                <th scope="col" className="px-3 text-right font-medium">Amount overdue</th>
                <th scope="col" aria-sort="descending" className="px-3 font-medium">Days overdue ↓</th>
                <th scope="col" className="px-3 font-medium">Last payment</th>
                <th scope="col" className="px-3 text-right font-medium"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {overdue.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No overdue fees. Everyone is up to date.
                  </td>
                </tr>
              )}
              {overdue.map(({ student, account }) => {
                const withheld = student.marks[0];
                const severe = account.daysOverdue > SEVERE_OVERDUE_DAYS;
                const partPaid = account.instalments.some((i) => i.status === "OVERDUE" && i.paidPence > 0);
                const note = withheld
                  ? { icon: true, text: `Results withheld · ${WITHHOLD_REASON_LABEL[withheld.withholdReason ?? "OTHER"]}` }
                  : student.status === "WITHDRAWN"
                    ? { icon: false, text: "Withdrawn · fees remain payable" }
                    : partPaid
                      ? { icon: false, text: "Part-paid" }
                      : null;
                return (
                  <tr key={student.id} className={cn("h-[52px] border-t", severe && "bg-status-overdue-subtle")}>
                    <td className="px-3">
                      <Link href={`/staff/students/${student.id}?tab=finance`} className="block font-medium hover:underline">
                        {student.fullName}
                      </Link>
                      {note && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {note.icon && <Lock aria-hidden className="size-3" />}
                          {note.text}
                        </span>
                      )}
                    </td>
                    <td className="px-3"><Mono>{student.studentNumber}</Mono></td>
                    <td className="px-3">{student.programme.name}</td>
                    <td className="px-3">{FUNDING_LABEL[student.fundingSource]}</td>
                    <td className="px-3 text-right">
                      <Money pence={account.overduePence} className="font-medium text-status-overdue" />
                    </td>
                    <td className="px-3"><OverdueBadge days={account.daysOverdue} /></td>
                    <td className="px-3 font-mono text-[13px]">
                      {account.lastPayment ? (
                        <>
                          {formatDate(account.lastPayment.paidOn)}{" "}
                          <span className="text-muted-foreground">· {formatGBP(account.lastPayment.amountPence)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/staff/students/${student.id}?tab=finance&pay=1`}>Record payment</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Highlighted rows are more than {SEVERE_OVERDUE_DAYS} days overdue. Withholding results is a separate step in
          Results and always asks for a reason.
        </p>
        <p className="sr-only">Figures as of {formatDate(today)}.</p>
      </section>
    </>
  );
}
