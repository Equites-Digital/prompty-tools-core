/**
 * Constructs a JSON `Response` for tests.
 */
export function makeJsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * Constructs an error-envelope `Response` matching the prompty API shape:
 * `{ error: "<message>" }`.
 */
export function makeErrorResponse(
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return makeJsonResponse({ error: message }, status, headers);
}

/**
 * Constructs an empty `Response` (body = null), defaulting to 204.
 */
export function makeEmptyResponse(status = 204, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}
