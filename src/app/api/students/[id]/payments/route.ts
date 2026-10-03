import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { getAccount } from "@/lib/services/accounts";
import { recordPayment } from "@/lib/services/fees";
import { paymentInput } from "@/lib/validation";

export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/students/[id]/payments">) => {
  await requireStaff();
  const { payments, summary } = await getAccount((await ctx.params).id);
  return NextResponse.json({ payments, summary });
});

export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/students/[id]/payments">) => {
  await requireStaff();
  const { payment, after } = await recordPayment((await ctx.params).id, await parseBody(request, paymentInput));
  return NextResponse.json(
    { payment, balancePence: after.balancePence, overduePence: after.overduePence, creditPence: after.creditPence },
    { status: 201 },
  );
});
