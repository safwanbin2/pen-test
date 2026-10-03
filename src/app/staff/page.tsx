import Link from "next/link";
import { Lock } from "lucide-react";
import { Money, Mono } from "@/components/money";
import { EmptyDatabaseHint } from "@/components/empty-database-hint";
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
  className,
}: {
  href: string;
  label: string;
  count: number;
  detail: string;
  tone?: "overdue" | "late" | "withheld";
  current?: boolean;
  className?: string;
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
        "flex min-w-0 flex-col gap-0.5 bg-background px-4 py-3 hover:bg-muted",
        current && "bg-muted shadow-[inset_0_-2px_0_var(--primary)]",
        className,
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
  const { studentCount, today, academicYear, overdue, overdueTotalPence, queues } = await getDashboard();
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

      {studentCount === 0 && <EmptyDatabaseHint what="Nothing to work on yet." />}

      {/* 5 across ≥ 1024px, 3 + 2 on tablets, 2 per row on phones; 1px gaps draw the dividers */}
      <nav aria-label="Work queues" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-6 lg:grid-cols-5">
        <QueueLink
          href="#overdue"
          current
          className="sm:col-span-2 lg:col-span-1"
          label="Overdue fees"
          count={queues.overdue.count}
          tone="overdue"
          detail={queues.overdue.count ? `${formatGBP(overdueTotalPence)} · oldest ${plural(oldest, "day")}` : "Nothing overdue"}
        />
        <QueueLink
          href="/staff/assessments?filter=late"
          className="sm:col-span-2 lg:col-span-1"
          label="Late submissions (7 days)"
          count={queues.late.count}
          tone="late"
          detail={queues.late.codes.join(", ") || "None this week"}
        />
        <QueueLink
          href={queues.awaitingMarking.assessmentId ? `/staff/assessments/${queues.awaitingMarking.assessmentId}?filter=unmarked` : "/staff/assessments"}
          className="sm:col-span-2 lg:col-span-1"
          label="Awaiting marking"
          count={queues.awaitingMarking.count}
          detail={queues.awaitingMarking.codes.join(", ") || "All marked"}
        />
        <QueueLink
          href={queues.toPublish.assessmentId ? `/staff/results?assessment=${queues.toPublish.assessmentId}` : "/staff/results"}
          className="sm:col-span-3 lg:col-span-1"
          label="Marked, not published"
          count={queues.toPublish.count}
          detail={queues.toPublish.count ? `${queues.toPublish.codes.join(", ")} · ready to publish` : "Nothing waiting"}
        />
        <QueueLink
          href={queues.withheld.assessmentId ? `/staff/results?assessment=${queues.withheld.assessmentId}` : "/staff/results"}
          className="col-span-2 sm:col-span-3 lg:col-span-1"
          label="Withheld results"
          count={queues.withheld.count}
          tone="withheld"
          detail={queues.withheld.reasons.map((r) => WITHHOLD_REASON_LABEL[r]).join(", ") || "None withheld"}
        />
      </nav>

      <section id="overdue" aria-labelledby="overdue-h" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-1">
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

        <div className="relative overflow-x-auto rounded-lg border">
          {/* Tablets drop Programme, Funding and Last payment; phones show each student as a card */}
          <table className="table-stack w-full border-collapse lg:min-w-[960px] lg:whitespace-nowrap">
            <thead className="bg-muted text-left text-xs font-medium whitespace-nowrap text-muted-foreground">
              <tr className="h-9">
                <th scope="col" className="px-3 font-medium">Student</th>
                <th scope="col" className="px-3 font-medium">Student ID</th>
                <th scope="col" className="px-3 font-medium max-lg:hidden">Programme</th>
                <th scope="col" className="px-3 font-medium max-lg:hidden">Funding</th>
                <th scope="col" className="px-3 text-right font-medium">Amount overdue</th>
                <th scope="col" aria-sort="descending" className="px-3 font-medium">Days overdue ↓</th>
                <th scope="col" className="px-3 font-medium max-lg:hidden">Last payment</th>
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
                  <tr key={student.id} className={cn("h-[52px] border-t first:border-t-0 sm:first:border-t", severe && "bg-status-overdue-subtle")}>
                    <td className="px-3 max-lg:px-2 max-sm:col-span-2">
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
                    <td className="px-3 whitespace-nowrap"><Mono>{student.studentNumber}</Mono></td>
                    <td className="px-3 max-lg:hidden">{student.programme.name}</td>
                    <td className="px-3 max-lg:hidden max-sm:block max-sm:justify-self-end max-sm:text-muted-foreground">
                      {FUNDING_LABEL[student.fundingSource]}
                    </td>
                    <td className="px-3 text-right whitespace-nowrap">
                      <Money pence={account.overduePence} className="font-medium text-status-overdue" />
                    </td>
                    <td className="px-3 whitespace-nowrap max-sm:justify-self-end"><OverdueBadge days={account.daysOverdue} /></td>
                    <td className="px-3 font-mono text-[13px] max-lg:hidden">
                      {account.lastPayment ? (
                        <>
                          {formatDate(account.lastPayment.paidOn)}{" "}
                          <span className="text-muted-foreground">· {formatGBP(account.lastPayment.amountPence)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-3 text-right max-sm:col-span-2">
                      <Button asChild variant="outline" size="sm" className="max-sm:h-9 max-sm:w-full">
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
