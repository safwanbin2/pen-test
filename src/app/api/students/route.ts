import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { createStudent, listStudents } from "@/lib/services/students";
import { createStudentInput } from "@/lib/validation";

export const GET = handle(async (request: NextRequest) => {
  await requireStaff();
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const { rows, total } = await listStudents({ q });
  return NextResponse.json({
    total,
    students: rows.map(({ account, ...s }) => ({
      ...s,
      balancePence: account.balancePence,
      overduePence: account.overduePence,
      daysOverdue: account.daysOverdue,
    })),
  });
});

export const POST = handle(async (request: Request) => {
  await requireStaff();
  const student = await createStudent(await parseBody(request, createStudentInput));
  return NextResponse.json({ student }, { status: 201 });
});
