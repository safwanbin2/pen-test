import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { setProgrammeFee } from "@/lib/services/fees";
import { programmeFeeInput } from "@/lib/validation";

export const PUT = handle(async (request: NextRequest, ctx: RouteContext<"/api/programmes/[id]/fees">) => {
  await requireStaff();
  const { academicYear, amountPence } = await parseBody(request, programmeFeeInput);
  const fee = await setProgrammeFee((await ctx.params).id, academicYear, amountPence);
  return NextResponse.json({ fee });
});
