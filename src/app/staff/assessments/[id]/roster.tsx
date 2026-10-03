"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CalendarClock, Download, Ellipsis, UserRound } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, SubmissionBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StudentStatus } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { CLASSIFICATION_BANDS, classify, isValidMark } from "@/lib/domain/classification";
import { formatUkDate, formatUkDateTime, formatUkDayMonth, formatUkDayTime, formatUkTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GrantExtensionDialog } from "./grant-extension-dialog";

export type RosterItem = {
  student: { id: string; fullName: string; studentNumber: string; status: StudentStatus };
  statusChangedAt: Date | null;
  extension: { newDeadline: Date } | null;
  latest: { id: string; version: number; submittedAt: Date; originalName: string; mimeType: string } | null;
  previous: { submittedAt: Date } | null;
  lateBy: { short: string; long: string } | null;
  afterOriginalDeadline: boolean;
  mark: number | null;
};

type Filter = "all" | "late" | "none" | "unmarked";

export function Roster({
  assessment,
  rows,
  initialFilter,
  suggestedExtensionDate,
}: {
  assessment: { id: string; code: string; title: string; deadline: Date };
  rows: RosterItem[];
  initialFilter: Filter;
  suggestedExtensionDate: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.student.id, r.mark === null ? "" : String(r.mark)])),
  );
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [extensionFor, setExtensionFor] = useState<string | null | undefined>(undefined);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const unmarked = rows.filter((r) => r.latest && !marks[r.student.id]?.trim());
  const counts: Record<Filter, number> = {
    all: rows.length,
    late: rows.filter((r) => r.lateBy).length,
    none: rows.filter((r) => !r.latest).length,
    unmarked: unmarked.length,
  };
  const shown = rows.filter((r) =>
    filter === "late" ? r.lateBy : filter === "none" ? !r.latest : filter === "unmarked" ? unmarked.includes(r) : true,
  );

  function onMark(studentId: string, value: string) {
    setMarks((m) => ({ ...m, [studentId]: value }));
    clearTimeout(timers.current[studentId]);
    const n = Number(value);
    if (value.trim() === "" || !/^\d{1,3}$/.test(value.trim()) || !isValidMark(n)) return;
    timers.current[studentId] = setTimeout(async () => {
      setSaving("saving");
      try {
        await apiCall("/api/marks", { method: "PUT", body: { studentId, assessmentId: assessment.id, score: n } });
        setSaving("saved");
        setSavedAt(new Date());
        router.refresh();
      } catch (e) {
        setSaving("error");
        toast.error(e instanceof ClientApiError ? e.message : "Couldn't save the mark.");
      }
    }, 600);
  }

  const candidates = rows.filter((r) => r.student.status === "ENROLLED").map((r) => r.student);

  return (
    <section aria-labelledby="roster-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <h2 id="roster-h" className="text-base font-semibold">Roster and marking</h2>
        <div role="tablist" aria-label="Filter roster" className="inline-flex gap-0.5 rounded-md border bg-muted p-0.5">
          {([
            ["all", "All"],
            ["late", "Late"],
            ["none", "Not submitted"],
            ["unmarked", "Unmarked"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex h-[26px] items-center gap-1.5 rounded-sm border border-transparent px-2.5 text-[13px] font-medium text-foreground/80",
                filter === key && "border-border bg-background text-foreground shadow-xs",
              )}
            >
              {label}
              <span className="text-xs font-normal text-muted-foreground">{counts[key]}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" className="ml-auto" onClick={() => setExtensionFor(null)}>
          <CalendarClock aria-hidden />
          Grant extension
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1040px] border-collapse text-left" aria-label={`${assessment.code} roster`}>
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr className="h-9">
              <th scope="col" className="px-3 font-medium">Student</th>
              <th scope="col" className="px-3 font-medium">Status</th>
              <th scope="col" className="px-3 font-medium">Submitted (UK time)</th>
              <th scope="col" className="px-3 font-medium">Version</th>
              <th scope="col" className="px-3 font-medium">Extension</th>
              <th scope="col" className="px-3 font-medium">File</th>
              <th scope="col" className="px-3 font-medium">Mark (0–100)</th>
              <th scope="col" className="w-10 px-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr className="border-t">
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Nothing in this view. {filter === "unmarked" ? "Everything submitted has a mark." : ""}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const value = marks[r.student.id] ?? "";
              const invalid = value.trim() !== "" && (!/^\d{1,3}$/.test(value.trim()) || !isValidMark(Number(value)));
              const cls = value.trim() && !invalid ? classify(Number(value)) : null;
              const withdrawn = r.student.status === "WITHDRAWN";
              const note = r.lateBy
                ? `${r.lateBy.long} after deadline`
                : r.extension && r.afterOriginalDeadline
                  ? "Within extension · not late"
                  : r.previous
                    ? `Resubmitted before deadline · v${r.latest!.version - 1} ${formatUkDayTime(r.previous.submittedAt)}`
                    : "On time";
              return (
                <tr key={r.student.id} className={cn("h-14 border-t", r.lateBy && "bg-status-late-subtle")}>
                  <td className="px-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/staff/students/${r.student.id}?tab=submissions`} className="font-medium hover:underline">
                        {r.student.fullName}
                      </Link>
                      {r.student.status !== "ENROLLED" && <StatusBadge tone="muted">{r.student.status === "WITHDRAWN" ? "Withdrawn" : r.student.status === "DEFERRED" ? "Deferred" : "Completed"}</StatusBadge>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{r.student.studentNumber}</div>
                  </td>
                  <td className="px-3">
                    {r.latest ? (
                      <SubmissionBadge state={r.lateBy ? "late" : "submitted"} suffix={r.lateBy?.short} />
                    ) : (
                      <SubmissionBadge state="none" />
                    )}
                  </td>
                  <td className="px-3">
                    {r.latest ? (
                      <>
                        <div className="font-mono text-[13px]">{formatUkDateTime(r.latest.submittedAt)}</div>
                        <div className={cn("text-xs", r.lateBy ? "text-status-late" : "text-muted-foreground")}>{note}</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {withdrawn
                          ? `Submissions closed — withdrawn ${r.statusChangedAt ? formatUkDate(r.statusChangedAt) : ""}`
                          : new Date() > (r.extension?.newDeadline ?? assessment.deadline)
                            ? "Deadline passed · a late submission is still accepted"
                            : "Not yet submitted"}
                      </div>
                    )}
                  </td>
                  <td className="px-3 font-mono text-[13px]">
                    {r.latest ? (
                      <span
                        title={r.previous ? `v${r.latest.version} replaces v${r.latest.version - 1} (${formatUkDayTime(r.previous.submittedAt)})` : "One upload"}
                        className={r.latest.version > 1 ? "font-medium" : undefined}
                      >
                        v{r.latest.version}
                      </span>
                    ) : (
                      <span className="text-muted-foreground" aria-label="None">—</span>
                    )}
                  </td>
                  <td className="px-3">
                    {r.extension ? (
                      <>
                        <StatusBadge tone="info" suffix={formatUkDayMonth(r.extension.newDeadline)}>Extension</StatusBadge>
                        <div className="text-xs text-muted-foreground">
                          Due {formatUkDayTime(r.extension.newDeadline)} · was <s>{formatUkDayMonth(assessment.deadline)}</s>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground" aria-label="None">—</span>
                    )}
                  </td>
                  <td className="px-3">
                    {r.latest && (
                      <Button asChild variant="ghost" size="sm" title={r.latest.originalName}>
                        <a href={`/api/files/${r.latest.id}`} aria-label={`Download ${r.latest.originalName}`}>
                          <Download aria-hidden />
                          {r.latest.mimeType === "application/pdf" ? "PDF" : "DOCX"}
                        </a>
                      </Button>
                    )}
                  </td>
                  <td className="px-3">
                    {r.latest ? (
                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={3}
                          placeholder="–"
                          value={value}
                          onChange={(e) => onMark(r.student.id, e.target.value)}
                          aria-label={`Mark for ${r.student.fullName}`}
                          aria-invalid={invalid}
                          className="h-7 w-14 rounded-md border border-input bg-background px-2 text-right font-mono text-[13px] shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                        />
                        <span
                          className={cn(
                            "text-xs",
                            invalid ? "font-medium text-destructive" : cls === "Fail" ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {invalid ? "Enter 0–100" : (cls ?? "Unmarked")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{withdrawn ? "Not required" : "No submission"}</span>
                    )}
                  </td>
                  <td className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.student.fullName}`}>
                          <Ellipsis aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/staff/students/${r.student.id}`}>
                            <UserRound aria-hidden /> Open student record
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={r.student.status !== "ENROLLED"} onSelect={() => setExtensionFor(r.student.id)}>
                          <CalendarClock aria-hidden /> {r.extension ? "Change extension" : "Grant extension"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-4 text-xs text-muted-foreground" aria-live="polite">
        <span>
          {saving === "saving"
            ? "Saving…"
            : saving === "error"
              ? "Last change not saved."
              : `Marks save as you type${savedAt ? ` · last saved ${formatUkTime(savedAt)}` : ""}.`}{" "}
          Publishing happens in{" "}
          <Link href={`/staff/results?assessment=${assessment.id}`} className="text-primary underline-offset-4 hover:underline">
            Results
          </Link>
          .
        </span>
        <span>{CLASSIFICATION_BANDS}</span>
      </div>

      <GrantExtensionDialog
        open={extensionFor !== undefined}
        onOpenChange={(o) => !o && setExtensionFor(undefined)}
        assessment={assessment}
        candidates={candidates}
        initialStudentId={extensionFor ?? null}
        suggestedDate={suggestedExtensionDate}
      />
    </section>
  );
}
