import type { EngagementFields } from "./common.js";

/** A single persona in a list response. */
export interface PersonaSummary extends EngagementFields {
  id: string;
  userId: string;
  versionId: string;
  title: string;
  description: string;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
  tags: readonly string[];
}

/** A fully-loaded persona from a detail endpoint. */
export interface Persona extends EngagementFields {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  isPublic: boolean;
  tags: readonly string[];
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
  currentVersion: number;
  latestVersionId: string;
}

/** A single entry in the version list of a persona. */
export interface PersonaVersionSummary {
  id: string;
  version: number;
  title: string;
  changelog: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
}

/** A fully-loaded version of a persona. */
export interface PersonaVersion {
  id: string;
  personaId: string;
  version: number;
  title: string;
  description: string;
  tags: readonly string[];
  changelog: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  prevVersionId: string | null;
  nextVersionId: string | null;
}

/** Body of `POST /personas`. */
export interface PersonaCreateInput {
  title: string;
  description?: string;
  /** Defaults to `false` server-side (personas are private by default). */
  isPublic?: boolean;
  tags?: readonly string[];
}

/** Body of `PATCH /personas/{id}` - creates a new version of the persona. */
export interface PersonaUpdateInput {
  title: string;
  description?: string;
  changelog?: string;
  tags?: readonly string[];
}

/** Response body of `POST /personas`. Narrower than {@link Persona}. */
export interface PersonaCreateResponse {
  id: string;
  versionId: string;
  title: string;
  description: string;
  isPublic: boolean;
  tags: readonly string[];
}
