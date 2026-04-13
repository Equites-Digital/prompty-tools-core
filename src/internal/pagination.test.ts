import { describe, expect, it, vi } from "vitest";

import { normalizeConfig } from "../config.js";
import { createMockFetch } from "../test-utils/fake-fetch.js";
import { makeJsonResponse } from "../test-utils/responses.js";
import { createHttp } from "./http.js";
import {
  createPage,
  iteratePages,
  listPaged,
  listPagedVersions,
} from "./pagination.js";

function buildHttp(responses: Response[]) {
  const fetchImpl = createMockFetch(responses);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { http, fetchImpl };
}

describe("createPage", () => {
  it("reports hasNext correctly at the boundary", () => {
    const page = createPage<number>([1, 2], 4, 1, 2, () => {
      throw new Error("unused");
    });
    expect(page.hasNext).toBe(true);
    expect(page.hasPrev).toBe(false);
  });

  it("reports hasNext=false on the last page", () => {
    const page = createPage<number>([3, 4], 4, 2, 2, () => {
      throw new Error("unused");
    });
    expect(page.hasNext).toBe(false);
    expect(page.hasPrev).toBe(true);
  });

  it("next() rejects when there is no next page", async () => {
    const page = createPage<number>([1], 1, 1, 10, () => {
      throw new Error("unused");
    });
    await expect(page.next()).rejects.toBeInstanceOf(RangeError);
  });

  it("prev() rejects on the first page", async () => {
    const page = createPage<number>([1], 1, 1, 10, () => {
      throw new Error("unused");
    });
    await expect(page.prev()).rejects.toBeInstanceOf(RangeError);
  });

  it("next() calls the fetcher with the next page number", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 2,
      hasNext: false,
      hasPrev: true,
      next: () => Promise.reject(new Error("stop")),
      prev: () => Promise.reject(new Error("stop")),
    });
    const page = createPage<number>([1, 2], 5, 1, 2, fetcher);
    await page.next();
    expect(fetcher).toHaveBeenCalledWith(2);
  });

  it("prev() calls the fetcher with the previous page number", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 2,
      hasNext: true,
      hasPrev: false,
      next: () => Promise.reject(new Error("stop")),
      prev: () => Promise.reject(new Error("stop")),
    });
    const page = createPage<number>([3, 4], 6, 2, 2, fetcher);
    await page.prev();
    expect(fetcher).toHaveBeenCalledWith(1);
  });
});

