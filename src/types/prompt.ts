import type { EngagementFields } from "./common.js";

/** A single prompt in a list response. */
export interface PromptSummary extends EngagementFields {
  id: string;
  userId: string;
  title: string;
  description: string;
  compiledPrompt: string;
  /** ISO 8601 UTC date string. Use `new Date()` to convert. */
  createdAt: string;
  username: string | null;
  tags: readonly string[];
  currentVersion: number;
}

/** A fully-loaded prompt from a detail endpoint. */
export interface Prompt extends EngagementFields {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  task: string;
  persona: string | null;
  tones: readonly string[];
  output: string | null;
  constraints: readonly string[];
  compiledPrompt: string;
  isPublic: boolean;
  tags: readonly string[];
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
  currentVersion: number;
  personaRef: { id: string; title: string; personaId: string } | null;
  outputRef: { id: string; label: string } | null;
  toneRefs: readonly { id: string; label: string }[];
  constraintRefs: readonly { id: string; text: string }[];
}

/** A single entry in the version list of a prompt. */
export interface PromptVersionSummary {
  id: string;
  version: number;
  title: string;
  changelog: string;
  /** ISO 8601 UTC date string. */
  createdAt: string;
}

/** A fully-loaded version of a prompt. */
export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  title: string;
  description: string;
  tags: readonly string[];
  task: string;
  persona: string | null;
  tones: readonly string[];
  output: string | null;
  constraints: readonly string[];
  compiledPrompt: string;
  changelog: string;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  prevVersionId: string | null;
  nextVersionId: string | null;
  personaRef: { id: string; title: string; personaId: string } | null;
  outputRef: { id: string; label: string } | null;
  toneRefs: readonly { id: string; label: string }[];
  constraintRefs: readonly { id: string; text: string }[];
}

/** Body of `POST /prompts`. */
export interface PromptCreateInput {
  title: string;
  task: string;
  compiledPrompt: string;
  description?: string;
  persona?: string;
  output?: string;
  tones?: readonly string[];
  constraints?: readonly string[];
  personaVersionId?: string;
  outputId?: string;
  toneIds?: readonly string[];
  constraintIds?: readonly string[];
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
}

/** Body of `PATCH /prompts/{id}` - creates a new version of the prompt. */
export interface PromptUpdateInput {
  title: string;
  task: string;
  compiledPrompt: string;
  /** Required: short description of what changed in this version. */
  changelog: string;
  description?: string;
  persona?: string;
  output?: string;
  tones?: readonly string[];
  constraints?: readonly string[];
  personaVersionId?: string;
  outputId?: string;
  toneIds?: readonly string[];
  constraintIds?: readonly string[];
  tags?: readonly string[];
}

/**
 * Response body of `POST /prompts`.
 *
 * @remarks
 * Narrower than {@link Prompt} - it's the raw `Prompt` row created on the
 * server, without the title/task/compiledPrompt fields (which live on the
 * version record). If you need the full prompt after creating, call
 * `prompts.get(response.id)`.
 */
export interface PromptCreateResponse {
  id: string;
  userId: string;
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  /** ISO 8601 UTC date string. */
  updatedAt: string;
}
