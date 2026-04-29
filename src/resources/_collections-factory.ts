import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type {
  CollectionCreateInput,
  CollectionCreateResponse,
  CollectionSummary,
  CollectionUpdateInput,
} from "../types/collection.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type { Page } from "../types/page.js";

export interface CollectionsResource<TDetail, TItem> {
  list(params?: ListParams): Promise<Page<CollectionSummary>>;
  listAll(params?: ListParams): AsyncIterable<CollectionSummary>;
  get(id: string): Promise<TDetail>;
  create(input: CollectionCreateInput): Promise<CollectionCreateResponse>;
  update(id: string, input: CollectionUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  listItems(id: string): Promise<readonly TItem[]>;
  setItems(id: string, itemIds: readonly string[]): Promise<void>;
}

export function createCollectionsResource<TDetail, TItem>(
  http: Http,
  prefix: string,
): CollectionsResource<TDetail, TItem> {
  const resourcePath = (id: string) => `${prefix}/${encodeURIComponent(id)}`;

  return {
    list: (params) =>
      listPaged<CollectionSummary>(http, "collections", prefix, params),
    listAll: (params) =>
      iteratePages<CollectionSummary>(http, "collections", prefix, params),
    get: (id) => http.request<TDetail>("GET", resourcePath(id)),
    create: (input) =>
      http.request<CollectionCreateResponse>("POST", prefix, { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>("PATCH", resourcePath(id), {
        body: input,
      });
    },
    delete: async (id) => {
      await http.request<{ success: true }>("DELETE", resourcePath(id));
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `${resourcePath(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `${resourcePath(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `${resourcePath(id)}/favorite`,
      ),
    listItems: async (id) => {
      const body = await http.request<{ items: readonly TItem[] }>(
        "GET",
        `${resourcePath(id)}/items`,
      );
      return body.items;
    },
    setItems: async (id, itemIds) => {
      await http.request<{ success: true }>(
        "PUT",
        `${resourcePath(id)}/items`,
        { body: { itemIds: [...itemIds] } },
      );
    },
  };
}
