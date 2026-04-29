import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type {
  Constraint,
  ConstraintCreateInput,
  ConstraintCreateResponse,
  ConstraintSummary,
  ConstraintUpdateInput,
} from "../types/constraint.js";
import type { Page } from "../types/page.js";
import {
  constraintCollectionsResource,
  type ConstraintCollectionsResource,
} from "./constraint-collections.js";

export interface ConstraintsResource {
  list(params?: ListParams): Promise<Page<ConstraintSummary>>;
  listAll(params?: ListParams): AsyncIterable<ConstraintSummary>;
  get(id: string): Promise<Constraint>;
  create(input: ConstraintCreateInput): Promise<ConstraintCreateResponse>;
  update(id: string, input: ConstraintUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  readonly collections: ConstraintCollectionsResource;
}

export function constraintsResource(http: Http): ConstraintsResource {
  return {
    list: (params) =>
      listPaged<ConstraintSummary>(http, "constraints", "/constraints", params),
    listAll: (params) =>
      iteratePages<ConstraintSummary>(http, "constraints", "/constraints", params),
    get: (id) =>
      http.request<Constraint>("GET", `/constraints/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<ConstraintCreateResponse>("POST", "/constraints", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/constraints/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/constraints/${encodeURIComponent(id)}`,
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/constraints/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/constraints/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/constraints/${encodeURIComponent(id)}/favorite`,
      ),
    collections: constraintCollectionsResource(http),
  };
}
