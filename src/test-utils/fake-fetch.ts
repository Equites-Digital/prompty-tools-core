import { vi } from "vitest";

export type FakeFetchHandler =
  | Response
  | Error
  | ((req: Request) => Response | Promise<Response>);

/**
 * Captured metadata from a single fake-fetch call.
 */
export interface FakeFetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/**
 * Creates a fake `fetch` that returns queued handlers in order.
 *
 * Each handler is consumed on first call:
 * - A `Response` is returned directly.
 * - An `Error` is thrown.
 * - A function is invoked with the constructed `Request` and its return is used.
 *
 * The returned mock exposes `.calls` with the captured request metadata for
 * assertions.
 */
export function createMockFetch(
  handlers: FakeFetchHandler | FakeFetchHandler[],
): ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) & {
  calls: FakeFetchCall[];
} {
  const queue: FakeFetchHandler[] = Array.isArray(handlers)
    ? [...handlers]
    : [handlers];
  const calls: FakeFetchCall[] = [];

  const impl = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const req = input instanceof Request ? input : new Request(input, init);
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    let body: string | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.clone().text();
        if (body.length === 0) body = null;
      } catch {
        body = null;
      }
    }
    calls.push({ url: req.url, method: req.method, headers, body });

    const next = queue.shift();
    if (next === undefined) {
      throw new Error("createMockFetch: no handler queued for call");
    }
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next(req);
    return next;
  };

  const mock = vi.fn(impl);
  return Object.assign(mock, { calls });
}
