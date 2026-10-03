import Link from "next/link";
import { Check, Clock, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { Mono } from "@/components/money";
import { StatusBadge, SubmissionBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatLatenessLong, formatLatenessShort } from "@/lib/domain/submission";
import { daysBetween, ukToday } from "@/lib/domain/time";
import { formatUkDateTime, formatUkDayMonth, formatUkDayTime, REGISTRY_CONTACT, relativeDays, STATUS_LABEL } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getStudentAssessments, type StudentAssessment } from "@/lib/services/submissions";
import { getCurrentStudent } from "@/lib/services/students";
import { cn } from "@/lib/utils";
import { UploadPanel } from "./upload-panel";

export const metadata = { title: "My assessments · Registry" };

function timeLeft(a: StudentAssessment) {
  const now = new Date();
  if (a.deadline <= now) return a.markPublished ? "Closed · mark published" : "Closed";
  const hours = Math.floor((a.deadline.getTime() - now.getTime()) / 3_600_000);
  if (hours < 24) return `Due in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `Due ${relativeDays(daysBetween(ukToday(), ukToday(a.deadline)))}`;
}

export default async function MyAssessmentsPage({ searchParams }: PageProps<"/student/assessments">) {
  const session = await getSession();
  const student = await getCurrentStudent(session.studentNumber);
  if (!student) redirect("/staff");
  const sp = await searchParams;
  const assessments = await getStudentAssessments(student);
  const selected =
    assessments.find((a) => a.id === sp.a) ??
    assessments.find((a) => a.isOpen) ??
    assessments[0];
  const blocked = student.status !== "ENROLLED";

  return (
    <>
      <div>
        <h1 className="text-xl leading-7 font-semibold tracking-tight">My assessments</h1>
        <p className="text-muted-foreground">
          {student.programme.name} · {student.academicYear} · all times UK time
        </p>
      </div>

      {blocked && (
        <div role="alert" className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-input px-4 py-3">
          <Lock aria-hidden className="mt-0.5 size-4" />
          <div>
            <div className="font-semibold">
              Submissions are closed because your enrolment status is {STATUS_LABEL[student.status]}. Contact Registry.
            </div>
            <div className="text-foreground/80">
              You can still see what you submitted.{" "}
              <a href={REGISTRY_CONTACT} className="font-medium text-primary underline-offset-4 hover:underline">Contact Registry</a>
            </div>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <p className="rounded-lg border px-4 py-10 text-center text-muted-foreground">No assessments for your programme yet.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section aria-label="Assessments" className="overflow-hidden rounded-lg border">
            {assessments.map((a) => {
              const current = a.id === selected?.id;
              return (
                <Link
                  key={a.id}
                  href={`/student/assessments?a=${a.id}`}
                  scroll={false}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "grid gap-1.5 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_168px] sm:items-center sm:gap-3",
                    current && "bg-muted",
                  )}
                >
                  <span>
                    <span className="block font-medium">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      <Mono className="text-xs">{a.module.code}</Mono> {a.module.title}
                    </span>
                  </span>
                  <span>
                    <Mono className="block">{formatUkDateTime(a.deadline)}</Mono>
                    {a.extended && (
                      <span className="block text-xs text-muted-foreground">
                        Extended · was <s>{formatUkDayMonth(a.originalDeadline)}</s>
                      </span>
                    )}
                    <span className={cn("block text-xs", a.dueSoon ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {a.latest && !a.isOpen ? `Submitted ${formatUkDateTime(a.latest.submittedAt)}` : timeLeft(a)}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 sm:justify-end">
                    {a.latest ? (
                      <SubmissionBadge
                        state={a.late ? "late" : "submitted"}
                        suffix={a.late ? formatLatenessShort(a.late) : `v${a.latest.version}`}
                      />
                    ) : blocked ? (
                      <SubmissionBadge state="closed" />
                    ) : (
                      <SubmissionBadge state="none" />
                    )}
                    {a.extended && <StatusBadge tone="info" suffix={formatUkDayMonth(a.deadline)}>Extension</StatusBadge>}
                  </span>
                </Link>
              );
            })}
          </section>

          {selected && <AssessmentPanel a={selected} blocked={blocked} statusLabel={STATUS_LABEL[student.status]} />}
        </div>
      )}
    </>
  );
}

function AssessmentPanel({ a, blocked, statusLabel }: { a: StudentAssessment; blocked: boolean; statusLabel: string }) {
  const latest = a.latest;
  const previous = a.versions[1];
  const receipt = latest
    ? a.late
      ? { title: "Received late", tone: "border-border bg-background", icon: <Clock aria-hidden className="size-4 text-muted-foreground" /> }
      : a.extended && latest.submittedAt > a.originalDeadline
        ? { title: "Received on time", tone: "border-status-success/30 bg-status-success-subtle", icon: <Check aria-hidden className="size-4 text-status-success" /> }
        : { title: "Received", tone: "border-status-success/30 bg-status-success-subtle", icon: <Check aria-hidden className="size-4 text-status-success" /> }
    : null;

  return (
    <section aria-labelledby="panel-h" className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 id="panel-h" className="text-base font-semibold">{a.title}</h2>
        <p className="text-xs text-muted-foreground">
          <Mono className="text-xs">{a.module.code}</Mono> {a.module.title}
        </p>
      </div>
      <dl className="flex flex-col gap-1.5 rounded-md border bg-sidebar px-3 py-2.5">
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-muted-foreground">Deadline</dt>
          <dd>
            <Mono>{formatUkDateTime(a.deadline)} (UK time)</Mono>
            {a.extended && (
              <span className="block text-xs text-muted-foreground">
                Extended · original <s>{formatUkDateTime(a.originalDeadline)}</s>
              </span>
            )}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-muted-foreground">Time left</dt>
          <dd className={cn("font-medium", !a.isOpen && "text-muted-foreground")}>{timeLeft(a)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-muted-foreground">Files</dt>
          <dd>PDF or DOCX, up to 10 MB</dd>
        </div>
      </dl>

      {latest && receipt && (
        <div role="status" className={cn("flex flex-col gap-2 rounded-lg border p-3", receipt.tone)}>
          <div className="flex items-center gap-2 font-semibold">{receipt.icon}{receipt.title}</div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-muted-foreground">File</dt>
            <dd className="truncate">
              <a href={`/api/files/${latest.id}`} className="hover:underline">{latest.originalName}</a>
            </dd>
            <dt className="text-muted-foreground">Received</dt>
            <dd className="font-mono">{formatUkDateTime(latest.submittedAt)}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>
              <span className="font-medium">v{latest.version}</span>{" "}
              {previous && <span className="text-muted-foreground">replaces v{previous.version} ({formatUkDayTime(previous.submittedAt)})</span>}
            </dd>
          </dl>
          {a.late && (
            <p className="flex flex-wrap items-center gap-1.5">
              <SubmissionBadge state="late" suffix={formatLatenessShort(a.late)} />
              <span className="text-[13px]">Received {formatLatenessLong(a.late)} after the deadline.</span>
            </p>
          )}
          <p className="text-xs text-foreground/80">
            {a.late
              ? "Your work is recorded as late. If you think this is wrong, contact Registry."
              : a.extended && latest.submittedAt > a.originalDeadline
                ? `Not late: your extension to ${formatUkDateTime(a.deadline)} applied.`
                : "Keep this receipt."}
          </p>
        </div>
      )}

      {blocked ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-sidebar p-4 text-foreground/80">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Lock aria-hidden className="size-4" />
            Uploads are closed
          </div>
          <p>Submissions are closed because your enrolment status is {statusLabel}. Contact Registry.</p>
          <Button asChild variant="outline" className="self-start">
            <a href={REGISTRY_CONTACT}>Contact Registry</a>
          </Button>
        </div>
      ) : a.canUpload ? (
        <div className="flex flex-col gap-2">
          <UploadPanel assessmentId={a.id} existingVersion={latest?.version ?? null} late={!a.isOpen} />
          {latest && (
            <p className="text-xs text-muted-foreground">
              You can replace your file until {formatUkDateTime(a.deadline)} (UK time). Only your latest version is marked.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{a.blockedReason}</p>
      )}
    </section>
  );
}
