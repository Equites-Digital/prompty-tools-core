import type { EngagementFields } from "./common.js";

/** A single library in a list response. */
export interface LibrarySummary extends EngagementFields {
  id: string;
  userId: string;
  name: string;
  description: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. Use `new Date()` to convert. */
  createdAt: string;
  username: string | null;
  promptCount: number;
}

/** A fully-loaded library from a detail endpoint. */
export interface Library extends EngagementFields {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
  promptCount: number;
}

/**
 * A prompt that is a member of a library, returned by
 * `GET /libraries/{id}/prompts`. Distinct from {@link PromptSummary}: includes
 * `isPublic` because library members can be either public prompts or the
 * caller's own private prompts.
 */
export interface LibraryMemberPrompt extends EngagementFields {
  id: string;
  userId: string;
  title: string;
  description: string;
  compiledPrompt: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  currentVersion: number;
}

/** Body of `POST /libraries`. */
export interface LibraryCreateInput {
  name: string;
  description?: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
}

/**
 * Body of `PATCH /libraries/{id}`. The server requires `name` even on update
 * (the endpoint follows PUT-ish PATCH semantics).
 */
export interface LibraryUpdateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: readonly string[];
}

/**
 * Response body of `POST /libraries`.
 *
 * @remarks
 * Narrower than {@link Library}. If you need the full library after creating,
 * call `libraries.get(response.id)`.
 */
export interface LibraryCreateResponse {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  tags: readonly string[];
}
