// Browser-side calls to our API routes. Errors come back in one shape:
// { error: { code, message, fields? } } (see src/lib/api.ts).

export class ClientApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function apiCall<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body || options.formData ? "POST" : "GET"),
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ClientApiError(0, "NETWORK", "Couldn't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error ?? {};
    throw new ClientApiError(response.status, error.code ?? "UNKNOWN", error.message ?? "Something went wrong.", error.fields ?? {});
  }
  return data as T;
}
