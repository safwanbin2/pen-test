import Link from "next/link";
import { EmptyRow, TableFrame, Td, Th, THead, Tr } from "@/components/data-table";
import { Mono } from "@/components/money";
import { EmptyDatabaseHint } from "@/components/empty-database-hint";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { addDays, daysBetween, ukToday } from "@/lib/domain/time";
import { formatUkDateTime, relativeDays } from "@/lib/format";
import { listAssessments, listModules } from "@/lib/services/assessments";
import { NewAssessmentDialog } from "./new-assessment-dialog";

export const metadata = { title: "Assessments · Registry" };

export default async function AssessmentsPage({ searchParams }: PageProps<"/staff/assessments">) {
  const sp = await searchParams;
  const lateOnly = sp.filter === "late";
  const [all, modules] = await Promise.all([listAssessments(), listModules()]);
  const assessments = lateOnly ? all.filter((a) => a.late > 0) : all;
  const now = new Date();
  const today = ukToday();

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Coursework deadlines, submissions and marking progress. Open one to mark it or grant an extension."
        actions={
          <NewAssessmentDialog
            defaultDate={addDays(today, 28).toISOString().slice(0, 10)}
            modules={modules.map((m) => ({
              id: m.id,
              code: m.code,
              title: m.title,
              programmes: m.programmes.map((p) => p.programme.name).join(", "),
            }))}
          />
        }
      />
      {modules.length === 0 && <EmptyDatabaseHint what="No modules yet, so assessments can't be created." />}
      {lateOnly && (
        <p className="text-muted-foreground">
          Showing assessments with late submissions.{" "}
          <Link href="/staff/assessments" className="font-medium text-primary underline-offset-4 hover:underline">Show all</Link>
        </p>
      )}
      <TableFrame label="Assessments">
        <THead>
          <Th>Assessment</Th>
          <Th sort="ascending">Deadline (UK time)</Th>
          <Th>Status</Th>
          <Th align="right">Submitted</Th>
          <Th align="right">Late</Th>
          <Th align="right">Marked</Th>
        </THead>
        <tbody>
          {assessments.length === 0 && <EmptyRow colSpan={6}>No assessments yet. Create one to open submissions.</EmptyRow>}
          {assessments.map((a) => {
            const open = a.deadline > now;
            const days = daysBetween(today, ukToday(a.deadline));
            return (
              <Tr key={a.id}>
                <Td>
                  <Link href={`/staff/assessments/${a.id}`} className="font-medium hover:underline">
                    <Mono>{a.module.code}</Mono> {a.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{a.module.title} · {a.academicYear}</div>
                </Td>
                <Td mono>{formatUkDateTime(a.deadline)}</Td>
                <Td>
                  <StatusBadge tone={open ? "info" : "muted"}>{open ? `Open · due ${relativeDays(days)}` : `Closed ${relativeDays(days)}`}</StatusBadge>
                </Td>
                <Td align="right" mono>{a.submitted} / {a.rosterSize}</Td>
                <Td align="right" mono className={a.late ? "font-medium text-status-late" : "text-muted-foreground"}>{a.late}</Td>
                <Td align="right" mono>{a.marked} / {a.submitted}</Td>
              </Tr>
            );
          })}
        </tbody>
      </TableFrame>
    </>
  );
}
