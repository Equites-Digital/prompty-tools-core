import { describe, expect, it } from "vitest";

import { PromptyError } from "../errors.js";
import { extractList } from "./envelope.js";

describe("extractList", () => {
  it("extracts items and total from an entity-keyed envelope", () => {
    const body = { prompts: [{ id: "1" }, { id: "2" }], total: 42 };
    const { items, total } = extractList<{ id: string }>(body, "prompts");
    expect(items).toEqual([{ id: "1" }, { id: "2" }]);
    expect(total).toBe(42);
  });

  it("works with different entity keys", () => {
    const body = { tones: [{ id: "t1" }], total: 1 };
    const { items, total } = extractList<{ id: string }>(body, "tones");
    expect(items).toHaveLength(1);
    expect(total).toBe(1);
  });

  it("falls back to items.length when total is missing", () => {
    const body = { tones: [{ id: "a" }, { id: "b" }] };
    const { total } = extractList(body, "tones");
    expect(total).toBe(2);
  });

  it("falls back to items.length when total is not a number", () => {
    const body = { tones: [{ id: "a" }], total: "oops" };
    const { total } = extractList(body, "tones");
    expect(total).toBe(1);
  });

  it("throws when the body is null", () => {
    expect(() => extractList(null, "prompts")).toThrow(PromptyError);
    expect(() => extractList(null, "prompts")).toThrow(/object/);
  });

  it("throws when the body is a primitive", () => {
    expect(() => extractList(42, "prompts")).toThrow(PromptyError);
    expect(() => extractList("x", "prompts")).toThrow(PromptyError);
  });

  it("throws when the entity key is missing", () => {
    expect(() => extractList({ foo: [] }, "prompts")).toThrow(
      /contain "prompts" array/,
    );
  });

  it("throws when the entity value is not an array", () => {
    expect(() => extractList({ prompts: "nope" }, "prompts")).toThrow(
      /contain "prompts" array/,
    );
  });
});
