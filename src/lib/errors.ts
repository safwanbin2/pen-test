// One error type for services and route handlers. Route handlers turn it into
// { error: { code, message, fields? } } with the given HTTP status.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string, fields?: Record<string, string>) => new ApiError(409, "CONFLICT", message, fields);
export const unprocessable = (message: string, fields?: Record<string, string>) =>
  new ApiError(422, "UNPROCESSABLE", message, fields);
export const forbidden = (message: string) => new ApiError(403, "FORBIDDEN", message);
