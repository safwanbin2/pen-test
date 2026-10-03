import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { grantExtension } from "@/lib/services/assessments";
import { extensionInput } from "@/lib/validation";

export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/assessments/[id]/extensions">) => {
  await requireStaff();
  const extension = await grantExtension((await ctx.params).id, await parseBody(request, extensionInput));
  return NextResponse.json({ extension }, { status: 201 });
});
