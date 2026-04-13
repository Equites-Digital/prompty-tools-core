import { PromptyError } from "../errors.js";

/**
 * Shape returned by every list endpoint: an entity-keyed array plus a total.
 */
export interface ListEnvelope<T> {
  items: readonly T[];
  total: number;
}

/**
 * Extracts the items and total from an entity-keyed list response.
 *
 * @example
 * ```ts
 * const body = await http.request("GET", "/prompts");
 * const { items, total } = extractList<PromptSummary>(body, "prompts");
 * ```
 *
 * @throws {PromptyError} If the response is not an object, the entity key is
 *   missing, or the entity value is not an array.
 */
export function extractList<T>(body: unknown, key: string): ListEnvelope<T> {
  if (body === null || typeof body !== "object") {
    throw new PromptyError(
      `Expected list response to be an object, got ${typeof body}`,
    );
  }
  const record = body as Record<string, unknown>;
  const items = record[key];
  if (!Array.isArray(items)) {
    throw new PromptyError(
      `Expected list response to contain "${key}" array, got ${typeof items}`,
    );
  }
  const rawTotal = record["total"];
  const total = typeof rawTotal === "number" ? rawTotal : items.length;
  return { items: items as readonly T[], total };
}
