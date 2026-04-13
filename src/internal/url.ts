/**
 * Builds a request URL from a base URL, path, and optional query params.
 *
 * @remarks
 * - Path is joined as-is (callers are responsible for `encodeURIComponent` on ids).
 * - `undefined` and empty-string values in `query` are skipped; everything else
 *   is coerced to a string via `URLSearchParams`.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const url = `${baseUrl}${path}`;
  const params = buildSearchParams(query);
  const qs = params.toString();
  return qs.length > 0 ? `${url}?${qs}` : url;
}

/**
 * Converts a plain object to `URLSearchParams`, skipping `undefined` and
 * empty-string values.
 */
export function buildSearchParams(
  query: Record<string, string | number | boolean | undefined> | undefined,
): URLSearchParams {
  const params = new URLSearchParams();
  if (!query) return params;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value.length === 0) continue;
    params.append(key, String(value));
  }
  return params;
}
