import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type {
  Collection,
  CollectionConstraintRef,
  CollectionCreateInput,
  CollectionCreateResponse,
  CollectionSummary,
  CollectionToneRef,
  CollectionUpdateInput,
} from "../types/collection.js";
import type { Page } from "../types/page.js";

export interface CollectionsResource {
  list(params?: ListParams): Promise<Page<CollectionSummary>>;
  listAll(params?: ListParams): AsyncIterable<CollectionSummary>;
  get(id: string): Promise<Collection>;
  create(input: CollectionCreateInput): Promise<CollectionCreateResponse>;
  update(id: string, input: CollectionUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  listConstraints(id: string): Promise<readonly CollectionConstraintRef[]>;
  setConstraints(id: string, constraintIds: readonly string[]): Promise<void>;
  listTones(id: string): Promise<readonly CollectionToneRef[]>;
  setTones(id: string, toneIds: readonly string[]): Promise<void>;
}

export function collectionsResource(http: Http): CollectionsResource {
  return {
    list: (params) =>
      listPaged<CollectionSummary>(http, "collections", "/collections", params),
    listAll: (params) =>
      iteratePages<CollectionSummary>(http, "collections", "/collections", params),
    get: (id) =>
      http.request<Collection>("GET", `/collections/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<CollectionCreateResponse>("POST", "/collections", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/collections/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/collections/${encodeURIComponent(id)}`,
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/collections/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/collections/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/collections/${encodeURIComponent(id)}/favorite`,
      ),
    listConstraints: async (id) => {
      const body = await http.request<{ constraints: readonly CollectionConstraintRef[] }>(
        "GET",
        `/collections/${encodeURIComponent(id)}/constraints`,
      );
      return body.constraints;
    },
    setConstraints: async (id, constraintIds) => {
      await http.request<{ success: true }>(
        "PUT",
        `/collections/${encodeURIComponent(id)}/constraints`,
        { body: { constraintIds: [...constraintIds] } },
      );
    },
    listTones: async (id) => {
      const body = await http.request<{ tones: readonly CollectionToneRef[] }>(
        "GET",
        `/collections/${encodeURIComponent(id)}/tones`,
      );
      return body.tones;
    },
    setTones: async (id, toneIds) => {
      await http.request<{ success: true }>(
        "PUT",
        `/collections/${encodeURIComponent(id)}/tones`,
        { body: { toneIds: [...toneIds] } },
      );
    },
  };
}
