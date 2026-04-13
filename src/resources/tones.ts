import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type { Page } from "../types/page.js";
import type {
  Tone,
  ToneCreateInput,
  ToneCreateResponse,
  ToneSummary,
  ToneUpdateInput,
} from "../types/tone.js";

export interface TonesResource {
  list(params?: ListParams): Promise<Page<ToneSummary>>;
  listAll(params?: ListParams): AsyncIterable<ToneSummary>;
  get(id: string): Promise<Tone>;
  create(input: ToneCreateInput): Promise<ToneCreateResponse>;
  update(id: string, input: ToneUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
}

export function tonesResource(http: Http): TonesResource {
  return {
    list: (params) => listPaged<ToneSummary>(http, "tones", "/tones", params),
    listAll: (params) => iteratePages<ToneSummary>(http, "tones", "/tones", params),
    get: (id) => http.request<Tone>("GET", `/tones/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<ToneCreateResponse>("POST", "/tones", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/tones/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/tones/${encodeURIComponent(id)}`,
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/tones/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/tones/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/tones/${encodeURIComponent(id)}/favorite`,
      ),
  };
}
