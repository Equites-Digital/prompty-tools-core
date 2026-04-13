import { DEFAULT_PAGE_SIZE, DEFAULT_VERSION_PAGE_SIZE } from "../constants.js";
import type { ListParams, VersionListParams } from "../types/common.js";
import type { Page } from "../types/page.js";
import { extractList } from "./envelope.js";
import type { Http } from "./http.js";

type PageFetcher<T> = (page: number) => Promise<Page<T>>;

/**
 * Constructs a `Page<T>` from a set of items and the fetcher to get neighbors.
 */
export function createPage<T>(
  items: readonly T[],
  total: number,
  page: number,
  pageSize: number,
  fetchPage: PageFetcher<T>,
): Page<T> {
  const hasNext = page * pageSize < total;
  const hasPrev = page > 1;
  return {
    items,
    total,
    page,
    pageSize,
    hasNext,
    hasPrev,
    next: () => {
      if (!hasNext) {
        return Promise.reject(new RangeError("No next page"));
      }
      return fetchPage(page + 1);
    },
    prev: () => {
      if (!hasPrev) {
        return Promise.reject(new RangeError("No previous page"));
      }
      return fetchPage(page - 1);
    },
  };
}

/**
 * Fetches a single page from a list endpoint.
 */
export async function listPaged<T>(
  http: Http,
  envelopeKey: string,
  path: string,
  params: ListParams | undefined,
): Promise<Page<T>> {
  const body = await http.request<unknown>("GET", path, {
    query: toListQuery(params),
    ...(params?.signal !== undefined ? { signal: params.signal } : {}),
  });
  const { items, total } = extractList<T>(body, envelopeKey);
  const currentPage = params?.page ?? 1;
  const currentPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  return createPage<T>(items, total, currentPage, currentPageSize, (next) =>
    listPaged<T>(http, envelopeKey, path, { ...params, page: next }),
  );
}

/**
 * Fetches a single page from a version list endpoint.
 */
export async function listPagedVersions<T>(
  http: Http,
  envelopeKey: string,
  path: string,
  params: VersionListParams | undefined,
): Promise<Page<T>> {
  const body = await http.request<unknown>("GET", path, {
    query: toVersionQuery(params),
    ...(params?.signal !== undefined ? { signal: params.signal } : {}),
  });
  const { items, total } = extractList<T>(body, envelopeKey);
  const currentPage = params?.page ?? 1;
  const currentPageSize = params?.pageSize ?? DEFAULT_VERSION_PAGE_SIZE;
  return createPage<T>(items, total, currentPage, currentPageSize, (next) =>
    listPagedVersions<T>(http, envelopeKey, path, { ...params, page: next }),
  );
}

/**
 * Async generator that walks every page of a list endpoint and yields items.
 */
export async function* iteratePages<T>(
  http: Http,
  envelopeKey: string,
  path: string,
  params: ListParams | undefined,
): AsyncGenerator<T> {
  let page = await listPaged<T>(http, envelopeKey, path, params);
  while (true) {
    for (const item of page.items) {
      yield item;
    }
    if (!page.hasNext) break;
    page = await page.next();
  }
}

function toListQuery(
  params: ListParams | undefined,
): Record<string, string | number | undefined> {
  if (!params) return {};
  return {
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    scope: params.scope,
    search: params.search,
    tag: params.tag,
  };
}

function toVersionQuery(
  params: VersionListParams | undefined,
): Record<string, string | number | undefined> {
  if (!params) return {};
  return {
    page: params.page,
    pageSize: params.pageSize,
  };
}
