import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handle, requireStudent } from "@/lib/api";
import { submitFile } from "@/lib/services/submissions";

/** Student upload (multipart/form-data, field "file"). */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/assessments/[id]/submissions">) => {
  const student = await requireStudent();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "VALIDATION", "Choose a file to upload.", { file: "Choose a file to upload." });
  }
  const { version, late } = await submitFile(student, (await ctx.params).id, file);
  return NextResponse.json(
    {
      version: {
        id: version.id,
        version: version.version,
        originalName: version.originalName,
        submittedAt: version.submittedAt,
      },
      late: !!late,
    },
    { status: 201 },
  );
});
