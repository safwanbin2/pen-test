// Shared plumbing for route handlers: role checks, body validation and one
// error shape for every failure: { error: { code, message, fields? } }.

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "./errors";
import { getSession } from "./session";
import { getCurrentStudent } from "./services/students";

export { ApiError, conflict, forbidden, notFound, unprocessable } from "./errors";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Some fields need attention.", fields } },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "That record already exists." } }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Record not found." } }, { status: 404 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Try again." } }, { status: 500 });
}

/** Wrap a route handler so every thrown error becomes a consistent JSON response. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "BAD_JSON", "Request body must be JSON.");
  }
  return schema.parse(body);
}

export async function requireStaff() {
  const session = await getSession();
  if (session.role !== "staff") throw new ApiError(403, "FORBIDDEN", "Only Registry staff can do this.");
  return session;
}

export async function requireStudent() {
  const session = await getSession();
  if (session.role !== "student") throw new ApiError(403, "FORBIDDEN", "Only students can do this.");
  const student = await getCurrentStudent(session.studentNumber);
  if (!student) throw new ApiError(403, "FORBIDDEN", "Choose a student to view as.");
  return student;
}
