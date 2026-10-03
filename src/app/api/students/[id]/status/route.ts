import { NextResponse, type NextRequest } from "next/server";
import { handle, notFound, parseBody, requireStaff } from "@/lib/api";
import { changeStatus } from "@/lib/services/students";
import { statusChangeInput } from "@/lib/validation";

export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/students/[id]/status">) => {
  await requireStaff();
  const { status, reason } = await parseBody(request, statusChangeInput);
  const student = await changeStatus((await ctx.params).id, status, reason);
  if (!student) throw notFound("Student");
  return NextResponse.json({ student });
});
