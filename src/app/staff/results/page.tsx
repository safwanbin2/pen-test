import { PageHeader } from "@/components/page-header";
import { formatDate, formatUkDate, formatUkDateTime, RELEASE_LABEL } from "@/lib/format";
import { defaultResultsAssessmentId, getResultsForAssessment, listAssessmentsWithMarks } from "@/lib/services/results";
import { AssessmentPicker } from "./assessment-picker";
import { ResultsTable, type ResultRow } from "./results-table";

export const metadata = { title: "Results · Registry" };

export default async function ResultsPage({ searchParams }: PageProps<"/staff/results">) {
  const sp = await searchParams;
  const assessments = await listAssessmentsWithMarks();
  const selectedId =
    assessments.find((a) => a.id === sp.assessment)?.id ?? (await defaultResultsAssessmentId()) ?? assessments[0]?.id;
  const data = selectedId ? await getResultsForAssessment(selectedId) : null;

  if (!data) {
    return (
      <>
        <PageHeader title="Results" description="Decide what each student can see. Nothing is published or withheld automatically." />
        <p className="rounded-lg border px-4 py-10 text-center text-muted-foreground">No submissions to release yet.</p>
      </>
    );
  }

  const { assessment, rows, counts } = data;
  const label = `${assessment.module.code} ${assessment.title.split(" (")[0]}`;

  const tableRows: ResultRow[] = rows.map((r) => {
    const m = r.mark;
    const overdueInst = r.account.instalments.filter((i) => i.status === "OVERDUE").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    let statusNote = "";
    if (m) {
      statusNote =
        m.releaseStatus === "PENDING"
          ? "Student sees: not yet released"
          : m.releaseStatus === "PUBLISHED"
            ? `Published ${m.releasedAt ? formatUkDate(m.releasedAt) : ""} · ${m.releasedBy ?? ""}`
            : m.releaseStatus === "WITHHELD"
              ? `Withheld ${m.releasedAt ? formatUkDate(m.releasedAt) : ""} · student sees: not yet released`
              : `Student still sees ${m.publishedScore} until you re-publish`;
    }
    return {
      studentId: r.student.id,
      name: r.student.fullName,
      studentNumber: r.student.studentNumber,
      programme: r.student.programme.name,
      withdrawn: r.student.status === "WITHDRAWN",
      withdrawnNote: r.student.status === "WITHDRAWN" && r.statusChangedAt ? `Withdrawn ${formatUkDate(r.statusChangedAt)}` : null,
      hasSubmission: r.hasSubmission,
      mark: m
        ? {
            id: m.id,
            score: m.score,
            classification: r.classification!,
            releaseStatus: m.releaseStatus,
            withholdReason: m.withholdReason,
            markNote: r.markChangedFrom
              ? `Changed from ${r.markChangedFrom} on ${formatUkDate(r.markChangedAt!)}`
              : `Marked ${formatUkDate(m.updatedAt)}`,
            statusNote,
          }
        : null,
      overdue:
        r.account.overduePence > 0 && overdueInst
          ? {
              pence: r.account.overduePence,
              days: r.account.daysOverdue,
              instalment: overdueInst.sequence,
              dueDate: formatDate(overdueInst.dueDate),
            }
          : null,
    };
  });

  const countList: [string, number, string][] = [
    [RELEASE_LABEL.PENDING, counts.PENDING, ""],
    [RELEASE_LABEL.PUBLISHED, counts.PUBLISHED, ""],
    [RELEASE_LABEL.WITHHELD, counts.WITHHELD, counts.WITHHELD ? "text-status-withheld" : ""],
    [RELEASE_LABEL.NEEDS_REPUBLISH, counts.NEEDS_REPUBLISH, counts.NEEDS_REPUBLISH ? "text-status-warning" : ""],
  ];

  return (
    <>
      <PageHeader
        title="Results"
        description="Decide what each student can see. Nothing is published or withheld automatically."
        actions={
          <AssessmentPicker
            value={assessment.id}
            options={assessments.map((a) => ({ id: a.id, code: a.module.code, title: a.title, academicYear: a.academicYear }))}
          />
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
          {countList.map(([labelText, n, color]) => (
            <div key={labelText} className="flex gap-1.5">
              <dt>{labelText}</dt>
              <dd className={`font-mono font-medium text-foreground ${color}`}>{n}</dd>
            </div>
          ))}
        </dl>
        <span className="text-xs text-muted-foreground">
          {assessment.module.title} · deadline {formatUkDateTime(assessment.deadline)} · {assessment.academicYear}
        </span>
      </div>
      <ResultsTable rows={tableRows} assessmentLabel={label} />
      <p className="text-xs text-muted-foreground">
        Students see marks only once published. Withheld or pending results show the student “Your results have not been
        released yet.”
      </p>
    </>
  );
}
