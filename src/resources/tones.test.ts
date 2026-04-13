import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { tonesResource } from "./tones.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: tonesResource(http), fetchImpl };
}

describe("tonesResource", () => {
  it("list() paginates /tones", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ tones: [{ id: "t1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toContain("/tones");
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ tones: [{ id: "a" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const t of resource.listAll()) ids.push(t.id);
    expect(ids).toEqual(["a"]);
  });

  it("get() fetches a single tone", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "t1" }));
    await resource.get("t1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/t1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("t1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs and returns narrow response", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "t1", label: "friendly", isPublic: true, tags: [] }, 201),
    );
    const result = await resource.create({ label: "friendly" });
    expect(result.label).toBe("friendly");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ label: "friendly" });
  });

  it("update() PATCHes with isPublic in body", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("t1", { label: "new", isPublic: false });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ label: "new", isPublic: false });
  });

  it("delete() DELETEs", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("t1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
  });

  it("vote() sends PUT /vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("t1", 1);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/t1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: 1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("t1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns { favorited }", async () => {
    const { resource } = buildResource(makeJsonResponse({ favorited: true }));
    const result = await resource.toggleFavorite("t1");
    expect(result).toEqual({ favorited: true });
  });
});
