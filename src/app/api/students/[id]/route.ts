import { NextResponse, type NextRequest } from "next/server";
import { handle, notFound, parseBody, requireStaff } from "@/lib/api";
import { getStudentProfile, updateStudent } from "@/lib/services/students";
import { updateStudentInput } from "@/lib/validation";

export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/students/[id]">) => {
  await requireStaff();
  const profile = await getStudentProfile((await ctx.params).id);
  if (!profile) throw notFound("Student");
  return NextResponse.json({ student: profile.student, account: profile.account.summary });
});

export const PATCH = handle(async (request: NextRequest, ctx: RouteContext<"/api/students/[id]">) => {
  await requireStaff();
  const student = await updateStudent((await ctx.params).id, await parseBody(request, updateStudentInput));
  if (!student) throw notFound("Student");
  return NextResponse.json({ student });
});
