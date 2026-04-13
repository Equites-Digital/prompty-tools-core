import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type { Output, OutputCreateInput, OutputCreateResponse, OutputSummary, OutputUpdateInput } from "../types/output.js";
import type { Page } from "../types/page.js";

export interface OutputsResource {
  list(params?: ListParams): Promise<Page<OutputSummary>>;
  listAll(params?: ListParams): AsyncIterable<OutputSummary>;
  get(id: string): Promise<Output>;
  create(input: OutputCreateInput): Promise<OutputCreateResponse>;
  update(id: string, input: OutputUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
}

export function outputsResource(http: Http): OutputsResource {
  return {
    list: (params) => listPaged<OutputSummary>(http, "outputs", "/outputs", params),
    listAll: (params) => iteratePages<OutputSummary>(http, "outputs", "/outputs", params),
    get: (id) => http.request<Output>("GET", `/outputs/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<OutputCreateResponse>("POST", "/outputs", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/outputs/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/outputs/${encodeURIComponent(id)}`,
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/outputs/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/outputs/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/outputs/${encodeURIComponent(id)}/favorite`,
      ),
  };
}
