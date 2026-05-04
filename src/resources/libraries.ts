import type { Http } from "../internal/http.js";
import { iteratePages, listPaged } from "../internal/pagination.js";
import type { ListParams, VoteValue } from "../types/common.js";
import type {
  Library,
  LibraryCreateInput,
  LibraryCreateResponse,
  LibraryMemberPrompt,
  LibrarySummary,
  LibraryUpdateInput,
} from "../types/library.js";
import type { Page } from "../types/page.js";

export interface LibrariesResource {
  list(params?: ListParams): Promise<Page<LibrarySummary>>;
  listAll(params?: ListParams): AsyncIterable<LibrarySummary>;
  get(id: string): Promise<Library>;
  create(input: LibraryCreateInput): Promise<LibraryCreateResponse>;
  update(id: string, input: LibraryUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  listPrompts(id: string, params?: ListParams): Promise<Page<LibraryMemberPrompt>>;
  listAllPrompts(id: string, params?: ListParams): AsyncIterable<LibraryMemberPrompt>;
  addPrompt(id: string, promptId: string): Promise<void>;
  removePrompt(id: string, promptId: string): Promise<void>;
}

export function librariesResource(http: Http): LibrariesResource {
  const resourcePath = (id: string) => `/libraries/${encodeURIComponent(id)}`;
  const promptsPath = (id: string) => `${resourcePath(id)}/prompts`;

  return {
    list: (params) =>
      listPaged<LibrarySummary>(http, "libraries", "/libraries", params),
    listAll: (params) =>
      iteratePages<LibrarySummary>(http, "libraries", "/libraries", params),
    get: (id) => http.request<Library>("GET", resourcePath(id)),
    create: (input) =>
      http.request<LibraryCreateResponse>("POST", "/libraries", { body: input }),
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
    listPrompts: (id, params) =>
      listPaged<LibraryMemberPrompt>(http, "prompts", promptsPath(id), params),
    listAllPrompts: (id, params) =>
      iteratePages<LibraryMemberPrompt>(http, "prompts", promptsPath(id), params),
    addPrompt: async (id, promptId) => {
      await http.request<{ success: true }>("POST", promptsPath(id), {
        body: { promptId },
      });
    },
    removePrompt: async (id, promptId) => {
      await http.request<{ success: true }>("DELETE", promptsPath(id), {
        query: { promptId },
      });
    },
  };
}
