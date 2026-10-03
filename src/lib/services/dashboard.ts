// The Registry worklist: what needs action today (F-DSH-01..03).

import { db } from "../db";
import { academicYearFor } from "../domain/academicYear";
import { effectiveDeadline, lateness } from "../domain/submission";
import { addDays, ukToday } from "../domain/time";
import { getAccountSummaries } from "./accounts";

export async function getDashboard() {
  const today = ukToday();
  const now = new Date();
  const weekAgo = addDays(now, -7);

  const students = await db.student.findMany({
    include: {
      programme: true,
      marks: { where: { releaseStatus: "WITHHELD" }, select: { withholdReason: true } },
    },
  });
  const accounts = await getAccountSummaries(students.map((s) => s.id), today);

  const overdue = students
    .map((s) => ({ student: s, account: accounts.get(s.id)! }))
    .filter((r) => r.account.overduePence > 0)
    .sort((a, b) => b.account.daysOverdue - a.account.daysOverdue);

  // Submissions: late in the last 7 days, and work waiting to be marked.
  const submissions = await db.submission.findMany({
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      assessment: {
        include: {
          module: true,
          extensions: true,
          marks: { select: { studentId: true } },
        },
      },
    },
  });
  const lateThisWeek: { code: string }[] = [];
  const awaitingMarking: { code: string; assessmentId: string }[] = [];
  for (const s of submissions) {
    const latest = s.versions[0];
    if (!latest) continue;
    const extension = s.assessment.extensions.find((e) => e.studentId === s.studentId);
    const deadline = effectiveDeadline(s.assessment.deadline, extension);
    if (latest.submittedAt >= weekAgo && lateness(latest.submittedAt, deadline)) {
      lateThisWeek.push({ code: s.assessment.module.code });
    }
    const marked = s.assessment.marks.some((m) => m.studentId === s.studentId);
    if (!marked && deadline < now) awaitingMarking.push({ code: s.assessment.module.code, assessmentId: s.assessmentId });
  }

  const [toPublish, withheld] = await Promise.all([
    db.mark.findMany({
      where: { releaseStatus: { in: ["PENDING", "NEEDS_REPUBLISH"] } },
      include: { assessment: { include: { module: true } } },
    }),
    db.mark.findMany({ where: { releaseStatus: "WITHHELD" }, select: { withholdReason: true, assessmentId: true } }),
  ]);

  const codes = (items: { code: string }[]) => [...new Set(items.map((i) => i.code))];
  const firstAssessment = (ids: string[]) => ids[0] ?? null;

  return {
    today,
    academicYear: academicYearFor(today),
    overdue,
    overdueTotalPence: overdue.reduce((sum, r) => sum + r.account.overduePence, 0),
    queues: {
      overdue: { count: overdue.length },
      late: { count: lateThisWeek.length, codes: codes(lateThisWeek) },
      awaitingMarking: {
        count: awaitingMarking.length,
        codes: codes(awaitingMarking),
        assessmentId: firstAssessment(awaitingMarking.map((a) => a.assessmentId)),
      },
      toPublish: {
        count: toPublish.length,
        codes: codes(toPublish.map((m) => ({ code: m.assessment.module.code }))),
        assessmentId: firstAssessment(toPublish.map((m) => m.assessmentId)),
      },
      withheld: {
        count: withheld.length,
        reasons: [...new Set(withheld.map((w) => w.withholdReason).filter((r) => r !== null))],
        assessmentId: firstAssessment(withheld.map((w) => w.assessmentId)),
      },
    },
  };
}
