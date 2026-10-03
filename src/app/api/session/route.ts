import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, notFound, parseBody } from "@/lib/api";
import { ROLE_COOKIE, STUDENT_COOKIE } from "@/lib/session";
import { sessionInput } from "@/lib/validation";

/** Switch the demo role, and for the student role, who to view as. */
export const POST = handle(async (request: Request) => {
  const { role, studentNumber } = await parseBody(request, sessionInput);
  if (studentNumber && !(await db.student.findUnique({ where: { studentNumber } }))) throw notFound("Student");
  const response = NextResponse.json({ role, redirectTo: role === "staff" ? "/staff" : "/student/assessments" });
  const options = { path: "/", sameSite: "lax" as const, httpOnly: true, maxAge: 60 * 60 * 24 * 30 };
  response.cookies.set(ROLE_COOKIE, role, options);
  if (studentNumber) response.cookies.set(STUDENT_COOKIE, studentNumber, options);
  return response;
});
