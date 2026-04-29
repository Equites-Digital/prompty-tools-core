import { describe, expect, it, vi } from "vitest";

import { createPromptyClient } from "./client.js";
import { PromptyConfigError } from "./errors.js";
import { createMockFetch } from "./test-utils/fake-fetch.js";
import { makeJsonResponse } from "./test-utils/responses.js";

describe("createPromptyClient", () => {
  it("returns a client with all five resource namespaces and nested collections", () => {
    const fetchImpl = createMockFetch([]);
    const client = createPromptyClient({
      apiKey: "pk_test",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    expect(client.prompts).toBeDefined();
    expect(client.personas).toBeDefined();
    expect(client.tones).toBeDefined();
    expect(client.tones.collections).toBeDefined();
    expect(client.outputs).toBeDefined();
    expect(client.constraints).toBeDefined();
    expect(client.constraints.collections).toBeDefined();
  });

  it("throws PromptyConfigError on invalid config", () => {
    expect(() => createPromptyClient({ apiKey: "" })).toThrow(PromptyConfigError);
  });

  it("propagates the injected fetch to HTTP calls", async () => {
    const fetchImpl = createMockFetch(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    const client = createPromptyClient({
      apiKey: "pk_test",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await client.prompts.list();
    expect(fetchImpl.calls).toHaveLength(1);
    expect(fetchImpl.calls[0]!.headers["authorization"]).toBe("Bearer pk_test");
  });

  it("uses a custom baseUrl when provided", async () => {
    const fetchImpl = createMockFetch(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    const client = createPromptyClient({
      apiKey: "pk_test",
      baseUrl: "https://api.example.com/v1",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await client.prompts.list();
    expect(fetchImpl.calls[0]!.url).toContain("https://api.example.com/v1/prompts");
  });

  it("propagates defaultHeaders", async () => {
    const fetchImpl = createMockFetch(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    const client = createPromptyClient({
      apiKey: "pk_test",
      defaultHeaders: { "x-trace": "abc" },
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await client.prompts.list();
    expect(fetchImpl.calls[0]!.headers["x-trace"]).toBe("abc");
  });

  it("invokes onRequest and onResponse hooks", async () => {
    const fetchImpl = createMockFetch(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const client = createPromptyClient({
      apiKey: "pk_test",
      fetch: fetchImpl as unknown as typeof fetch,
      onRequest,
      onResponse,
    });
    await client.prompts.list();
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledTimes(1);
  });
});
