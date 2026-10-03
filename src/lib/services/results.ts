import type { Student } from "@/generated/prisma/client";
import type { z } from "zod";
import { db } from "../db";
import { audit } from "../audit";
import { ApiError, notFound, unprocessable } from "../errors";
import { classify } from "../domain/classification";
import {
  availableReleaseActions,
  releaseStatusAfterMarkChange,
  studentVisibleScore,
  type ReleaseAction,
} from "../domain/results";
import { RELEASE_LABEL } from "../format";
import { DEMO_STAFF } from "../session";
import type { markInput, releaseInput } from "../validation";
import { getAccountSummaries } from "./accounts";

const shortTitle = (a: { title: string; module: { code: string } }) => `${a.module.code} ${a.title.split(" (")[0]}`;

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

/** Enter or change a mark. A changed published mark needs re-publishing (D13). */
export async function setMark(input: z.infer<typeof markInput>) {
  const assessment = await db.assessment.findUnique({ where: { id: input.assessmentId }, include: { module: true } });
  if (!assessment) throw notFound("Assessment");
  const submission = await db.submission.findUnique({
    where: { studentId_assessmentId: { studentId: input.studentId, assessmentId: input.assessmentId } },
  });
  if (!submission) throw unprocessable("There is no submission to mark for this student.");

  const existing = await db.mark.findUnique({
    where: { studentId_assessmentId: { studentId: input.studentId, assessmentId: input.assessmentId } },
  });
  if (existing?.score === input.score) return existing;

  return db.$transaction(async (tx) => {
    const releaseStatus = existing ? releaseStatusAfterMarkChange(existing.releaseStatus, true) : "PENDING";
    const mark = await tx.mark.upsert({
      where: { studentId_assessmentId: { studentId: input.studentId, assessmentId: input.assessmentId } },
      create: { ...input, markedBy: DEMO_STAFF.actorName },
      update: { score: input.score, markedBy: DEMO_STAFF.actorName, releaseStatus },
    });
    // Changes to marks the student has seen (or that are withheld) are audited.
    if (existing && existing.releaseStatus !== "PENDING") {
      await audit(tx, {
        area: "RESULTS",
        action: "mark.changed",
        studentId: input.studentId,
        subject: shortTitle(assessment),
        fromValue: String(existing.score),
        toValue: String(input.score),
        reason:
          releaseStatus === "NEEDS_REPUBLISH"
            ? `Changed after publishing; the student still sees ${existing.publishedScore} until re-published.`
            : "Changed while results are withheld.",
      });
    }
    return mark;
  });
}

// ---------------------------------------------------------------------------
// Release: publish, re-publish, release, withhold (D12)
// ---------------------------------------------------------------------------

export async function applyRelease(markId: string, input: z.infer<typeof releaseInput>) {
  const mark = await db.mark.findUnique({
    where: { id: markId },
    include: { assessment: { include: { module: true } }, student: true },
  });
  if (!mark) throw notFound("Mark");
  if (!availableReleaseActions(mark.releaseStatus).includes(input.action as ReleaseAction)) {
    throw new ApiError(
      409,
      "INVALID_ACTION",
      `Can't ${input.action.toLowerCase()} a result that is ${RELEASE_LABEL[mark.releaseStatus].toLowerCase()}.`,
    );
  }
  const now = new Date();
  return db.$transaction(async (tx) => {
    const updated =
      input.action === "WITHHOLD"
        ? await tx.mark.update({
            where: { id: markId },
            data: {
              releaseStatus: "WITHHELD",
              withholdReason: input.reason,
              releaseNote: input.note,
              releasedBy: DEMO_STAFF.actorName,
              releasedAt: now,
            },
          })
        : await tx.mark.update({
            where: { id: markId },
            data: {
              releaseStatus: "PUBLISHED",
              publishedScore: mark.score,
              withholdReason: null,
              releaseNote: null,
              releasedBy: DEMO_STAFF.actorName,
              releasedAt: now,
            },
          });
    await audit(tx, {
      area: "RESULTS",
      action: input.action === "WITHHOLD" ? "result.withheld" : "result.published",
      studentId: mark.studentId,
      subject: shortTitle(mark.assessment),
      fromValue: RELEASE_LABEL[mark.releaseStatus],
      toValue: RELEASE_LABEL[updated.releaseStatus],
      reasonCode: input.action === "WITHHOLD" ? input.reason : undefined,
      reason:
        input.action === "WITHHOLD"
          ? input.note
          : input.action === "RELEASE"
            ? `Released after being withheld. Mark ${mark.score} now visible.`
            : `Mark ${mark.score} (${classify(mark.score)}) now visible to the student.`,
    });
    return { mark: updated, student: mark.student, assessment: mark.assessment };
  });
}

