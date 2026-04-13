import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { collectionsResource } from "./collections.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: collectionsResource(http), fetchImpl };
}

describe("collectionsResource", () => {
  it("list() paginates /collections", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ collections: [{ id: "c1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toContain("/collections");
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ collections: [{ id: "a" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const c of resource.listAll()) ids.push(c.id);
    expect(ids).toEqual(["a"]);
  });

  it("get() fetches a single collection", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "c1", name: "favs", items: [], toneItems: [] }),
    );
    await resource.get("c1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/collections\/c1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("c1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "c1", name: "favs", description: "", isPublic: true, tags: [] },
        201,
      ),
    );
    await resource.create({ name: "favs" });
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ name: "favs" });
  });

  it("update() PATCHes", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("c1", { name: "new" });
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
    const { resource } = buildResource(makeJsonResponse({ favorited: true }));
    const result = await resource.toggleFavorite("c1");
    expect(result).toEqual({ favorited: true });
  });

  it("listConstraints() unwraps the constraints array", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({
        constraints: [{ id: "j1", constraintId: "con1", text: "short" }],
      }),
    );
    const items = await resource.listConstraints("c1");
    expect(items).toEqual([{ id: "j1", constraintId: "con1", text: "short" }]);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/collections\/c1\/constraints$/);
  });

  it("setConstraints() PUTs the constraint ids array", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setConstraints("c1", ["con1", "con2"]);
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      constraintIds: ["con1", "con2"],
    });
  });

  it("listTones() unwraps the tones array", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({
        tones: [{ id: "j1", toneId: "ton1", label: "friendly" }],
      }),
    );
    const items = await resource.listTones("c1");
    expect(items).toEqual([{ id: "j1", toneId: "ton1", label: "friendly" }]);
    expect(fetchImpl.calls[0]!.url).toMatch(/\/collections\/c1\/tones$/);
  });

  it("setTones() PUTs the tone ids array", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setTones("c1", ["ton1"]);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ toneIds: ["ton1"] });
  });
});
