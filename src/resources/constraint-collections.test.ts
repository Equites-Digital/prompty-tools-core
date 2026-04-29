import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { constraintCollectionsResource } from "./constraint-collections.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: constraintCollectionsResource(http), fetchImpl };
}

describe("constraintCollectionsResource", () => {
  it("list() paginates /constraints/collections", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ collections: [{ id: "cc1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections(\?|$)/);
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ collections: [{ id: "cc1" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const c of resource.listAll()) ids.push(c.id);
    expect(ids).toEqual(["cc1"]);
  });

  it("get() fetches a single constraint collection with items", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "cc1", name: "favs", items: [] }),
    );
    await resource.get("cc1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("cc1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs to /constraints/collections with itemIds", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "cc1", name: "favs", description: "", isPublic: true, tags: [] },
        201,
      ),
    );
    await resource.create({ name: "favs", itemIds: ["c1", "c2"] });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections$/);
    expect(fetchImpl.calls[0]!.method).toBe("POST");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      name: "favs",
      itemIds: ["c1", "c2"],
    });
  });

  it("update() PATCHes /constraints/collections/{id}", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("cc1", { name: "new" });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1$/);
  });

  it("delete() DELETEs /constraints/collections/{id}", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("cc1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1$/);
  });

  it("vote() sends PUT /constraints/collections/{id}/vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("cc1", -1);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: -1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("cc1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the flag", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ favorited: false }));
    const result = await resource.toggleFavorite("cc1");
    expect(result).toEqual({ favorited: false });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1\/favorite$/);
  });

  it("listItems() unwraps the items array from /items", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({
        items: [{ id: "j1", constraintId: "c1", text: "be concise" }],
      }),
    );
    const items = await resource.listItems("cc1");
    expect(items).toEqual([{ id: "j1", constraintId: "c1", text: "be concise" }]);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1\/items$/);
  });

  it("setItems() PUTs the itemIds array", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setItems("cc1", ["c1", "c2"]);
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/constraints\/collections\/cc1\/items$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      itemIds: ["c1", "c2"],
    });
  });
});
