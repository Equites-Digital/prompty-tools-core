import { describe, expect, it } from "vitest";

import { buildSearchParams, buildUrl } from "./url.js";

describe("buildUrl", () => {
  it("joins base and path with no query", () => {
    expect(buildUrl("https://api.example.com/v1", "/prompts")).toBe(
      "https://api.example.com/v1/prompts",
    );
  });

  it("appends query params", () => {
    expect(
      buildUrl("https://api.example.com/v1", "/prompts", {
        page: 2,
        sort: "newest",
      }),
    ).toBe("https://api.example.com/v1/prompts?page=2&sort=newest");
  });

  it("skips undefined values in query", () => {
    expect(
      buildUrl("https://api.example.com/v1", "/prompts", {
        page: 1,
        search: undefined,
      }),
    ).toBe("https://api.example.com/v1/prompts?page=1");
  });

  it("omits query string entirely when all values are undefined", () => {
    expect(
      buildUrl("https://api.example.com/v1", "/prompts", {
        page: undefined,
      }),
    ).toBe("https://api.example.com/v1/prompts");
  });

  it("handles no-query call signature", () => {
    expect(buildUrl("https://api.example.com/v1", "/prompts")).toBe(
      "https://api.example.com/v1/prompts",
    );
  });
});

describe("buildSearchParams", () => {
  it("returns an empty URLSearchParams for undefined input", () => {
    const params = buildSearchParams(undefined);
    expect(params.toString()).toBe("");
  });

  it("returns an empty URLSearchParams for empty object", () => {
    const params = buildSearchParams({});
    expect(params.toString()).toBe("");
  });

  it("coerces numbers to strings", () => {
    const params = buildSearchParams({ page: 3 });
    expect(params.get("page")).toBe("3");
  });

  it("coerces booleans to strings", () => {
    const params = buildSearchParams({ isPublic: true });
    expect(params.get("isPublic")).toBe("true");
  });

  it("skips undefined values", () => {
    const params = buildSearchParams({ a: "x", b: undefined });
    expect(params.has("b")).toBe(false);
    expect(params.get("a")).toBe("x");
  });

  it("skips empty strings", () => {
    const params = buildSearchParams({ search: "", sort: "newest" });
    expect(params.has("search")).toBe(false);
    expect(params.get("sort")).toBe("newest");
  });

  it("URL-encodes special characters", () => {
    const params = buildSearchParams({ search: "hello world &=" });
    expect(params.toString()).toBe("search=hello+world+%26%3D");
  });
});
