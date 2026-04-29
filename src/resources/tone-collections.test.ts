import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { toneCollectionsResource } from "./tone-collections.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: toneCollectionsResource(http), fetchImpl };
}

describe("toneCollectionsResource", () => {
  it("list() paginates /tones/collections", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ collections: [{ id: "tc1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections(\?|$)/);
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ collections: [{ id: "tc1" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const c of resource.listAll()) ids.push(c.id);
    expect(ids).toEqual(["tc1"]);
  });

  it("get() fetches a single tone collection with items", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "tc1", name: "favs", items: [] }),
    );
    await resource.get("tc1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("tc1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs to /tones/collections with itemIds", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "tc1", name: "favs", description: "", isPublic: true, tags: [] },
        201,
      ),
    );
    await resource.create({ name: "favs", itemIds: ["t1", "t2"] });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections$/);
    expect(fetchImpl.calls[0]!.method).toBe("POST");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      name: "favs",
      itemIds: ["t1", "t2"],
    });
  });

  it("update() PATCHes /tones/collections/{id}", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("tc1", { name: "new" });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1$/);
  });

  it("delete() DELETEs /tones/collections/{id}", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("tc1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1$/);
  });

  it("vote() sends PUT /tones/collections/{id}/vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("tc1", 1);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: 1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("tc1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the flag", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ favorited: true }));
    const result = await resource.toggleFavorite("tc1");
    expect(result).toEqual({ favorited: true });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1\/favorite$/);
  });

  it("listItems() unwraps the items array from /items", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({
        items: [{ id: "j1", toneId: "t1", label: "friendly" }],
      }),
    );
    const items = await resource.listItems("tc1");
    expect(items).toEqual([{ id: "j1", toneId: "t1", label: "friendly" }]);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1\/items$/);
  });

  it("setItems() PUTs the itemIds array", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setItems("tc1", ["t1", "t2"]);
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/tones\/collections\/tc1\/items$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      itemIds: ["t1", "t2"],
    });
  });
});
