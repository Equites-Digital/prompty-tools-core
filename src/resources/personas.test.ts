import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { personasResource } from "./personas.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: personasResource(http), fetchImpl };
}

describe("personasResource", () => {
  it("list() paginates /personas", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ personas: [{ id: "x" }], total: 1 }),
    );
    const page = await resource.list({ scope: "mine" });
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toContain("/personas?");
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ personas: [{ id: "a" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const item of resource.listAll()) ids.push(item.id);
    expect(ids).toEqual(["a"]);
  });

  it("get() fetches a single persona", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "p1" }));
    await resource.get("p1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/personas\/p1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("p1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs and returns narrow create response", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "p1", versionId: "v1", title: "t", description: "d", isPublic: false, tags: [] },
        201,
      ),
    );
    const result = await resource.create({ title: "t", description: "d" });
    expect(result.versionId).toBe("v1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ title: "t", description: "d" });
  });

  it("update() PATCHes", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("p1", { title: "new" });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
  });

  it("delete() DELETEs", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("p1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
  });

  it("setVisibility() PATCHes /visibility", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setVisibility("p1", true);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/personas\/p1\/visibility$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ isPublic: true });
  });

  it("vote() sends PUT /vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("p1", -1);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: -1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("p1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns { favorited }", async () => {
    const { resource } = buildResource(makeJsonResponse({ favorited: false }));
    const result = await resource.toggleFavorite("p1");
    expect(result).toEqual({ favorited: false });
  });

  it("listVersions() paginates /personas/:id/versions", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ versions: [{ id: "v1" }], total: 1 }),
    );
    const page = await resource.listVersions("p1");
    expect(page.items).toEqual([{ id: "v1" }]);
    expect(fetchImpl.calls[0]!.url).toContain("/personas/p1/versions");
  });

  it("getVersion() fetches a specific version", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "v1" }));
    await resource.getVersion("p1", "v1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/personas\/p1\/versions\/v1$/);
  });
});
