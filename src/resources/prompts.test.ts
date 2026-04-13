import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { promptsResource } from "./prompts.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: promptsResource(http), fetchImpl };
}

describe("promptsResource", () => {
  it("list() paginates via GET /prompts", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ prompts: [{ id: "p1" }, { id: "p2" }], total: 20 }),
    );
    const page = await resource.list({ pageSize: 12, sort: "most-upvoted" });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(20);
    expect(fetchImpl.calls[0]!.url).toContain("/prompts?");
    expect(fetchImpl.calls[0]!.url).toContain("pageSize=12");
    expect(fetchImpl.calls[0]!.url).toContain("sort=most-upvoted");
  });

  it("listAll() yields items across pages", async () => {
    const { resource } = buildResource([
      makeJsonResponse({ prompts: [{ id: "a" }], total: 12 }),
      makeJsonResponse({ prompts: [{ id: "b" }], total: 12 }),
    ]);
    const ids: string[] = [];
    for await (const p of resource.listAll({ pageSize: 6 })) {
      ids.push(p.id);
    }
    expect(ids).toEqual(["a", "b"]);
  });

  it("get() fetches a single prompt", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "p1", title: "hi" }),
    );
    const prompt = await resource.get("p1");
    expect(prompt).toMatchObject({ id: "p1", title: "hi" });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/prompts\/p1$/);
    expect(fetchImpl.calls[0]!.method).toBe("GET");
  });

  it("get() URL-encodes the id", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ id: "x/y" }));
    await resource.get("x/y");
    expect(fetchImpl.calls[0]!.url).toContain("/prompts/x%2Fy");
  });

  it("get() throws PromptyNotFoundError on 404", async () => {
    const { resource } = buildResource(makeErrorResponse("missing", 404));
    await expect(resource.get("missing")).rejects.toBeInstanceOf(PromptyNotFoundError);
  });

  it("create() POSTs the input and returns the create response", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse(
        { id: "p1", userId: "u1", isPublic: true, username: null, createdAt: "", updatedAt: "" },
        201,
      ),
    );
    const result = await resource.create({
      title: "hello",
      task: "do thing",
      compiledPrompt: "...",
    });
    expect(result.id).toBe("p1");
    expect(fetchImpl.calls[0]!.method).toBe("POST");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
      title: "hello",
      task: "do thing",
      compiledPrompt: "...",
    });
  });

  it("update() PATCHes and returns void", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    const result = await resource.update("p1", {
      title: "new",
      task: "new task",
      compiledPrompt: "...",
      changelog: "fix",
    });
    expect(result).toBeUndefined();
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
  });

  it("delete() DELETEs and returns void", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    const result = await resource.delete("p1");
    expect(result).toBeUndefined();
    expect(fetchImpl.calls[0]!.method).toBe("DELETE");
  });

  it("setVisibility() sends PATCH /visibility", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.setVisibility("p1", false);
    expect(fetchImpl.calls[0]!.method).toBe("PATCH");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/prompts\/p1\/visibility$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ isPublic: false });
  });

  it("vote() sends PUT /vote with the numeric value", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.vote("p1", 1);
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/prompts\/p1\/vote$/);
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: 1 });
  });

  it("unvote() sends PUT /vote with null", async () => {
    const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
    await resource.unvote("p1");
    expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ value: null });
  });

  it("toggleFavorite() returns the favorited flag", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ favorited: true }),
    );
    const result = await resource.toggleFavorite("p1");
    expect(result).toEqual({ favorited: true });
    expect(fetchImpl.calls[0]!.method).toBe("PUT");
    expect(fetchImpl.calls[0]!.url).toMatch(/\/prompts\/p1\/favorite$/);
  });

  it("listVersions() paginates /prompts/:id/versions", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ versions: [{ id: "v1" }], total: 1 }),
    );
    const page = await resource.listVersions("p1", { pageSize: 10 });
    expect(page.items).toEqual([{ id: "v1" }]);
    expect(fetchImpl.calls[0]!.url).toContain("/prompts/p1/versions?");
  });

  it("getVersion() fetches a specific version", async () => {
    const { resource, fetchImpl } = buildResource(
      makeJsonResponse({ id: "v1", version: 1 }),
    );
    const version = await resource.getVersion("p1", "v1");
    expect(version).toMatchObject({ id: "v1", version: 1 });
    expect(fetchImpl.calls[0]!.url).toMatch(/\/prompts\/p1\/versions\/v1$/);
  });
});
