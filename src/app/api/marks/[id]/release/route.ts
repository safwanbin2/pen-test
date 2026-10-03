import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { applyRelease } from "@/lib/services/results";
import { releaseInput } from "@/lib/validation";

/** Publish, re-publish, release or withhold one student's result (D12). */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/marks/[id]/release">) => {
  await requireStaff();
  const { mark, student } = await applyRelease((await ctx.params).id, await parseBody(request, releaseInput));
  return NextResponse.json({ mark, studentName: student.fullName });
});