describe("listPaged", () => {
  it("fetches a single page and parses the envelope", async () => {
    const { http, fetchImpl } = buildHttp([
      makeJsonResponse({ prompts: [{ id: "a" }, { id: "b" }], total: 10 }),
    ]);
    const page = await listPaged<{ id: string }>(http, "prompts", "/prompts", {
      pageSize: 6,
    });
    expect(page.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(page.total).toBe(10);
    expect(page.pageSize).toBe(6);
    expect(page.hasNext).toBe(true);
    expect(fetchImpl.calls[0]!.url).toContain("pageSize=6");
  });

  it("defaults page to 1 and pageSize to 12", async () => {
    const { http } = buildHttp([
      makeJsonResponse({ prompts: [], total: 0 }),
    ]);
    const page = await listPaged<{ id: string }>(http, "prompts", "/prompts", undefined);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(12);
    expect(page.hasNext).toBe(false);
  });

  it("passes sort, scope, search, and tag to the query", async () => {
    const { http, fetchImpl } = buildHttp([
      makeJsonResponse({ prompts: [], total: 0 }),
    ]);
    await listPaged<unknown>(http, "prompts", "/prompts", {
      sort: "most-upvoted",
      scope: "mine",
      search: "hello",
      tag: "react",
    });
    const url = fetchImpl.calls[0]!.url;
    expect(url).toContain("sort=most-upvoted");
    expect(url).toContain("scope=mine");
    expect(url).toContain("search=hello");
    expect(url).toContain("tag=react");
  });

  it("forwards AbortSignal when provided", async () => {
    const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return makeJsonResponse({ prompts: [], total: 0 });
    });
    const http = createHttp(
      normalizeConfig({
        apiKey: "pk_test",
        fetch: fetchImpl as unknown as typeof fetch,
        timeoutMs: 0,
      }),
    );
    await listPaged<unknown>(http, "prompts", "/prompts", {
      signal: new AbortController().signal,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("next() refetches with page+1", async () => {
    const { http, fetchImpl } = buildHttp([
      makeJsonResponse({ prompts: [{ id: "a" }], total: 12 }),
      makeJsonResponse({ prompts: [{ id: "b" }], total: 12 }),
    ]);
    const page1 = await listPaged<{ id: string }>(http, "prompts", "/prompts", {
      pageSize: 6,
    });
    const page2 = await page1.next();
    expect(page2.items).toEqual([{ id: "b" }]);
    expect(fetchImpl.calls[1]!.url).toContain("page=2");
  });
});

describe("listPagedVersions", () => {
  it("fetches version pages with default pageSize 20", async () => {
    const { http, fetchImpl } = buildHttp([
      makeJsonResponse({ versions: [{ id: "v1" }], total: 1 }),
    ]);
    const page = await listPagedVersions<{ id: string }>(
      http,
      "versions",
      "/prompts/p/versions",
      undefined,
    );
    expect(page.items).toEqual([{ id: "v1" }]);
    expect(page.pageSize).toBe(20);
    expect(fetchImpl.calls[0]!.url).toContain("/prompts/p/versions");
  });

  it("respects a supplied pageSize and signal", async () => {
    const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return makeJsonResponse({ versions: [], total: 0 });
    });
    const http = createHttp(
      normalizeConfig({
        apiKey: "pk_test",
        fetch: fetchImpl as unknown as typeof fetch,
        timeoutMs: 0,
      }),
    );
    const page = await listPagedVersions<unknown>(
      http,
      "versions",
      "/prompts/p/versions",
      { pageSize: 50, signal: new AbortController().signal },
    );
    expect(page.pageSize).toBe(50);
  });

  it("next() fetches the next version page", async () => {
    const { http, fetchImpl } = buildHttp([
      makeJsonResponse({ versions: [{ id: "v1" }], total: 20 }),
      makeJsonResponse({ versions: [{ id: "v2" }], total: 20 }),
    ]);
    const first = await listPagedVersions<{ id: string }>(
      http,
      "versions",
      "/prompts/p/versions",
      { pageSize: 10 },
    );
    const second = await first.next();
    expect(second.items).toEqual([{ id: "v2" }]);
    expect(fetchImpl.calls[1]!.url).toContain("page=2");
  });
});

describe("iteratePages", () => {
  it("walks all pages and yields items", async () => {
    const { http } = buildHttp([
      makeJsonResponse({ prompts: [{ id: "a" }, { id: "b" }], total: 5 }),
      makeJsonResponse({ prompts: [{ id: "c" }, { id: "d" }], total: 5 }),
      makeJsonResponse({ prompts: [{ id: "e" }], total: 5 }),
    ]);
    const collected: string[] = [];
    for await (const item of iteratePages<{ id: string }>(
      http,
      "prompts",
      "/prompts",
      { pageSize: 2 as unknown as 6 },
    )) {
      collected.push(item.id);
    }
    expect(collected).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("terminates on an empty first page", async () => {
    const { http } = buildHttp([
      makeJsonResponse({ prompts: [], total: 0 }),
    ]);
    const collected: unknown[] = [];
    for await (const item of iteratePages(http, "prompts", "/prompts", undefined)) {
      collected.push(item);
    }
    expect(collected).toEqual([]);
  });

  it("propagates errors from page fetches", async () => {
    const { http } = buildHttp([
      makeJsonResponse({ prompts: [{ id: "a" }], total: 3 }),
      new Response(JSON.stringify({ error: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    const iter = iteratePages<{ id: string }>(http, "prompts", "/prompts", {
      pageSize: 1 as unknown as 6,
    });
    const first = await iter.next();
    expect(first.value).toEqual({ id: "a" });
    await expect(iter.next()).rejects.toBeDefined();
  });
});
