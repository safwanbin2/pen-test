import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Lock, Pencil } from "lucide-react";
import { EmptyRow, TableFrame, Td, Th, THead, Tr } from "@/components/data-table";
import { Money, Mono } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EnrolmentBadge, OverdueBadge, ReleaseBadge, StatusBadge, SubmissionBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { AuditArea, PaymentMethod } from "@/generated/prisma/enums";
import { classify } from "@/lib/domain/classification";
import { formatLatenessShort } from "@/lib/domain/submission";
import { ukToday } from "@/lib/domain/time";
import {
  AREA_LABEL,
  formatDate,
  formatUkDate,
  formatUkDateTime,
  FUNDING_LABEL,
  WITHHOLD_REASON_LABEL,
} from "@/lib/format";
import { getStudentAssessments } from "@/lib/services/submissions";
import { getStudentProfile } from "@/lib/services/students";
import { cn } from "@/lib/utils";
import { ChangeStatusDialog } from "./change-status-dialog";
import { FinancePanel } from "./finance-panel";
import { HistoryPanel } from "./history-panel";
import { RecordPaymentDialog } from "./record-payment-dialog";

const TABS = [
  ["overview", "Overview"],
  ["finance", "Finance"],
  ["submissions", "Submissions"],
  ["results", "Results"],
  ["history", "History"],
] as const;
type Tab = (typeof TABS)[number][0];

const DEFAULT_METHOD: Record<string, PaymentMethod> = {
  STUDENT_FINANCE: "STUDENT_FINANCE",
  SPONSOR: "SPONSOR",
  SELF_FUNDED: "BANK_TRANSFER",
};

export async function generateMetadata({ params }: PageProps<"/staff/students/[id]">) {
  const profile = await getStudentProfile((await params).id);
  return { title: `${profile?.student.fullName ?? "Student"} · Registry` };
}

