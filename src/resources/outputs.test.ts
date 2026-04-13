import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { outputsResource } from "./outputs.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: outputsResource(http), fetchImpl };
}

describe("outputsResource", () => {
  it("list() paginates /outputs", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ outputs: [{ id: "o1" }], total: 1 }),
    );
    const page = await resource.list();
    expect(page.items).toHaveLength(1);
    expect(fetchImpl.calls[0]!.url).toContain("/outputs");
  });

  it("listAll() yields items", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ outputs: [{ id: "a" }], total: 1 }),
    ]);
    const ids: string[] = [];
    for await (const o of resource.listAll()) ids.push(o.id);
    expect(ids).toEqual(["a"]);
  });

  it("get() fetches a single output", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "o1" }));
    await resource.get("o1");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/outputs\/o1$/);
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("o1")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "o1", label: "JSON", isPublic: true, tags: [] }, 201),
    );
    await resource.create({ label: "JSON" });
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ label: "JSON" });
  });

  it("update() PATCHes", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.update("o1", { label: "new" });
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
  });

  it("delete() DELETEs", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.delete("o1");
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
  });

  it("vote() sends PUT /vote", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("o1", -1);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: -1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("o1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the flag", async () => {
    const { resource } = buildResource(makeJsonResponse({ favorited: true }));
    const result = await resource.toggleFavorite("o1");
    expect(result).toEqual({ favorited: true });
  });
});
