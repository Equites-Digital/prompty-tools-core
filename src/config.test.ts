import { describe, expect, it, vi } from "vitest";

import { normalizeConfig } from "./config.js";
import { DEFAULT_TIMEOUT_MS, PROMPTY_API_BASE_URL, VERSION } from "./constants.js";
import { PromptyConfigError } from "./errors.js";

describe("normalizeConfig", () => {
  describe("apiKey validation", () => {
    it("throws when apiKey is missing", () => {
      expect(() => normalizeConfig({ apiKey: "" })).toThrow(PromptyConfigError);
      expect(() => normalizeConfig({ apiKey: "" })).toThrow(/required/);
    });

    it("throws when apiKey is not a string", () => {
      expect(() =>
        normalizeConfig({ apiKey: 123 as unknown as string }),
      ).toThrow(PromptyConfigError);
    });

    it("throws when apiKey does not start with pk_", () => {
      expect(() => normalizeConfig({ apiKey: "sk_bad" })).toThrow(/must start with "pk_"/);
    });

    it("accepts a valid apiKey", () => {
      const result = normalizeConfig({ apiKey: "pk_test_123" });
      expect(result.apiKey).toBe("pk_test_123");
    });
  });

  describe("baseUrl normalization", () => {
    it("uses the default base URL when not provided", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.baseUrl).toBe(PROMPTY_API_BASE_URL);
    });

    it("preserves a custom base URL without trailing slash", () => {
      const result = normalizeConfig({
        apiKey: "pk_1",
        baseUrl: "https://api.example.com/v1",
      });
      expect(result.baseUrl).toBe("https://api.example.com/v1");
    });

    it("strips a single trailing slash", () => {
      const result = normalizeConfig({
        apiKey: "pk_1",
        baseUrl: "https://api.example.com/v1/",
      });
      expect(result.baseUrl).toBe("https://api.example.com/v1");
    });
  });

  describe("fetch resolution", () => {
    it("falls back to globalThis.fetch when not provided, bound to globalThis", async () => {
      const spy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));
      try {
        const result = normalizeConfig({ apiKey: "pk_1" });
        // Not the same identity - it's a bound wrapper so Firefox/Safari
        // don't throw "fetch called on an object that does not implement
        // interface Window" when invoked from a stored reference.
        expect(typeof result.fetch).toBe("function");
        await result.fetch("https://example.com");
        expect(spy).toHaveBeenCalledTimes(1);
      } finally {
        spy.mockRestore();
      }
    });

    it("uses the provided fetch implementation", () => {
      const custom = vi.fn();
      const result = normalizeConfig({
        apiKey: "pk_1",
        fetch: custom as unknown as typeof fetch,
      });
      expect(result.fetch).toBe(custom);
    });

    it("throws when no fetch is available", () => {
      const originalFetch = globalThis.fetch;
      // @ts-expect-error - intentionally blank out fetch for this assertion
      globalThis.fetch = undefined;
      try {
        expect(() => normalizeConfig({ apiKey: "pk_1" })).toThrow(
          /fetch is not available/,
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("userAgent", () => {
    it("defaults to the versioned package UA", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.userAgent).toBe(`@prompty-tools/core/${VERSION}`);
    });

    it("uses the provided userAgent", () => {
      const result = normalizeConfig({ apiKey: "pk_1", userAgent: "my-app/2.0" });
      expect(result.userAgent).toBe("my-app/2.0");
    });
  });

  describe("timeoutMs validation", () => {
    it("defaults to DEFAULT_TIMEOUT_MS", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    });

    it("allows 0 to disable", () => {
      const result = normalizeConfig({ apiKey: "pk_1", timeoutMs: 0 });
      expect(result.timeoutMs).toBe(0);
    });

    it("allows Infinity to disable", () => {
      const result = normalizeConfig({ apiKey: "pk_1", timeoutMs: Infinity });
      expect(result.timeoutMs).toBe(Infinity);
    });

    it("throws on negative values", () => {
      expect(() => normalizeConfig({ apiKey: "pk_1", timeoutMs: -1 })).toThrow(
        /timeoutMs must be >= 0/,
      );
    });

    it("throws on NaN", () => {
      expect(() => normalizeConfig({ apiKey: "pk_1", timeoutMs: NaN })).toThrow(
        /finite number or Infinity/,
      );
    });
  });

  describe("maxRetries validation", () => {
    it("defaults to 0", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.maxRetries).toBe(0);
    });

    it("accepts positive integers", () => {
      const result = normalizeConfig({ apiKey: "pk_1", maxRetries: 3 });
      expect(result.maxRetries).toBe(3);
    });

    it("throws on negative values", () => {
      expect(() => normalizeConfig({ apiKey: "pk_1", maxRetries: -1 })).toThrow(
        /non-negative integer/,
      );
    });

    it("throws on non-integers", () => {
      expect(() => normalizeConfig({ apiKey: "pk_1", maxRetries: 1.5 })).toThrow(
        /non-negative integer/,
      );
    });
  });

  describe("defaultHeaders and hooks", () => {
    it("defaults defaultHeaders to an empty object", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.defaultHeaders).toEqual({});
    });

    it("clones the provided defaultHeaders", () => {
      const input = { "x-custom": "value" };
      const result = normalizeConfig({ apiKey: "pk_1", defaultHeaders: input });
      expect(result.defaultHeaders).toEqual(input);
      expect(result.defaultHeaders).not.toBe(input);
    });

    it("passes onRequest and onResponse through unchanged", () => {
      const onRequest = vi.fn();
      const onResponse = vi.fn();
      const result = normalizeConfig({ apiKey: "pk_1", onRequest, onResponse });
      expect(result.onRequest).toBe(onRequest);
      expect(result.onResponse).toBe(onResponse);
    });

    it("leaves hooks undefined when not provided", () => {
      const result = normalizeConfig({ apiKey: "pk_1" });
      expect(result.onRequest).toBeUndefined();
      expect(result.onResponse).toBeUndefined();
    });
  });
});
