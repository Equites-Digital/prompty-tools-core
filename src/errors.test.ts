import { describe, expect, it } from "vitest";

import {
  PromptyAuthError,
  PromptyConfigError,
  PromptyError,
  PromptyHttpError,
  PromptyNetworkError,
  PromptyNotFoundError,
  PromptyRateLimitError,
  PromptyServerError,
  PromptyTimeoutError,
  PromptyValidationError,
} from "./errors.js";

describe("PromptyError", () => {
  it("stores message and defaults to no status/response", () => {
    const err = new PromptyError("boom");
    expect(err.message).toBe("boom");
    expect(err.name).toBe("PromptyError");
    expect(err.status).toBeUndefined();
    expect(err.requestId).toBeUndefined();
    expect(err.response).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
  });

  it("stores optional status, requestId, and response", () => {
    const response = new Response(null, { status: 418 });
    const err = new PromptyError("oops", {
      status: 418,
      requestId: "req_1",
      response,
    });
    expect(err.status).toBe(418);
    expect(err.requestId).toBe("req_1");
    expect(err.response).toBe(response);
  });

  it("forwards cause when provided", () => {
    const inner = new Error("root");
    const err = new PromptyError("wrapper", { cause: inner });
    expect(err.cause).toBe(inner);
  });

  it("does not set cause when not provided", () => {
    const err = new PromptyError("no cause");
    expect(err.cause).toBeUndefined();
  });
});

describe("PromptyConfigError", () => {
  it("has its own name and extends PromptyError", () => {
    const err = new PromptyConfigError("bad config");
    expect(err.name).toBe("PromptyConfigError");
    expect(err).toBeInstanceOf(PromptyError);
    expect(err).toBeInstanceOf(PromptyConfigError);
  });
});

describe("PromptyNetworkError", () => {
  it("extends PromptyError and wraps cause", () => {
    const inner = new Error("ECONNRESET");
    const err = new PromptyNetworkError("network down", { cause: inner });
    expect(err.name).toBe("PromptyNetworkError");
    expect(err.cause).toBe(inner);
    expect(err).toBeInstanceOf(PromptyError);
  });
});

describe("PromptyTimeoutError", () => {
  it("extends PromptyError", () => {
    const err = new PromptyTimeoutError("timed out");
    expect(err.name).toBe("PromptyTimeoutError");
    expect(err).toBeInstanceOf(PromptyError);
  });
});

describe("PromptyHttpError", () => {
  it("requires a status and exposes it typed as number", () => {
    const err = new PromptyHttpError("server said no", 500);
    expect(err.name).toBe("PromptyHttpError");
    expect(err.status).toBe(500);
    expect(err).toBeInstanceOf(PromptyError);
  });

  it("propagates requestId, response, and cause", () => {
    const response = new Response(null, { status: 500 });
    const inner = new Error("inner");
    const err = new PromptyHttpError("x", 500, {
      requestId: "r",
      response,
      cause: inner,
    });
    expect(err.requestId).toBe("r");
    expect(err.response).toBe(response);
    expect(err.cause).toBe(inner);
  });
});

describe("PromptyAuthError", () => {
  it("is a 401 PromptyHttpError subclass", () => {
    const err = new PromptyAuthError("unauthorized", 401);
    expect(err.name).toBe("PromptyAuthError");
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(PromptyHttpError);
    expect(err).toBeInstanceOf(PromptyError);
  });
});

describe("PromptyValidationError", () => {
  it("is a 400 PromptyHttpError subclass", () => {
    const err = new PromptyValidationError("bad input", 400);
    expect(err.name).toBe("PromptyValidationError");
    expect(err.status).toBe(400);
    expect(err).toBeInstanceOf(PromptyHttpError);
  });
});

describe("PromptyNotFoundError", () => {
  it("is a 404 PromptyHttpError subclass", () => {
    const err = new PromptyNotFoundError("missing", 404);
    expect(err.name).toBe("PromptyNotFoundError");
    expect(err.status).toBe(404);
    expect(err).toBeInstanceOf(PromptyHttpError);
  });
});

describe("PromptyRateLimitError", () => {
  it("hard-codes status 429 and accepts no retryAfter", () => {
    const err = new PromptyRateLimitError("slow down");
    expect(err.name).toBe("PromptyRateLimitError");
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBeUndefined();
    expect(err).toBeInstanceOf(PromptyHttpError);
  });

  it("accepts retryAfter, requestId, response, and cause", () => {
    const response = new Response(null, { status: 429 });
    const cause = new Error("cause");
    const err = new PromptyRateLimitError("slow down", {
      retryAfter: 60,
      requestId: "r",
      response,
      cause,
    });
    expect(err.retryAfter).toBe(60);
    expect(err.requestId).toBe("r");
    expect(err.response).toBe(response);
    expect(err.cause).toBe(cause);
  });
});

describe("PromptyServerError", () => {
  it("is a PromptyHttpError subclass for 5xx", () => {
    const err = new PromptyServerError("kaboom", 503);
    expect(err.name).toBe("PromptyServerError");
    expect(err.status).toBe(503);
    expect(err).toBeInstanceOf(PromptyHttpError);
  });
});
