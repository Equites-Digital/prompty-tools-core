import type { NormalizedConfig, RequestContext } from "../config.js";
import {
  PromptyAuthError,
  PromptyError,
  PromptyHttpError,
  PromptyNetworkError,
  PromptyNotFoundError,
  PromptyRateLimitError,
  PromptyServerError,
  PromptyTimeoutError,
  PromptyValidationError,
} from "../errors.js";
import { buildUrl } from "./url.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * Low-level HTTP interface used by every resource. Abstracted so resources
 * don't have to touch `fetch` directly.
 */
export interface Http {
  request<T = unknown>(
    method: HttpMethod,
    path: string,
    opts?: RequestOptions,
  ): Promise<T>;
}

/**
 * Factory that creates an {@link Http} bound to a normalized config.
 */
export function createHttp(config: NormalizedConfig): Http {
  return {
    request: <T>(method: HttpMethod, path: string, opts: RequestOptions = {}) =>
      doRequestWithRetry<T>(config, method, path, opts),
  };
}

async function doRequestWithRetry<T>(
  config: NormalizedConfig,
  method: HttpMethod,
  path: string,
  opts: RequestOptions,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await doRequest<T>(config, method, path, opts);
    } catch (err) {
      if (attempt >= config.maxRetries || !shouldRetry(err, method)) {
        throw err;
      }
      attempt++;
      await delay(backoffMs(attempt));
    }
  }
}

function shouldRetry(err: unknown, method: HttpMethod): boolean {
  if (method !== "GET") return false;
  if (err instanceof PromptyRateLimitError) return true;
  if (err instanceof PromptyServerError) return true;
  return false;
}

function backoffMs(attempt: number): number {
  const base = Math.min(30_000, 200 * 2 ** (attempt - 1));
  const jitter = Math.random() * base * 0.25;
  return base + jitter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function doRequest<T>(
  config: NormalizedConfig,
  method: HttpMethod,
  path: string,
  opts: RequestOptions,
): Promise<T> {
  const url = buildUrl(config.baseUrl, path, opts.query);
  const headers = buildHeaders(config, opts, method);
  const hasBody = opts.body !== undefined;
  const body = hasBody ? JSON.stringify(opts.body) : undefined;
  const signal = combineSignals(opts.signal, config.timeoutMs);

  const requestContext: RequestContext = { method, url, headers, body: opts.body };
  if (config.onRequest) {
    await config.onRequest(requestContext);
  }

  const startedAt = Date.now();
  let response: Response | undefined;
  let caught: unknown;
  try {
    response = await config.fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      ...(signal !== undefined ? { signal } : {}),
    });
  } catch (err) {
    caught = err;
  }

  const durationMs = Date.now() - startedAt;

  if (caught !== undefined) {
    const mapped = mapFetchError(caught);
    if (config.onResponse) {
      await config.onResponse({
        method,
        url,
        status: undefined,
        ok: false,
        durationMs,
        error: mapped,
      });
    }
    throw mapped;
  }

  // Safety: fetch resolving without a Response is impossible per spec.
  /* c8 ignore next 3 */
  if (!response) {
    throw new PromptyNetworkError("fetch resolved without a Response");
  }

  if (response.ok) {
    const parsed = await parseSuccessBody<T>(response);
    if (config.onResponse) {
      await config.onResponse({
        method,
        url,
        status: response.status,
        ok: true,
        durationMs,
        error: undefined,
      });
    }
    return parsed;
  }

  const httpError = await toHttpError(response);
  if (config.onResponse) {
    await config.onResponse({
      method,
      url,
      status: response.status,
      ok: false,
      durationMs,
      error: httpError,
    });
  }
  throw httpError;
}

function buildHeaders(
  config: NormalizedConfig,
  opts: RequestOptions,
  _method: HttpMethod,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (isNodeLikeEnv()) {
    headers["User-Agent"] = config.userAgent;
  }
  for (const [key, value] of Object.entries(config.defaultHeaders)) {
    headers[key] = value;
  }
  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      headers[key] = value;
    }
  }
  return headers;
}

function isNodeLikeEnv(): boolean {
  return typeof globalThis.window === "undefined";
}

function combineSignals(
  userSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (userSignal) signals.push(userSignal);
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    signals.push(AbortSignal.timeout(timeoutMs));
  }
  if (signals.length === 0) return undefined;
  if (signals.length === 1) return signals[0];
  return AbortSignal.any(signals);
}

async function parseSuccessBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (text.length === 0) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new PromptyError("Failed to parse JSON response body", {
      status: response.status,
      response,
      cause: err,
    });
  }
}

function mapFetchError(err: unknown): PromptyError {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new PromptyTimeoutError("Request timed out", { cause: err });
  }
  return new PromptyNetworkError("Network request failed", { cause: err });
}

async function toHttpError(response: Response): Promise<PromptyHttpError> {
  const { message } = await parseErrorBody(response);
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const base = {
    ...(requestId !== undefined ? { requestId } : {}),
    response,
  };
  switch (response.status) {
    case 400:
      return new PromptyValidationError(message, 400, base);
    case 401:
      return new PromptyAuthError(message, 401, base);
    case 404:
      return new PromptyNotFoundError(message, 404, base);
    case 429: {
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      return new PromptyRateLimitError(message, {
        ...base,
        ...(retryAfter !== undefined ? { retryAfter } : {}),
      });
    }
    default:
      if (response.status >= 500) {
        return new PromptyServerError(message, response.status, base);
      }
      return new PromptyHttpError(message, response.status, base);
  }
}

async function parseErrorBody(response: Response): Promise<{ message: string }> {
  const text = await response.text().catch(() => "");
  if (text.length > 0) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed !== null && typeof parsed === "object" && "error" in parsed) {
        const errValue = (parsed as { error: unknown }).error;
        if (typeof errValue === "string" && errValue.length > 0) {
          return { message: errValue };
        }
      }
    } catch {
      return { message: text };
    }
  }
  return { message: response.statusText || `HTTP ${response.status}` };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  return undefined;
}
