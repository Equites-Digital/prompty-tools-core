import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../config.js";
import { PromptyNotFoundError } from "../errors.js";
import { createHttp } from "../internal/http.js";
import { createMockFetch, type FakeFetchHandler } from "../test-utils/fake-fetch.js";
import { makeErrorResponse, makeJsonResponse } from "../test-utils/responses.js";
import { queuesResource } from "./queues.js";

function buildResource(handlers: FakeFetchHandler | FakeFetchHandler[]) {
  const fetchImpl = createMockFetch(handlers);
  const http = createHttp(
    normalizeConfig({ apiKey: "pk_test", fetch: fetchImpl as unknown as typeof fetch }),
  );
  return { resource: queuesResource(http), fetchImpl };
}

const sampleQueue = {
  id: "q1",
  name: "My Queue",
  description: "",
  pendingCount: 0,
  inProgressCount: 0,
  succeededCount: 0,
  failedCount: 0,
  totalCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleItem = {
  id: "i1",
  queueId: "q1",
  promptId: "p1",
  status: "pending",
  notes: "",
  promptTitle: "My Prompt",
  currentVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("queuesResource", () => {
  describe("list()", () => {
    it("paginates via GET /queues", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ queues: [sampleQueue], total: 1 }),
      );
      const page = await resource.list();
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(1);
      expect(fetchImpl.calls[0]!.url).toContain("/queues");
      expect(fetchImpl.calls[0]!.method).toBe("GET");
    });

    it("forwards page, pageSize, and search params", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ queues: [], total: 0 }),
      );
      await resource.list({ page: 2, pageSize: 5, search: "foo" });
      const url = fetchImpl.calls[0]!.url;
      expect(url).toContain("page=2");
      expect(url).toContain("pageSize=5");
      expect(url).toContain("search=foo");
    });

    it("does not send sort or scope params", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ queues: [], total: 0 }),
      );
      await resource.list();
      const url = fetchImpl.calls[0]!.url;
      expect(url).not.toContain("sort=");
      expect(url).not.toContain("scope=");
    });

    it("handles an empty page", async () => {
      const { resource } = buildResource(makeJsonResponse({ queues: [], total: 0 }));
      const page = await resource.list();
      expect(page.items).toEqual([]);
      expect(page.total).toBe(0);
      expect(page.hasNext).toBe(false);
    });

    it("throws PromptyNotFoundError on 404", async () => {
      const { resource } = buildResource(makeErrorResponse("not found", 404));
      await expect(resource.list()).rejects.toBeInstanceOf(PromptyNotFoundError);
    });
  });

  describe("listAll()", () => {
    it("yields items across pages", async () => {
      const { resource } = buildResource([
        makeJsonResponse({ queues: [{ ...sampleQueue, id: "q1" }], total: 24 }),
        makeJsonResponse({ queues: [{ ...sampleQueue, id: "q2" }], total: 24 }),
      ]);
      const ids: string[] = [];
      for await (const q of resource.listAll({ pageSize: 12 })) {
        ids.push(q.id);
      }
      expect(ids).toEqual(["q1", "q2"]);
    });
  });

  describe("create()", () => {
    it("POSTs and returns the created queue", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ id: "q1", name: "My Queue", description: "" }, 201),
      );
      const result = await resource.create({ name: "My Queue" });
      expect(result.id).toBe("q1");
      expect(fetchImpl.calls[0]!.method).toBe("POST");
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues$/);
      expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ name: "My Queue" });
    });

    it("forwards description in the body", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ id: "q1", name: "Q", description: "desc" }, 201),
      );
      await resource.create({ name: "Q", description: "desc" });
      expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ name: "Q", description: "desc" });
    });
  });

  describe("listItems()", () => {
    it("paginates via GET /queues/:id/items", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ items: [sampleItem], total: 1 }),
      );
      const page = await resource.listItems("q1");
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(1);
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues\/q1\/items/);
      expect(fetchImpl.calls[0]!.method).toBe("GET");
    });

    it("URL-encodes the queue id", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ items: [], total: 0 }),
      );
      await resource.listItems("q/1");
      expect(fetchImpl.calls[0]!.url).toContain("/queues/q%2F1/items");
    });

    it("forwards page, pageSize, and status params", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ items: [], total: 0 }),
      );
      await resource.listItems("q1", { page: 2, pageSize: 10, status: "pending" });
      const url = fetchImpl.calls[0]!.url;
      expect(url).toContain("page=2");
      expect(url).toContain("pageSize=10");
      expect(url).toContain("status=pending");
    });

    it("omits status when not provided", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ items: [], total: 0 }),
      );
      await resource.listItems("q1");
      expect(fetchImpl.calls[0]!.url).not.toContain("status=");
    });
  });

  describe("listAllItems()", () => {
    it("yields items across pages", async () => {
      const { resource } = buildResource([
        makeJsonResponse({ items: [{ ...sampleItem, id: "i1" }], total: 40 }),
        makeJsonResponse({ items: [{ ...sampleItem, id: "i2" }], total: 40 }),
      ]);
      const ids: string[] = [];
      for await (const item of resource.listAllItems("q1", { pageSize: 20 })) {
        ids.push(item.id);
      }
      expect(ids).toEqual(["i1", "i2"]);
    });
  });

  describe("addItem()", () => {
    it("POSTs promptId and returns the created item", async () => {
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse(sampleItem, 201),
      );
      const result = await resource.addItem("q1", "p1");
      expect(result.id).toBe("i1");
      expect(fetchImpl.calls[0]!.method).toBe("POST");
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues\/q1\/items$/);
      expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ promptId: "p1" });
    });

    it("URL-encodes the queue id", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse(sampleItem, 201));
      await resource.addItem("q/1", "p1");
      expect(fetchImpl.calls[0]!.url).toContain("/queues/q%2F1/items");
    });
  });

  describe("dequeue()", () => {
    it("POSTs to dequeue and returns the item", async () => {
      const dequeuedItem = { ...sampleItem, compiledPrompt: "You are..." };
      const { resource, fetchImpl } = buildResource(
        makeJsonResponse({ item: dequeuedItem }),
      );
      const result = await resource.dequeue("q1");
      expect(result).toMatchObject({ id: "i1", compiledPrompt: "You are..." });
      expect(fetchImpl.calls[0]!.method).toBe("POST");
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues\/q1\/items\/dequeue$/);
    });

    it("returns null when the queue is empty", async () => {
      const { resource } = buildResource(makeJsonResponse({ item: null }));
      const result = await resource.dequeue("q1");
      expect(result).toBeNull();
    });

    it("URL-encodes the queue id", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ item: null }));
      await resource.dequeue("q/1");
      expect(fetchImpl.calls[0]!.url).toContain("/queues/q%2F1/items/dequeue");
    });
  });

  describe("markItem()", () => {
    it("PATCHes the item status and returns void", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
      const result = await resource.markItem("q1", "i1", { status: "succeeded" });
      expect(result).toBeUndefined();
      expect(fetchImpl.calls[0]!.method).toBe("PATCH");
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues\/q1\/items\/i1$/);
      expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({ status: "succeeded" });
    });

    it("forwards notes in the body", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
      await resource.markItem("q1", "i1", { status: "failed", notes: "timeout" });
      expect(JSON.parse(fetchImpl.calls[0]!.body!)).toEqual({
        status: "failed",
        notes: "timeout",
      });
    });

    it("URL-encodes queue id and item id", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
      await resource.markItem("q/1", "i/1", { status: "succeeded" });
      expect(fetchImpl.calls[0]!.url).toContain("/queues/q%2F1/items/i%2F1");
    });
  });

  describe("removeItem()", () => {
    it("DELETEs the item and returns void", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
      const result = await resource.removeItem("q1", "i1");
      expect(result).toBeUndefined();
      expect(fetchImpl.calls[0]!.method).toBe("DELETE");
      expect(fetchImpl.calls[0]!.url).toMatch(/\/queues\/q1\/items\/i1$/);
    });

    it("URL-encodes queue id and item id", async () => {
      const { resource, fetchImpl } = buildResource(makeJsonResponse({ success: true }));
      await resource.removeItem("q/1", "i/1");
      expect(fetchImpl.calls[0]!.url).toContain("/queues/q%2F1/items/i%2F1");
    });
  });
});
