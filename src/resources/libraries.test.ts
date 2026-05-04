import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { librariesResource } from "./libraries.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: librariesResource(http), fetchImpl };
}

describe("librariesResource", () => {
  it("list() paginates via GET /libraries", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ libraries: [{ id: "l1" }, { id: "l2" }], total: 20 }),
    );
    const page = await resource.list({ pageSize: 12, sort: "most-favorited", scope: "mine" });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(20);
    expect(fetchImpl.calls[0]!.url).toContain("/libraries?");
    expect(fetchImpl.calls[0]!.url).toContain("pageSize=12");
    expect(fetchImpl.calls[0]!.url).toContain("sort=most-favorited");
    expect(fetchImpl.calls[0]!.url).toContain("scope=mine");
  });

  it("listAll() yields items across pages", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ libraries: [{ id: "a" }], total: 12 }),
      makeJsonResponse({ libraries: [{ id: "b" }], total: 12 }),
    ]);
    const ids: string[] = [];
    for await (const lib of resource.listAll({ pageSize: 6 })) {
      ids.push(lib.id);
    }
    expect(ids).toEqual(["a", "b"]);
  });

  it("get() fetches a single library", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "l1", name: "Favorites" }),
    );
    const library = await resource.get("l1");
    expect(library).toMatchObject({ id: "l1", name: "Favorites" });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1$/);
    expect(fetchImpl.calls[0]!.method).toBe("GET");
  });

  it("get() URL-encodes the id", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "x/y" }));
    await resource.get("x/y");
    expect(fetchImpl.calls[0]!.url).toContain("/libraries/x%2Fy");
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("missing")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs the input and returns the create response", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "l1", name: "Favorites", description: "", isPublic: true, tags: [] },
        201,
      ),
    );
    const result = await resource.create({ name: "Favorites" });
    expect(result.id).toBe("l1");
    expect(fetchImpl.calls[0]!.method).toBe("POST");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ name: "Favorites" });
  });

  it("update() PATCHes and returns void", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    const result = await resource.update("l1", { name: "Renamed" });
    expect(result).toBeUndefined();
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ name: "Renamed" });
  });

  it("delete() DELETEs and returns void", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    const result = await resource.delete("l1");
    expect(result).toBeUndefined();
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1$/);
  });

  it("vote() sends PUT /vote with the upvote value", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("l1", 1);
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: 1 });
  });

  it("vote() sends PUT /vote with the downvote value", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("l1", -1);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: -1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("l1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the favorited flag", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ favorited: true }),
    );
    const result = await resource.toggleFavorite("l1");
    expect(result).toEqual({ favorited: true });
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1\/favorite$/);
  });

  it("listPrompts() paginates via GET /libraries/:id/prompts", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ prompts: [{ id: "p1" }, { id: "p2" }], total: 2 }),
    );
    const page = await resource.listPrompts("l1");
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(2);
    expect(page.hasNext).toBe(false);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1\/prompts(\?|$)/);
  });

  it("listPrompts() forwards every supported query param", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    await resource.listPrompts("l1", {
      page: 2,
      pageSize: 24,
      sort: "most-upvoted",
      scope: "all",
      search: "react tag:frontend",
    });
    const url = fetchImpl.calls[0]!.url;
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=24");
    expect(url).toContain("sort=most-upvoted");
    expect(url).toContain("scope=all");
    expect(url).toContain("search=react+tag%3Afrontend");
  });

  it("listPrompts() handles an empty page", async () => {
    const { resource } = buildResource(
      makeJsonResponse({ prompts: [], total: 0 }),
    );
    const page = await resource.listPrompts("l1");
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.hasNext).toBe(false);
  });

  it("listAllPrompts() yields items across pages", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ prompts: [{ id: "p1" }], total: 12 }),
      makeJsonResponse({ prompts: [{ id: "p2" }], total: 12 }),
    ]);
    const ids: string[] = [];
    for await (const p of resource.listAllPrompts("l1", { pageSize: 6 })) {
      ids.push(p.id);
    }
    expect(ids).toEqual(["p1", "p2"]);
  });

  it("addPrompt() POSTs the promptId in the body", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.addPrompt("l1", "p1");
    expect(fetchImpl.calls[0]!.method).toBe("POST");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/libraries\/l1\/prompts$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ promptId: "p1" });
  });

  it("removePrompt() DELETEs with promptId in the query string and no body", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.removePrompt("l1", "p1");
    const call = fetchImpl.calls[0]!;
    expect(call.method).toBe("DELETE");
    expect(call.url).toMatch(/\/libraries\/l1\/prompts\?promptId=p1$/);
    expect(call.body).toBeNull();
  });

  it("removePrompt() URL-encodes the promptId in the query string", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.removePrompt("l1", "x/y");
    expect(fetchImpl.calls[0]!.url).toContain("promptId=x%2Fy");
  });
});
