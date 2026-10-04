import { randomUUID } from "node:crypto";
import type { Student } from "@/generated/prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { ApiError, forbidden, notFound, unprocessable } from "../errors";
import { checkUpload } from "../domain/fileType";
import { checkSubmission, effectiveDeadline, formatLatenessLong, lateness } from "../domain/submission";
import { studentVisibleScore } from "../domain/results";
import type { Session } from "../session";
import { loadFile, maxUploadBytes, saveFile } from "./storage";

/** The assessments a student sees: modules on their programme, in their academic year (D26). */
export async function getStudentAssessments(student: Student) {
  const assessments = await db.assessment.findMany({
    where: {
      academicYear: student.academicYear,
      module: { programmes: { some: { programmeId: student.programmeId } } },
    },
    orderBy: { deadline: "asc" },
    include: {
      module: true,
      extensions: { where: { studentId: student.id } },
      submissions: { where: { studentId: student.id }, include: { versions: { orderBy: { version: "desc" } } } },
      marks: { where: { studentId: student.id } },
    },
  });
  const now = new Date();
  return assessments.map((a) => {
    const extension = a.extensions[0] ?? null;
    const deadline = effectiveDeadline(a.deadline, extension);
    const versions = a.submissions[0]?.versions ?? [];
    const latest = versions[0] ?? null;
    const late = latest ? lateness(latest.submittedAt, deadline) : null;
    const check = checkSubmission({
      studentStatus: student.status,
      hasExistingSubmission: !!latest,
      now,
      effectiveDeadline: deadline,
    });
    const mark = a.marks[0];
    return {
      id: a.id,
      title: a.title,
      module: a.module,
      originalDeadline: a.deadline,
      deadline,
      extended: !!extension,
      versions,
      latest,
      late,
      isOpen: now <= deadline,
      /** Due within three days: the list emphasises it. */
      dueSoon: now <= deadline && deadline.getTime() - now.getTime() < 3 * 86_400_000,
      canUpload: check.ok,
      blockedReason: check.ok ? null : check.message,
      marked: !!mark,
      markPublished: mark ? studentVisibleScore(mark) !== null : false,
    };
  });
}

export type StudentAssessment = Awaited<ReturnType<typeof getStudentAssessments>>[number];

/** Store a student's upload as a new version (D6), enforcing D7 and D14. */
export async function submitFile(student: Student, assessmentId: string, file: File) {
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      academicYear: student.academicYear,
      module: { programmes: { some: { programmeId: student.programmeId } } },
    },
    include: {
      module: true,
      extensions: { where: { studentId: student.id } },
      submissions: { where: { studentId: student.id }, include: { versions: { select: { version: true } } } },
    },
  });
  if (!assessment) throw notFound("Assessment");

  const now = new Date();
  const deadline = effectiveDeadline(assessment.deadline, assessment.extensions[0]);
  const existing = assessment.submissions[0] ?? null;
  const allowed = checkSubmission({
    studentStatus: student.status,
    hasExistingSubmission: !!existing?.versions.length,
    now,
    effectiveDeadline: deadline,
  });
  if (!allowed.ok) throw new ApiError(422, allowed.code, allowed.message);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileCheck = checkUpload({ name: file.name, size: file.size, bytes }, maxUploadBytes());
  if (!fileCheck.ok) throw unprocessable(fileCheck.message, { file: fileCheck.message });

  const version = (existing?.versions.reduce((max, v) => Math.max(max, v.version), 0) ?? 0) + 1;
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const storageKey = `${assessment.id}/${student.id}/v${version}-${randomUUID()}${fileCheck.type.extension}`;
  await saveFile(storageKey, bytes);

  const late = lateness(now, deadline);
  return db.$transaction(async (tx) => {
    const submission =
      existing ??
      (await tx.submission.create({ data: { studentId: student.id, assessmentId: assessment.id } }));
    const saved = await tx.submissionVersion.create({
      data: {
        submissionId: submission.id,
        version,
        originalName: safeName,
        storageKey,
        mimeType: fileCheck.type.mimeType,
        sizeBytes: file.size,
        submittedAt: now,
      },
    });
    await tx.submission.update({ where: { id: submission.id }, data: { updatedAt: now } });
    await audit(tx, {
      area: "SUBMISSIONS",
      action: "submission.uploaded",
      studentId: student.id,
      subject: `${assessment.module.code} ${assessment.title.split(" (")[0]}`,
      toValue: `v${version}`,
      reason: late
        ? `Received ${formatLatenessLong(late)} after the deadline.`
        : version > 1
          ? `Replaces v${version - 1}.`
          : "Received on time.",
      actor: { actorName: student.fullName, actorRole: "Student" },
    });
    return { version: saved, late };
  });
}

/** A file download: staff can open any version; a student only their own. */
export async function getVersionFile(versionId: string, session: Session, currentStudentId: string | null) {
  const version = await db.submissionVersion.findUnique({
    where: { id: versionId },
    include: { submission: { select: { studentId: true } } },
  });
  if (!version) throw notFound("File");
  if (session.role !== "staff" && version.submission.studentId !== currentStudentId) {
    throw forbidden("You can only open your own files.");
  }
  const bytes = await loadFile(version.storageKey);
  if (!bytes) throw notFound("File");
  return { version, bytes };
}
