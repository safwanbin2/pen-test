"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { ReleaseBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { ReleaseStatus, WithholdReason } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { availableReleaseActions } from "@/lib/domain/results";
import { WITHHOLD_REASON_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WithholdDialog, type WithholdTarget } from "./withhold-dialog";

export type ResultRow = {
  studentId: string;
  name: string;
  studentNumber: string;
  programme: string;
  withdrawn: boolean;
  withdrawnNote: string | null;
  mark: null | {
    id: string;
    score: number;
    classification: string;
    releaseStatus: ReleaseStatus;
    withholdReason: WithholdReason | null;
    markNote: string;
    statusNote: string;
  };
  hasSubmission: boolean;
  overdue: { pence: number; days: number; instalment: number; dueDate: string } | null;
};

const ACTION_LABEL = { PUBLISH: "Publish", REPUBLISH: "Re-publish", RELEASE: "Release" } as const;

export function ResultsTable({ rows, assessmentLabel }: { rows: ResultRow[]; assessmentLabel: string }) {
  const router = useRouter();
  const [withhold, setWithhold] = useState<WithholdTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function publish(row: ResultRow, action: "PUBLISH" | "REPUBLISH" | "RELEASE") {
    if (!row.mark) return;
    setPendingId(row.mark.id);
    startTransition(async () => {
      try {
        await apiCall(`/api/marks/${row.mark!.id}/release`, { body: { action } });
        toast.success(`Results ${action === "REPUBLISH" ? "re-published" : action === "RELEASE" ? "released" : "published"} for ${row.name}.`, {
          description: `${assessmentLabel} · ${row.mark!.score} ${row.mark!.classification} · visible to the student now`,
        });
        router.refresh();
      } catch (e) {
        toast.error(e instanceof ClientApiError ? e.message : "Couldn't update the result.");
      } finally {
        setPendingId(null);
      }
    });
  }

  async function confirmWithhold(reason: WithholdReason, note: string) {
    if (!withhold) return null;
    try {
      await apiCall(`/api/marks/${withhold.markId}/release`, { body: { action: "WITHHOLD", reason, note } });
      toast.success(`Results withheld for ${withhold.studentName}.`, {
        description: `${WITHHOLD_REASON_LABEL[reason]} · the student sees “not yet released”.`,
      });
      setWithhold(null);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof ClientApiError ? (Object.values(e.fields)[0] ?? e.message) : "Couldn't withhold the result.";
    }
  }

  const target = (row: ResultRow, prefill?: WithholdTarget["prefill"]): WithholdTarget => ({
    markId: row.mark!.id,
    studentName: row.name,
    studentNumber: row.studentNumber,
    assessmentLabel,
    prefill,
  });

  return (
    <>
      {/* Tablets drop Programme; phones show each student as a card */}
      <div className="relative overflow-x-auto rounded-lg border">
        <table className="table-stack w-full border-collapse text-left lg:min-w-[960px]" aria-label={`Results for ${assessmentLabel}`}>
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr className="h-9">
              <th scope="col" className="px-3 font-medium">Student</th>
              <th scope="col" className="px-3 font-medium max-lg:hidden">Programme</th>
              <th scope="col" className="px-3 font-medium">Mark</th>
              <th scope="col" className="px-3 font-medium">Release status</th>
              <th scope="col" className="px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          {rows.map((row) => {
            const actions = row.mark ? availableReleaseActions(row.mark.releaseStatus) : [];
            const publishAction = actions.find((a) => a !== "WITHHOLD") as "PUBLISH" | "REPUBLISH" | "RELEASE" | undefined;
            const showFeesAlert = !!row.overdue && !!row.mark && row.mark.releaseStatus === "PENDING";
            return (
              <tbody key={row.studentId} className={cn("border-t", showFeesAlert && "bg-status-overdue-subtle")}>
                <tr className="max-sm:[grid-template-areas:'st_mk'_'ss_ss'_'ac_ac']">
                  <td className="h-14 px-3 max-sm:[grid-area:st]">
                    <Link href={`/staff/students/${row.studentId}?tab=results`} className="block font-medium hover:underline">
                      {row.name}
                    </Link>
                    <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">{row.studentNumber}</span>
                  </td>
                  <td className="px-3 max-lg:hidden">{row.programme}</td>
                  <td className="px-3 max-sm:justify-self-end max-sm:text-right! max-sm:[grid-area:mk]">
                    {row.mark ? (
                      <>
                        <span className="font-mono text-[13px]">{row.mark.score}</span>{" "}
                        <span className={row.mark.classification === "Fail" ? "font-semibold" : "text-muted-foreground"}>
                          {row.mark.classification}
                        </span>
                        <div className="text-xs whitespace-nowrap text-muted-foreground">{row.mark.markNote}</div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {row.withdrawn ? "No mark · withdrawn" : row.hasSubmission ? "Not marked yet" : "No submission"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 max-sm:[grid-area:ss]">
                    {row.mark ? (
                      <>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <ReleaseBadge status={row.mark.releaseStatus} />
                          {row.mark.withholdReason && <StatusBadge tone="neutral">{WITHHOLD_REASON_LABEL[row.mark.withholdReason]}</StatusBadge>}
                        </span>
                        <div className="text-xs text-muted-foreground">{row.mark.statusNote}</div>
                      </>
                    ) : (
                      <>
                        <StatusBadge tone="dashed">Nothing to release</StatusBadge>
                        {row.withdrawnNote && <div className="text-xs text-muted-foreground">{row.withdrawnNote}</div>}
                      </>
                    )}
                  </td>
                  <td className="px-3 text-right max-sm:[grid-area:ac]">
                    <span className="inline-flex gap-2">
                      {publishAction && (
                        <Button size="sm" onClick={() => publish(row, publishAction)} disabled={pendingId === row.mark?.id}>
                          {ACTION_LABEL[publishAction]}
                        </Button>
                      )}
                      {actions.includes("WITHHOLD") && (
                        <Button size="sm" variant="outline" onClick={() => setWithhold(target(row))}>
                          Withhold…
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
                {showFeesAlert && row.overdue && (
                  <tr className="max-sm:pt-0!">
                    <td colSpan={5} className="px-3 pb-3 max-sm:text-left!">
                      <div
                        role="alert"
                        className="grid grid-cols-[16px_1fr_auto] items-center gap-x-3 rounded-lg border border-status-overdue/30 bg-background px-4 py-3 max-sm:grid-cols-[16px_1fr] max-sm:items-start [&>button]:max-sm:col-start-2 [&>button]:max-sm:mt-2 [&>button]:max-sm:justify-self-start"
                      >
                        <TriangleAlert aria-hidden className="size-4 text-status-overdue" />
                        <div>
                          <Money pence={row.overdue.pence} className="font-medium text-status-overdue" />{" "}
                          <span className="font-medium text-status-overdue">overdue for {row.overdue.days} days.</span> Consider
                          withholding (Fees outstanding).{" "}
                          <span className="text-muted-foreground">You decide — nothing is withheld automatically.</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setWithhold(
                              target(row, {
                                reason: "FEES_OUTSTANDING",
                                note: `£${(row.overdue!.pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })} overdue for ${row.overdue!.days} days (instalment ${row.overdue!.instalment}, due ${row.overdue!.dueDate}). Release once paid.`,
                              }),
                            )
                          }
                        >
                          <Lock aria-hidden />
                          Withhold (Fees outstanding)…
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
      <WithholdDialog target={withhold} onClose={() => setWithhold(null)} onConfirm={confirmWithhold} />
    </>
  );
}
