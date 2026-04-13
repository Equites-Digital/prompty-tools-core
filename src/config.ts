import { API_KEY_PREFIX, DEFAULT_TIMEOUT_MS, PROMPTY_API_BASE_URL, VERSION } from "./constants.js";
import { PromptyConfigError } from "./errors.js";

/**
 * Context passed to the `onRequest` hook before every fetch call.
 */
export interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Context passed to the `onResponse` hook after every fetch call.
 */
export interface ResponseContext {
  method: string;
  url: string;
  status: number | undefined;
  ok: boolean;
  durationMs: number;
  error: unknown;
}

/**
 * Options accepted by {@link createPromptyClient}.
 */
export interface PromptyClientConfig {
  /** Required. Must start with `"pk_"`. */
  apiKey: string;
  /** Default: `"https://www.prompty.tools/api/v1"`. Trailing slashes are normalized. */
  baseUrl?: string;
  /** Custom fetch implementation. Default: `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** User-Agent header (Node-only; browsers drop it). Default: `"@prompty-tools/core/<version>"`. */
  userAgent?: string;
  /** Per-request timeout in milliseconds. Default: 30 000. Use `0` or `Infinity` to disable. */
  timeoutMs?: number;
  /** Max retries for 429/5xx on GET requests. Default: 0 (opt-in). */
  maxRetries?: number;
  /** Extra headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /** Called just before every fetch call. */
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  /** Called just after every fetch call (success or error). */
  onResponse?: (ctx: ResponseContext) => void | Promise<void>;
}

/**
 * Normalized config used internally. Every optional field is resolved to its
 * effective value so the rest of the client never re-derives defaults.
 */
export interface NormalizedConfig {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
  userAgent: string;
  timeoutMs: number;
  maxRetries: number;
  defaultHeaders: Record<string, string>;
  onRequest: ((ctx: RequestContext) => void | Promise<void>) | undefined;
  onResponse: ((ctx: ResponseContext) => void | Promise<void>) | undefined;
}

/**
 * Validates the user-supplied config and returns a normalized form with
 * every default resolved.
 *
 * @throws {PromptyConfigError} If the config is invalid.
 */
export function normalizeConfig(config: PromptyClientConfig): NormalizedConfig {
  if (typeof config.apiKey !== "string" || config.apiKey.length === 0) {
    throw new PromptyConfigError("apiKey is required");
  }
  if (!config.apiKey.startsWith(API_KEY_PREFIX)) {
    throw new PromptyConfigError(`apiKey must start with "${API_KEY_PREFIX}"`);
  }

  const rawBaseUrl = config.baseUrl ?? PROMPTY_API_BASE_URL;
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new PromptyConfigError(
      "fetch is not available in this environment; pass a custom fetch via config.fetch",
    );
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) && timeoutMs !== Infinity) {
    throw new PromptyConfigError("timeoutMs must be a finite number or Infinity");
  }
  if (timeoutMs < 0) {
    throw new PromptyConfigError("timeoutMs must be >= 0");
  }

  const maxRetries = config.maxRetries ?? 0;
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new PromptyConfigError("maxRetries must be a non-negative integer");
  }

  return {
    apiKey: config.apiKey,
    baseUrl,
    fetch: fetchImpl,
    userAgent: config.userAgent ?? `@prompty-tools/core/${VERSION}`,
    timeoutMs,
    maxRetries,
    defaultHeaders: { ...config.defaultHeaders },
    onRequest: config.onRequest,
    onResponse: config.onResponse,
  };
}
