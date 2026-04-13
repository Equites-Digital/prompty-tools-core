import type { Http } from "../internal/http.js";
import { iteratePages, listPaged, listPagedVersions } from "../internal/pagination.js";
import type {
  ListParams,
  VersionListParams,
  VoteValue,
} from "../types/common.js";
import type { Page } from "../types/page.js";
import type {
  Persona,
  PersonaCreateInput,
  PersonaCreateResponse,
  PersonaSummary,
  PersonaUpdateInput,
  PersonaVersion,
  PersonaVersionSummary,
} from "../types/persona.js";

export interface PersonasResource {
  list(params?: ListParams): Promise<Page<PersonaSummary>>;
  listAll(params?: ListParams): AsyncIterable<PersonaSummary>;
  get(id: string): Promise<Persona>;
  create(input: PersonaCreateInput): Promise<PersonaCreateResponse>;
  update(id: string, input: PersonaUpdateInput): Promise<void>;
  delete(id: string): Promise<void>;
  setVisibility(id: string, isPublic: boolean): Promise<void>;
  vote(id: string, value: VoteValue): Promise<void>;
  unvote(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<{ favorited: boolean }>;
  listVersions(id: string, params?: VersionListParams): Promise<Page<PersonaVersionSummary>>;
  getVersion(id: string, versionId: string): Promise<PersonaVersion>;
}

export function personasResource(http: Http): PersonasResource {
  return {
    list: (params) => listPaged<PersonaSummary>(http, "personas", "/personas", params),
    listAll: (params) => iteratePages<PersonaSummary>(http, "personas", "/personas", params),
    get: (id) => http.request<Persona>("GET", `/personas/${encodeURIComponent(id)}`),
    create: (input) =>
      http.request<PersonaCreateResponse>("POST", "/personas", { body: input }),
    update: async (id, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/personas/${encodeURIComponent(id)}`,
        { body: input },
      );
    },
    delete: async (id) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/personas/${encodeURIComponent(id)}`,
      );
    },
    setVisibility: async (id, isPublic) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/personas/${encodeURIComponent(id)}/visibility`,
        { body: { isPublic } },
      );
    },
    vote: async (id, value) => {
      await http.request<{ success: true }>(
        "PUT",
        `/personas/${encodeURIComponent(id)}/vote`,
        { body: { value } },
      );
    },
    unvote: async (id) => {
      await http.request<{ success: true }>(
        "PUT",
        `/personas/${encodeURIComponent(id)}/vote`,
        { body: { value: null } },
      );
    },
    toggleFavorite: (id) =>
      http.request<{ favorited: boolean }>(
        "PUT",
        `/personas/${encodeURIComponent(id)}/favorite`,
      ),
    listVersions: (id, params) =>
      listPagedVersions<PersonaVersionSummary>(
        http,
        "versions",
        `/personas/${encodeURIComponent(id)}/versions`,
        params,
      ),
    getVersion: (id, versionId) =>
      http.request<PersonaVersion>(
        "GET",
        `/personas/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
      ),
  };
}