export default async function StudentProfilePage({ params, searchParams }: PageProps<"/staff/students/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as Tab) : "overview";
  const area = Object.keys(AREA_LABEL).includes(String(sp.area)) ? (sp.area as AuditArea) : undefined;

  const profile = await getStudentProfile(id);
  if (!profile) notFound();
  const { student, account } = profile;
  const today = ukToday();
  const summary = account.summary;
  const withheld = student.marks.filter((m) => m.releaseStatus === "WITHHELD");
  const feesWithheld = withheld.find((m) => m.withholdReason === "FEES_OUTSTANDING");
  const overdueInstalment = summary.instalments
    .filter((i) => i.status === "OVERDUE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  const recordPayment = (opts: { size?: "default" | "sm"; variant?: "default" | "outline"; open?: boolean }) => (
    <RecordPaymentDialog
      student={{
        id: student.id,
        fullName: student.fullName,
        studentNumber: student.studentNumber,
        fundingLabel: FUNDING_LABEL[student.fundingSource],
      }}
      instalments={account.instalments}
      payments={account.payments.map((p) => ({ amountPence: p.amountPence }))}
      today={today.toISOString().slice(0, 10)}
      defaultMethod={DEFAULT_METHOD[student.fundingSource]}
      defaultOpen={opts.open}
      triggerSize={opts.size}
      triggerVariant={opts.variant}
    />
  );

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Students", href: "/staff/students" }, { label: student.studentNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {student.fullName}
            <EnrolmentBadge status={student.status} />
          </span>
        }
        description={
          <dl className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1">
            {[
              ["Student ID", <Mono key="id" className="text-foreground">{student.studentNumber}</Mono>],
              ["Programme", student.programme.name],
              ["Academic year", <Mono key="y" className="text-foreground">{student.academicYear}</Mono>],
              ["Funding", FUNDING_LABEL[student.fundingSource]],
              ["Email", student.email],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline gap-1.5">
                <dt className="text-xs">{label}</dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/staff/students/${student.id}/edit`}>
                <Pencil aria-hidden />
                Edit
              </Link>
            </Button>
            <ChangeStatusDialog
              student={{
                id: student.id,
                fullName: student.fullName,
                studentNumber: student.studentNumber,
                status: student.status,
                programmeName: student.programme.name,
              }}
            />
          </>
        }
      />

      {(overdueInstalment || withheld.length > 0) && (
        <div role="note" aria-label="Needs attention" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-sidebar px-4 py-3">
          <span className="text-xs font-medium text-foreground/80">Needs attention</span>
          {overdueInstalment && (
            <span className="inline-flex flex-wrap items-center gap-2">
              <OverdueBadge days={overdueInstalment.daysOverdue} />
              <span>
                <Money pence={summary.overduePence} /> instalment {overdueInstalment.sequence}, due{" "}
                {formatDate(overdueInstalment.dueDate)}
              </span>
            </span>
          )}
          {overdueInstalment && withheld.length > 0 && <span aria-hidden className="h-4 w-px bg-border max-sm:hidden" />}
          {withheld.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge tone="withheld" icon={Lock}>Withheld</StatusBadge>
              <StatusBadge tone="neutral">{WITHHOLD_REASON_LABEL[withheld[0].withholdReason ?? "OTHER"]}</StatusBadge>
              <span className="text-muted-foreground">
                Results since {withheld[0].releasedAt ? formatUkDate(withheld[0].releasedAt) : "—"} · {withheld[0].releasedBy}
              </span>
            </span>
          )}
        </div>
      )}

      <nav aria-label="Student record" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/staff/students/${student.id}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            scroll={false}
            className={cn(
              "-mb-px inline-flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 whitespace-nowrap text-muted-foreground hover:text-foreground",
              tab === key && "border-primary font-medium text-foreground",
            )}
          >
            {label}
            {key === "finance" && summary.overduePence > 0 && (
              <span className="rounded-sm bg-status-overdue px-1.5 text-[11px] leading-4 font-medium text-status-overdue-foreground">
                1 overdue
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewPanel profile={profile} recordPayment={summary.balancePence > 0 ? recordPayment({ variant: "outline", size: "sm" }) : null} />
      )}
      {tab === "finance" && (
        <FinancePanel
          account={account}
          today={today}
          withheldNote={!!feesWithheld}
          recordPayment={recordPayment({ variant: "default", open: sp.pay === "1" })}
        />
      )}
      {tab === "submissions" && <SubmissionsPanel student={student} />}
      {tab === "results" && <ResultsPanel marks={student.marks} />}
      {tab === "history" && (
        <HistoryPanel logs={student.auditLogs} area={area} baseHref={`/staff/students/${student.id}?tab=history`} />
      )}
    </>
  );
}

type Profile = NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>;

function Card({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-[13px] font-medium text-primary underline-offset-4 hover:underline">
            Open
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function OverviewPanel({ profile, recordPayment }: { profile: Profile; recordPayment: React.ReactNode }) {
  const { student, account } = profile;
  const s = account.summary;
  const counts = { published: 0, pending: 0, withheld: 0 };
  for (const m of student.marks) {
    if (m.releaseStatus === "WITHHELD") counts.withheld++;
    else if (m.releaseStatus === "PUBLISHED") counts.published++;
    else counts.pending++;
  }
  const enrolledLog = [...student.auditLogs].reverse().find((l) => l.action === "student.enrolled");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Enrolment" href={`/staff/students/${student.id}?tab=history`}>
        <dl className="flex flex-col gap-1.5">
          <Row label="Status"><EnrolmentBadge status={student.status} /></Row>
          <Row label="Date of birth"><Mono>{formatDate(student.dateOfBirth)}</Mono></Row>
          <Row label="Registered"><Mono>{formatUkDate(enrolledLog?.createdAt ?? student.createdAt)}</Mono></Row>
          <Row label="Programme">{student.programme.name}</Row>
        </dl>
      </Card>
      <Card title="Fees" href={`/staff/students/${student.id}?tab=finance`}>
        <dl className="flex flex-col gap-1.5">
          <Row label={s.creditPence ? "Credit" : "Balance"}><Money pence={s.creditPence || s.balancePence} /></Row>
          <Row label="Overdue">
            {s.overduePence ? <OverdueBadge days={s.daysOverdue} /> : <span className="text-muted-foreground">Nothing overdue</span>}
          </Row>
          <Row label="Next due">
            {s.nextDue ? (
              <span><Money pence={s.nextDue.remainingPence} /> <span className="text-xs text-muted-foreground">· {formatDate(s.nextDue.dueDate)}</span></span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
        </dl>
        {recordPayment && <div className="mt-1">{recordPayment}</div>}
      </Card>
      <Card title="Study" href={`/staff/students/${student.id}?tab=results`}>
        <dl className="flex flex-col gap-1.5">
          <Row label="Submissions"><Mono>{student.submissions.length}</Mono></Row>
          <Row label="Results published"><Mono>{counts.published}</Mono></Row>
          <Row label="Not yet published"><Mono>{counts.pending}</Mono></Row>
          <Row label="Withheld">
            {counts.withheld ? <StatusBadge tone="withheld" icon={Lock}>{String(counts.withheld)}</StatusBadge> : <Mono>0</Mono>}
          </Row>
        </dl>
      </Card>
    </div>
  );
}

async function SubmissionsPanel({ student }: { student: Profile["student"] }) {
  const assessments = await getStudentAssessments(student);
  return (
    <TableFrame label="Submissions" stack>
      <THead>
        <Th>Assessment</Th>
        <Th>Deadline (UK time)</Th>
        <Th>Status</Th>
        <Th>Submitted</Th>
        <Th>Version</Th>
        <Th>File</Th>
      </THead>
      <tbody>
        {assessments.length === 0 && <EmptyRow colSpan={6}>No assessments for this student&apos;s programme this year.</EmptyRow>}
        {assessments.map((a) => (
          <Tr key={a.id} highlight={!!a.late} className="max-sm:[grid-template-areas:'as_st'_'dl_dl'_'sb_vr'_'fl_fl']">
            <Td className="max-sm:[grid-area:as]">
              <Link href={`/staff/assessments/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
              <div className="text-xs text-muted-foreground"><Mono className="text-xs">{a.module.code}</Mono> {a.module.title}</div>
            </Td>
            <Td mono className="max-sm:[grid-area:dl]">
              {formatUkDateTime(a.deadline)}
              {a.extended && <div className="text-xs text-muted-foreground">Extended · was {formatUkDateTime(a.originalDeadline)}</div>}
            </Td>
            <Td className="max-sm:justify-self-end max-sm:[grid-area:st]">
              {a.latest ? (
                <SubmissionBadge state={a.late ? "late" : "submitted"} suffix={a.late ? formatLatenessShort(a.late) : undefined} />
              ) : (
                <SubmissionBadge state={student.status === "ENROLLED" ? "none" : "closed"} />
              )}
            </Td>
            <Td mono className="max-sm:[grid-area:sb]">{a.latest ? formatUkDateTime(a.latest.submittedAt) : "—"}</Td>
            <Td mono className="max-sm:justify-self-end max-sm:[grid-area:vr]">{a.latest ? `v${a.latest.version}` : "—"}</Td>
            <Td className="max-sm:[grid-area:fl]">
              {a.latest ? (
                <a href={`/api/files/${a.latest.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Download aria-hidden className="size-3.5" />
                  {a.latest.originalName}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableFrame>
  );
}

function ResultsPanel({ marks }: { marks: Profile["student"]["marks"] }) {
  return (
    <TableFrame label="Results" stack>
      <THead>
        <Th>Assessment</Th>
        <Th align="right">Mark</Th>
        <Th>Classification</Th>
        <Th>Release status</Th>
        <Th>What the student sees</Th>
      </THead>
      <tbody>
        {marks.length === 0 && <EmptyRow colSpan={5}>No marks entered yet.</EmptyRow>}
        {marks.map((m) => {
          const cls = classify(m.score);
          return (
            <Tr key={m.id} className="max-sm:[grid-template-areas:'as_mk'_'rl_cl'_'ss_ss']">
              <Td className="max-sm:[grid-area:as]">
                <Link href={`/staff/results?assessment=${m.assessmentId}`} className="font-medium hover:underline">
                  {m.assessment.title}
                </Link>
                <div className="text-xs text-muted-foreground"><Mono className="text-xs">{m.assessment.module.code}</Mono> {m.assessment.module.title}</div>
              </Td>
              <Td align="right" mono className="max-sm:justify-self-end max-sm:[grid-area:mk]">{m.score}</Td>
              <Td className={cn("max-sm:justify-self-end max-sm:[grid-area:cl]", cls === "Fail" ? "font-semibold" : "text-muted-foreground")}>{cls}</Td>
              <Td className="max-sm:[grid-area:rl]">
                <span className="flex flex-wrap items-center gap-1.5">
                  <ReleaseBadge status={m.releaseStatus} />
                  {m.withholdReason && <StatusBadge tone="neutral">{WITHHOLD_REASON_LABEL[m.withholdReason]}</StatusBadge>}
                </span>
              </Td>
              <Td className="text-muted-foreground max-sm:text-xs max-sm:[grid-area:ss]">
                {m.releaseStatus === "PUBLISHED"
                  ? `${m.publishedScore} (published)`
                  : m.releaseStatus === "NEEDS_REPUBLISH"
                    ? `Still sees ${m.publishedScore} until re-published`
                    : "Not yet released"}
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </TableFrame>
  );
}
