import { NextResponse } from "next/server";
import { handle, parseBody, requireStaff } from "@/lib/api";
import { classify } from "@/lib/domain/classification";
import { setMark } from "@/lib/services/results";
import { markInput } from "@/lib/validation";

/** Enter or change a mark (saved as staff type). */
export const PUT = handle(async (request: Request) => {
  await requireStaff();
  const mark = await setMark(await parseBody(request, markInput));
  return NextResponse.json({ mark, classification: classify(mark.score) });
});
