import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getCurrentStudent } from "@/lib/services/students";
import { getVersionFile } from "@/lib/services/submissions";

/** Download a submitted file: staff can open any; a student only their own. */
export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/files/[versionId]">) => {
  const session = await getSession();
  const student = session.role === "student" ? await getCurrentStudent(session.studentNumber) : null;
  const { version, bytes } = await getVersionFile((await ctx.params).versionId, session, student?.id ?? null);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": version.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(version.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
