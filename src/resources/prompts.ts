import type { Http } from "../internal/http.js";
import { iteratePages, listPaged, listPagedVersions } from "../internal/pagination.js";
import type {
  ListParams,
  VersionListParams,
  VoteValue,
} from "../types/common.js";
import type { Page } from "../types/page.js";
import type {
  Prompt,
  PromptCreateInput,
  PromptCreateResponse,
  PromptSummary,
  PromptUpdateInput,
  PromptVersion,
  PromptVersionSummary,
} from "../types/prompt.js";

export interface PromptsResource {
  list(params?: ListParams): Promise<Page<PromptSummary>>;
  listAll(params?: ListParams): AsyncIterable<PromptSummary>;
  get(id: string): Promise<Prompt>;
  create(input: PromptCreateInput): Promise<PromptCreateResponse>;
  update(id: string, input: PromptUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  setVisibility(id: string, isPublic: boolean): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  listVersions(id: string, params?: VersionListParams): Promise<Page<PromptVersionSummary>>;
  getVersion(id: string, versionId: string): Promise<PromptVersion>;
}

export function promptsResource(http: Http): PromptsResource {
  return {
    list: (params) => listPaged<PromptSummary>(http, "prompts", "/prompts", params),
    listAll: (params) => iteratePages<PromptSummary>(http, "prompts", "/prompts", params),
    get: (id) => http.request<Prompt>("GET", `/prompts/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<PromptCreateResponse>("POST", "/prompts", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/prompts/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/prompts/${encodeURIComponent(id)}`,
      );
    },
    setVisibility: async (id, isPublic) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/prompts/${encodeURIComponent(id)}/visibility`,
        { body: { isPublic } },
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/prompts/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/prompts/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/prompts/${encodeURIComponent(id)}/favorite`,
      ),
    listVersions: (id, params) =>
      listPagedVersions<PromptVersionSummary>(
        http,
        "versions",
        `/prompts/${encodeURIComponent(id)}/versions`,
        params,
      ),
    getVersion: (id, versionId) =>
      http.request<PromptVersion>(
        "GET",
        `/prompts/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
      ),
  };
}
