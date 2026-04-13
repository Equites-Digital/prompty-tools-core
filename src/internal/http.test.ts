import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeConfig, type NormalizedConfig } from "../config.js";
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
import { createMockFetch } from "../test-utils/fake-fetch.js";
import {
  makeEmptyResponse,
  makeErrorResponse,
  makeJsonResponse,
} from "../test-utils/responses.js";
import { createHttp } from "./http.js";

function makeConfig(overrides: Partial<NormalizedConfig> = {}): NormalizedConfig {
  const fetchImpl = overrides.fetch ?? (vi.fn() as unknown as typeof fetch);
  const base = normalizeConfig({ apiKey: "pk_test_abc", fetch: fetchImpl });
  return { ...base, ...overrides };
}

describe("http.request", () => {
  describe("request construction", () => {
    it("uses GET with no body", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({ ok: true }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));

      await http.request("GET", "/prompts");

      expect(fetchImpl.calls).toHaveLength(1);
      expect(fetchImpl.calls[0]!.method).toBe("GET");
      expect(fetchImpl.calls[0]!.url).toBe("https://www.prompty.tools/api/v1/prompts");
      expect(fetchImpl.calls[0]!.body).toBeNull();
    });

    it("sets Authorization, Accept, and User-Agent by default", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({}));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));

      await http.request("GET", "/prompts");

      const headers = fetchImpl.calls[0]!.headers;
      expect(headers["authorization"]).toBe("Bearer pk_test_abc");
      expect(headers["accept"]).toBe("application/json");
      expect(headers["user-agent"]).toMatch(/^@prompty-tools\/core\//);
    });

    it("appends query params via buildUrl", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({}));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));

      await http.request("GET", "/prompts", {
        query: { page: 2, sort: "newest", search: undefined },
      });

      expect(fetchImpl.calls[0]!.url).toBe(
        "https://www.prompty.tools/api/v1/prompts?page=2&sort=newest",
      );
    });

    it("serializes body as JSON and sets Content-Type", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({ id: "p1" }, 201));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));

      await http.request("POST", "/prompts", { body: { title: "hi" } });

      expect(fetchImpl.calls[0]!.method).toBe("POST");
      expect(fetchImpl.calls[0]!.headers["content-type"]).toBe("application/json");
      expect(fetchImpl.calls[0]!.body).toBe(JSON.stringify({ title: "hi" }));
    });

    it("merges default headers and per-call headers (per-call wins)", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({}));
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          defaultHeaders: { "x-default": "d", "x-override": "from-default" },
        }),
      );

      await http.request("GET", "/x", { headers: { "x-extra": "e", "x-override": "from-call" } });

      const headers = fetchImpl.calls[0]!.headers;
      expect(headers["x-default"]).toBe("d");
      expect(headers["x-extra"]).toBe("e");
      expect(headers["x-override"]).toBe("from-call");
    });

    it("skips User-Agent in browser-like env", async () => {
      const originalWindow = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = {};
      try {
        const fetchImpl = createMockFetch(makeJsonResponse({}));
        const http = createHttp(
          makeConfig({ fetch: fetchImpl as unknown as typeof fetch }),
        );
        await http.request("GET", "/x");
        expect(fetchImpl.calls[0]!.headers["user-agent"]).toBeUndefined();
      } finally {
        if (originalWindow === undefined) {
          delete (globalThis as { window?: unknown }).window;
        } else {
          (globalThis as { window?: unknown }).window = originalWindow;
        }
      }
    });
  });

  describe("success parsing", () => {
    it("parses JSON body on 200", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({ hello: "world" }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const result = await http.request<{ hello: string }>("GET", "/x");
      expect(result).toEqual({ hello: "world" });
    });

    it("returns undefined for 204 No Content", async () => {
      const fetchImpl = createMockFetch(makeEmptyResponse(204));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const result = await http.request("DELETE", "/x");
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty-body 200", async () => {
      const fetchImpl = createMockFetch(new Response("", { status: 200 }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const result = await http.request("GET", "/x");
      expect(result).toBeUndefined();
    });

    it("throws PromptyError when a success body is not valid JSON", async () => {
      const fetchImpl = createMockFetch([
        new Response("not json", { status: 200 }),
        new Response("not json", { status: 200 }),
      ]);
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toThrow(PromptyError);
      await expect(http.request("GET", "/x")).rejects.toThrow(/parse JSON/);
    });
  });

  describe("error classification", () => {
    it("maps 400 to PromptyValidationError", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("bad input", 400));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("POST", "/x", { body: {} })).rejects.toBeInstanceOf(
        PromptyValidationError,
      );
    });

    it("maps 401 to PromptyAuthError", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("nope", 401));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyAuthError);
    });

    it("maps 404 to PromptyNotFoundError", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("missing", 404));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = await http.request("GET", "/x").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PromptyNotFoundError);
      expect((err as PromptyNotFoundError).message).toBe("missing");
    });

    it("maps 429 to PromptyRateLimitError without retry-after", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("slow down", 429));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = await http.request("GET", "/x").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PromptyRateLimitError);
      expect((err as PromptyRateLimitError).retryAfter).toBeUndefined();
    });

    it("maps 429 with a valid retry-after header", async () => {
      const fetchImpl = createMockFetch(
        makeErrorResponse("slow down", 429, { "retry-after": "45" }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = await http.request("GET", "/x").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PromptyRateLimitError);
      expect((err as PromptyRateLimitError).retryAfter).toBe(45);
    });

    it("ignores a non-numeric retry-after header", async () => {
      const fetchImpl = createMockFetch(
        makeErrorResponse("slow", 429, { "retry-after": "later" }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyRateLimitError;
      expect(err.retryAfter).toBeUndefined();
    });

    it("ignores a negative retry-after header", async () => {
      const fetchImpl = createMockFetch(
        makeErrorResponse("slow", 429, { "retry-after": "-5" }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyRateLimitError;
      expect(err.retryAfter).toBeUndefined();
    });

    it("maps 500 to PromptyServerError", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("boom", 500));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyServerError);
    });

    it("maps other 4xx to generic PromptyHttpError", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("teapot", 418));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err).toBeInstanceOf(PromptyHttpError);
      expect(err).not.toBeInstanceOf(PromptyNotFoundError);
      expect(err.status).toBe(418);
    });

    it("reads x-request-id into the error", async () => {
      const fetchImpl = createMockFetch(
        makeErrorResponse("nope", 401, { "x-request-id": "req_42" }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyAuthError;
      expect(err.requestId).toBe("req_42");
    });

    it("falls back to raw text when body is not JSON", async () => {
      const fetchImpl = createMockFetch(new Response("plain text", { status: 400 }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err.message).toBe("plain text");
    });

    it("falls back to status text when the error body is empty", async () => {
      const fetchImpl = createMockFetch(new Response("", { status: 418, statusText: "Teapot" }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err.message).toBe("Teapot");
    });

    it("falls back to HTTP N when body and statusText are empty", async () => {
      const fetchImpl = createMockFetch(new Response("", { status: 599, statusText: "" }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err.message).toBe("HTTP 599");
    });

    it("falls back when the JSON error body has a non-string error field", async () => {
      const fetchImpl = createMockFetch(
        new Response(JSON.stringify({ error: 123 }), {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err.message).toBe("Bad Request");
    });

    it("falls back when the JSON error body has no error field", async () => {
      const fetchImpl = createMockFetch(
        new Response(JSON.stringify({ other: "thing" }), {
          status: 400,
          statusText: "Bad",
          headers: { "Content-Type": "application/json" },
        }),
      );
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyHttpError;
      expect(err.message).toBe("Bad");
    });

    it("handles a response whose .text() rejects", async () => {
      const brokenResponse = new Response("", { status: 500, statusText: "Boom" });
      vi.spyOn(brokenResponse, "text").mockRejectedValue(new Error("cannot read"));
      const fetchImpl = createMockFetch(brokenResponse);
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      const err = (await http.request("GET", "/x").catch((e: unknown) => e)) as PromptyServerError;
      expect(err).toBeInstanceOf(PromptyServerError);
      expect(err.message).toBe("Boom");
    });
  });

  describe("fetch-level errors", () => {
    it("maps AbortError to PromptyTimeoutError", async () => {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      const fetchImpl = createMockFetch(abortErr);
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyTimeoutError);
    });

    it("maps TimeoutError name to PromptyTimeoutError", async () => {
      const timeoutErr = new Error("timeout");
      timeoutErr.name = "TimeoutError";
      const fetchImpl = createMockFetch(timeoutErr);
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyTimeoutError);
    });

    it("maps generic Error to PromptyNetworkError", async () => {
      const fetchImpl = createMockFetch(new Error("dns fail"));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyNetworkError);
    });

    it("maps non-Error thrown value to PromptyNetworkError", async () => {
      // vi-compatible fetch that throws a non-Error
      const fetchImpl = vi.fn().mockRejectedValue("string error");
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyNetworkError);
    });
  });

  describe("hooks", () => {
    it("calls onRequest before fetch and onResponse after success", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({ ok: true }));
      const onRequest = vi.fn();
      const onResponse = vi.fn();
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          onRequest,
          onResponse,
        }),
      );

      await http.request("GET", "/x");

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest.mock.calls[0]![0]).toMatchObject({
        method: "GET",
        url: "https://www.prompty.tools/api/v1/x",
      });
      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0]![0]).toMatchObject({
        method: "GET",
        status: 200,
        ok: true,
        error: undefined,
      });
    });

    it("calls onResponse on HTTP error", async () => {
      const fetchImpl = createMockFetch(makeErrorResponse("nope", 401));
      const onResponse = vi.fn();
      const http = createHttp(
        makeConfig({ fetch: fetchImpl as unknown as typeof fetch, onResponse }),
      );
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyAuthError);
      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0]![0]).toMatchObject({ ok: false, status: 401 });
    });

    it("calls onResponse when fetch throws", async () => {
      const fetchImpl = createMockFetch(new Error("dns fail"));
      const onResponse = vi.fn();
      const http = createHttp(
        makeConfig({ fetch: fetchImpl as unknown as typeof fetch, onResponse }),
      );
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(PromptyNetworkError);
      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0]![0]).toMatchObject({
        ok: false,
        status: undefined,
      });
    });

    it("still works without any hooks", async () => {
      const fetchImpl = createMockFetch(makeJsonResponse({ ok: true }));
      const http = createHttp(makeConfig({ fetch: fetchImpl as unknown as typeof fetch }));
      await expect(http.request("GET", "/x")).resolves.toEqual({ ok: true });
    });
  });

  describe("signals and timeout", () => {
    it("passes a timeout signal when timeoutMs is finite", async () => {
      const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return makeJsonResponse({});
      });
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          timeoutMs: 5000,
        }),
      );
      await http.request("GET", "/x");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("omits signal when timeoutMs is 0 and no user signal", async () => {
      const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
        expect(init?.signal).toBeUndefined();
        return makeJsonResponse({});
      });
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          timeoutMs: 0,
        }),
      );
      await http.request("GET", "/x");
    });

    it("passes a user-provided signal", async () => {
      const userSignal = new AbortController().signal;
      const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return makeJsonResponse({});
      });
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          timeoutMs: 0,
        }),
      );
      await http.request("GET", "/x", { signal: userSignal });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("combines user signal with timeout signal", async () => {
      const userSignal = new AbortController().signal;
      const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return makeJsonResponse({});
      });
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          timeoutMs: 10_000,
        }),
      );
      await http.request("GET", "/x", { signal: userSignal });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });

  describe("retries", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Deterministic backoff jitter.
      vi.spyOn(Math, "random").mockReturnValue(0);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("retries GET on 500 and succeeds on the second attempt", async () => {
      const fetchImpl = createMockFetch([
        makeErrorResponse("boom", 500),
        makeJsonResponse({ ok: true }),
      ]);
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 1,
        }),
      );
      const promise = http.request<{ ok: boolean }>("GET", "/x");
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchImpl.calls).toHaveLength(2);
    });

    it("retries GET on 429 and succeeds on the second attempt", async () => {
      const fetchImpl = createMockFetch([
        makeErrorResponse("slow", 429),
        makeJsonResponse({ ok: true }),
      ]);
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 1,
        }),
      );
      const promise = http.request<{ ok: boolean }>("GET", "/x");
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
    });

    it("throws after exhausting retries", async () => {
      const fetchImpl = createMockFetch([
        makeErrorResponse("boom", 500),
        makeErrorResponse("boom", 500),
        makeErrorResponse("boom", 500),
      ]);
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 2,
        }),
      );
      const promise = http.request("GET", "/x");
      promise.catch(() => {
        /* expected */
      });
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toBeInstanceOf(PromptyServerError);
      expect(fetchImpl.calls).toHaveLength(3);
    });

    it("does not retry on 400", async () => {
      const fetchImpl = createMockFetch([makeErrorResponse("bad", 400)]);
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 3,
        }),
      );
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(
        PromptyValidationError,
      );
      expect(fetchImpl.calls).toHaveLength(1);
    });

    it("does not retry non-GET requests", async () => {
      const fetchImpl = createMockFetch([makeErrorResponse("boom", 500)]);
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 3,
        }),
      );
      await expect(
        http.request("POST", "/x", { body: {} }),
      ).rejects.toBeInstanceOf(PromptyServerError);
      expect(fetchImpl.calls).toHaveLength(1);
    });

    it("does not retry PromptyNetworkError", async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error("dns fail"));
      const http = createHttp(
        makeConfig({
          fetch: fetchImpl as unknown as typeof fetch,
          maxRetries: 3,
        }),
      );
      await expect(http.request("GET", "/x")).rejects.toBeInstanceOf(
        PromptyNetworkError,
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });
});
