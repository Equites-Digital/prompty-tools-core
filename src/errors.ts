/**
 * Base class for every error thrown by `@prompty-tools/core`.
 *
 * @remarks
 * Use `instanceof PromptyError` to catch anything from this library; use
 * `instanceof PromptyRateLimitError` (and siblings) to narrow to a specific
 * failure mode.
 */
export class PromptyError extends Error {
  override readonly name: string = "PromptyError";
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly response: Response | undefined;

  constructor(
    message: string,
    opts: {
      status?: number;
      requestId?: string;
      response?: Response;
      cause?: unknown;
    } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.response = opts.response;
  }
}

/** Thrown synchronously at `createPromptyClient` when the config is invalid. */
export class PromptyConfigError extends PromptyError {
  override readonly name = "PromptyConfigError";
}

/** Thrown when `fetch` rejects before a response is received. */
export class PromptyNetworkError extends PromptyError {
  override readonly name = "PromptyNetworkError";
}

/** Thrown when the request exceeds its configured timeout. */
export class PromptyTimeoutError extends PromptyError {
  override readonly name = "PromptyTimeoutError";
}

/** Base class for non-2xx HTTP responses. */
export class PromptyHttpError extends PromptyError {
  override readonly name: string = "PromptyHttpError";
  override readonly status: number;

  constructor(
    message: string,
    status: number,
    opts: { requestId?: string; response?: Response; cause?: unknown } = {},
  ) {
    super(message, { ...opts, status });
    this.status = status;
  }
}

/** 401 - missing, malformed, or revoked API key. */
export class PromptyAuthError extends PromptyHttpError {
  override readonly name = "PromptyAuthError";
}

/** 400 - input failed server-side validation. */
export class PromptyValidationError extends PromptyHttpError {
  override readonly name = "PromptyValidationError";
}

/** 404 - the target entity does not exist (or is not visible to this key). */
export class PromptyNotFoundError extends PromptyHttpError {
  override readonly name = "PromptyNotFoundError";
}

/** 429 - the API key has exceeded its daily rate limit. */
export class PromptyRateLimitError extends PromptyHttpError {
  override readonly name = "PromptyRateLimitError";
  /** Seconds to wait before retrying, if the server provided a `Retry-After` header. */
  readonly retryAfter: number | undefined;

  constructor(
    message: string,
    opts: {
      retryAfter?: number;
      requestId?: string;
      response?: Response;
      cause?: unknown;
    } = {},
  ) {
    super(message, 429, opts);
    this.retryAfter = opts.retryAfter;
  }
}

/** 5xx - the server returned an internal error. */
export class PromptyServerError extends PromptyHttpError {
  override readonly name = "PromptyServerError";
}
