import type { Student } from "@/generated/prisma/client";
import type { z } from "zod";
import { db } from "../db";
import { audit } from "../audit";
import { notFound, unprocessable } from "../errors";
import { academicYearFor } from "../domain/academicYear";
import { classify } from "../domain/classification";
import { effectiveDeadline, lateness } from "../domain/submission";
import { ukDateTime } from "../domain/time";
import { formatUkDateTime } from "../format";
import { DEMO_STAFF } from "../session";
import type { assessmentInput, extensionInput } from "../validation";

/** Students on an assessment's roster: programme includes the module, same academic year (D26). */
function rosterWhere(assessment: { moduleId: string; academicYear: string }) {
  return {
    academicYear: assessment.academicYear,
    programme: { modules: { some: { moduleId: assessment.moduleId } } },
  };
}

export async function listModules() {
  return db.module.findMany({ orderBy: { code: "asc" }, include: { programmes: { include: { programme: true } } } });
}

export async function listAssessments() {
  const assessments = await db.assessment.findMany({
    orderBy: { deadline: "asc" },
    include: {
      module: true,
      extensions: true,
      marks: { select: { id: true } },
      submissions: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
    },
  });
  return Promise.all(
    assessments.map(async (a) => {
      const rosterSize = await db.student.count({ where: rosterWhere(a) });
      const late = a.submissions.filter((s) => {
        const ext = a.extensions.find((e) => e.studentId === s.studentId);
        return s.versions[0] && lateness(s.versions[0].submittedAt, effectiveDeadline(a.deadline, ext));
      }).length;
      return { ...a, rosterSize, submitted: a.submissions.length, late, marked: a.marks.length };
    }),
  );
}

export async function getAssessmentDetail(id: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: { module: { include: { _count: { select: { programmes: true } } } } },
  });
  if (!assessment) return null;
  const students = await db.student.findMany({
    where: rosterWhere(assessment),
    orderBy: { fullName: "asc" },
    include: {
      submissions: { where: { assessmentId: id }, include: { versions: { orderBy: { version: "desc" } } } },
      extensions: { where: { assessmentId: id } },
      marks: { where: { assessmentId: id } },
      auditLogs: {
        where: { area: "ENROLMENT", action: "student.status_changed" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const roster = students.map((s) => {
    const extension = s.extensions[0] ?? null;
    const deadline = effectiveDeadline(assessment.deadline, extension);
    const versions = s.submissions[0]?.versions ?? [];
    const latest = versions[0] ?? null;
    const late = latest ? lateness(latest.submittedAt, deadline) : null;
    const mark = s.marks[0] ?? null;
    return {
      student: { id: s.id, fullName: s.fullName, studentNumber: s.studentNumber, status: s.status },
      statusChangedAt: s.auditLogs[0]?.createdAt ?? null,
      extension,
      deadline,
      versions,
      latest,
      late,
      wasExtended: !!extension && !!latest && latest.submittedAt > assessment.deadline && !late,
      mark,
      classification: mark ? classify(mark.score) : null,
    };
  });

  return {
    assessment,
    roster,
    counts: {
      roster: roster.length,
      submitted: roster.filter((r) => r.latest).length,
      late: roster.filter((r) => r.late).length,
      extensions: roster.filter((r) => r.extension).length,
      marked: roster.filter((r) => r.mark).length,
      notSubmitted: roster.filter((r) => !r.latest).length,
      unmarked: roster.filter((r) => r.latest && !r.mark).length,
    },
  };
}

export async function createAssessment(input: z.infer<typeof assessmentInput>) {
  const mod = await db.module.findUnique({ where: { id: input.moduleId } });
  if (!mod) throw unprocessable("Choose a module", { moduleId: "Choose a module." });
  const [h, m] = input.deadlineTime.split(":").map(Number);
  const deadline = ukDateTime(input.deadlineDate, h, m);
  if (deadline <= new Date()) {
    throw unprocessable("Deadline must be in the future", { deadlineDate: "The deadline must be in the future." });
  }
  return db.assessment.create({
    data: {
      moduleId: mod.id,
      academicYear: academicYearFor(input.deadlineDate),
      title: input.title,
      deadline,
      createdBy: DEMO_STAFF.actorName,
    },
  });
}

/** One extension per student per assessment; granting again replaces it (D8, D23). */
export async function grantExtension(assessmentId: string, input: z.infer<typeof extensionInput>) {
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, include: { module: true } });
  if (!assessment) throw notFound("Assessment");
  const student: Student | null = await db.student.findFirst({
    where: { id: input.studentId, ...rosterWhere(assessment) },
  });
  if (!student) throw unprocessable("This student isn't on the roster for this assessment.");
  if (student.status !== "ENROLLED") {
    throw unprocessable("Only enrolled students can be given an extension.");
  }
  const [h, m] = input.newDeadlineTime.split(":").map(Number);
  const newDeadline = ukDateTime(input.newDeadlineDate, h, m);
  if (newDeadline <= assessment.deadline) {
    throw unprocessable("The new deadline must be after the original", {
      newDeadlineDate: "Must be later than the original deadline.",
    });
  }
  const previous = await db.extension.findUnique({
    where: { studentId_assessmentId: { studentId: student.id, assessmentId } },
  });
  return db.$transaction(async (tx) => {
    const extension = await tx.extension.upsert({
      where: { studentId_assessmentId: { studentId: student.id, assessmentId } },
      create: {
        studentId: student.id,
        assessmentId,
        newDeadline,
        reason: input.reason,
        note: input.note,
        grantedBy: DEMO_STAFF.actorName,
      },
      update: { newDeadline, reason: input.reason, note: input.note, grantedBy: DEMO_STAFF.actorName },
    });
    await audit(tx, {
      area: "SUBMISSIONS",
      action: "extension.granted",
      studentId: student.id,
      subject: `${assessment.module.code} ${assessment.title.split(" (")[0]}`,
      fromValue: `Due ${formatUkDateTime(previous?.newDeadline ?? assessment.deadline)}`,
      toValue: `Due ${formatUkDateTime(newDeadline)}`,
      reasonCode: input.reason,
      reason: input.note,
    });
    return extension;
  });
}


export type AssessmentDetail = NonNullable<Awaited<ReturnType<typeof getAssessmentDetail>>>;
export type RosterRow = AssessmentDetail["roster"][number];
