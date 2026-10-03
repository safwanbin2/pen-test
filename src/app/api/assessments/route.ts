import { NextResponse } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { createAssessment, listAssessments } from "@/lib/services/assessments";
import { assessmentInput } from "@/lib/validation";

export const GET = handle(async () => {
  await requireStaff();
  const assessments = await listAssessments();
  return NextResponse.json({
    assessments: assessments.map((a) => ({
      id: a.id,
      module: a.module,
      title: a.title,
      academicYear: a.academicYear,
      deadline: a.deadline,
      rosterSize: a.rosterSize,
      submitted: a.submitted,
      late: a.late,
      marked: a.marked,
      extensions: a.extensions.length,
    })),
  });
});

export const POST = handle(async (request: Request) => {
  await requireStaff();
  const assessment = await createAssessment(await parseBody(request, assessmentInput));
  return NextResponse.json({ assessment }, { status: 201 });
});
