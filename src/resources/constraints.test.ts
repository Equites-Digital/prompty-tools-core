import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { constraintsResource } from "./constraints.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: constraintsResource(http), fetchImpl };
}

describe("constraintsResource", () => {
  it("list() paginates /constraints", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ constraints: [{ id: "c1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toContain("/constraints");
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ constraints: [{ id: "a" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const c of resource.listAll()) ids.push(c.id);
    expect(ids).toEqual(["a"]);
  });

  it("get() fetches a single constraint", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "c1" }));
    await resource.get("c1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/c1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("c1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs with text", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "c1", text: "Be concise", isPublic: true, tags: [] }, 201),
    );
    await resource.create({ text: "Be concise" });
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ text: "Be concise" });
  });

  it("update() PATCHes", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("c1", { text: "new" });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
  });

  it("delete() DELETEs", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("c1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
  });

  it("vote() sends PUT /vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("c1", 1);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: 1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("c1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the flag", async () => {
    const { resource } = buildResource(makeJsonResponse({ favorited: false }));
    const result = await resource.toggleFavorite("c1");
    expect(result).toEqual({ favorited: false });
  });
});
