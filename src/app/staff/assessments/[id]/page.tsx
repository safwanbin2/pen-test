import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { Mono } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatLatenessLong, formatLatenessShort } from "@/lib/domain/submission";
import { addDays, daysBetween, ukToday } from "@/lib/domain/time";
import { formatUkDateTime, plural, relativeDays } from "@/lib/format";
import { getAssessmentDetail } from "@/lib/services/assessments";
import { Roster, type RosterItem } from "./roster";

export const metadata = { title: "Assessment · Registry" };

export default async function AssessmentPage({ params, searchParams }: PageProps<"/staff/assessments/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getAssessmentDetail(id);
  if (!detail) notFound();
  const { assessment, roster, counts } = detail;
  const closed = assessment.deadline < new Date();
  const daysFromDeadline = daysBetween(ukToday(assessment.deadline), ukToday());
  const shared = assessment.module._count.programmes > 1;

  const rows: RosterItem[] = roster.map((r) => ({
    student: r.student,
    statusChangedAt: r.statusChangedAt,
    extension: r.extension ? { newDeadline: r.extension.newDeadline } : null,
    latest: r.latest
      ? {
          id: r.latest.id,
          version: r.latest.version,
          submittedAt: r.latest.submittedAt,
          originalName: r.latest.originalName,
          mimeType: r.latest.mimeType,
        }
      : null,
    previous: r.versions[1] ? { submittedAt: r.versions[1].submittedAt } : null,
    lateBy: r.late ? { short: formatLatenessShort(r.late), long: formatLatenessLong(r.late) } : null,
    afterOriginalDeadline: !!r.latest && r.latest.submittedAt > assessment.deadline,
    mark: r.mark?.score ?? null,
  }));
  const filter = ["late", "none", "unmarked"].includes(String(sp.filter)) ? (sp.filter as "late" | "none" | "unmarked") : "all";

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Assessments", href: "/staff/assessments" }, { label: assessment.module.code }]}
        title={
          <>
            <span className="font-medium">{assessment.module.code}</span> {assessment.module.title} — {assessment.title}
          </>
        }
        description={
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />
              Deadline <Mono className="text-foreground">{formatUkDateTime(assessment.deadline)} (UK time)</Mono>
            </span>
            <StatusBadge tone={closed ? "muted" : "info"}>
              {closed ? `Closed ${relativeDays(-daysFromDeadline)}` : `Open · due ${relativeDays(-daysFromDeadline)}`}
            </StatusBadge>
            <span>
              {shared ? `Shared Level ${assessment.module.level} module` : `Level ${assessment.module.level} module`} ·{" "}
              {assessment.academicYear} · {plural(counts.roster, "student")}
            </span>
            <span>PDF or DOCX, 10 MB max</span>
          </div>
        }
      />
      <p className="text-foreground/80">
        <Mono>{counts.submitted} / {counts.roster}</Mono> submitted · <Mono>{counts.marked} / {counts.submitted}</Mono> marked ·{" "}
        <Mono>{counts.extensions}</Mono> {counts.extensions === 1 ? "extension" : "extensions"}. Use the filters below to work
        through late, missing and unmarked work.
      </p>
      <Roster
        assessment={{ id: assessment.id, code: assessment.module.code, title: `${assessment.module.title} — ${assessment.title}`, deadline: assessment.deadline }}
        rows={rows}
        initialFilter={filter}
        suggestedExtensionDate={addDays(ukToday(assessment.deadline), 7).toISOString().slice(0, 10)}
      />
    </>
  );
}