// ---------------------------------------------------------------------------
// Results screen
// ---------------------------------------------------------------------------

export async function listAssessmentsWithMarks() {
  return db.assessment.findMany({
    where: { submissions: { some: {} } },
    orderBy: { deadline: "asc" },
    include: { module: true },
  });
}

/** Open the Results screen on the most recent assessment with results waiting for a decision. */
export async function defaultResultsAssessmentId() {
  const waiting = await db.mark.findFirst({
    where: { releaseStatus: { in: ["PENDING", "NEEDS_REPUBLISH"] } },
    orderBy: { assessment: { deadline: "desc" } },
    select: { assessmentId: true },
  });
  return waiting?.assessmentId ?? null;
}

export async function getResultsForAssessment(assessmentId: string) {
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, include: { module: true } });
  if (!assessment) return null;
  const students = await db.student.findMany({
    where: {
      academicYear: assessment.academicYear,
      programme: { modules: { some: { moduleId: assessment.moduleId } } },
    },
    orderBy: { fullName: "asc" },
    include: {
      programme: true,
      marks: { where: { assessmentId } },
      submissions: { where: { assessmentId }, select: { id: true } },
      auditLogs: {
        where: { OR: [{ area: "RESULTS", subject: shortTitle(assessment) }, { action: "student.status_changed" }] },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const accounts = await getAccountSummaries(students.map((s) => s.id));
  const rows = students.map((s) => {
    const mark = s.marks[0] ?? null;
    const changeLog = s.auditLogs.find((l) => l.action === "mark.changed");
    const statusLog = s.auditLogs.find((l) => l.action === "student.status_changed");
    return {
      student: s,
      mark,
      classification: mark ? classify(mark.score) : null,
      hasSubmission: s.submissions.length > 0,
      account: accounts.get(s.id)!,
      markChangedFrom: mark?.releaseStatus === "NEEDS_REPUBLISH" ? (changeLog?.fromValue ?? null) : null,
      markChangedAt: changeLog?.createdAt ?? null,
      statusChangedAt: statusLog?.createdAt ?? null,
    };
  });
  const counts = { PENDING: 0, PUBLISHED: 0, WITHHELD: 0, NEEDS_REPUBLISH: 0 };
  for (const r of rows) if (r.mark) counts[r.mark.releaseStatus]++;
  return { assessment, rows, counts };
}


// ---------------------------------------------------------------------------
// Student view
// ---------------------------------------------------------------------------

/** The student's marksheet: only published snapshots, never withheld marks or reasons. */
export async function getStudentResults(student: Student) {
  const marks = await db.mark.findMany({
    where: { studentId: student.id },
    include: { assessment: { include: { module: true } } },
    orderBy: { assessment: { deadline: "asc" } },
  });
  return marks
    .map((m) => ({ mark: m, visible: studentVisibleScore(m) }))
    .filter((m): m is typeof m & { visible: number } => m.visible !== null)
    .map(({ mark, visible }) => ({
      id: mark.id,
      title: mark.assessment.title,
      module: mark.assessment.module,
      score: visible,
      classification: classify(visible),
      publishedAt: mark.releasedAt,
    }));
}
