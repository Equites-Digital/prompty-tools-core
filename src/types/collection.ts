import type { EngagementFields } from "./common.js";

/** A single collection in a list response. */
export interface CollectionSummary extends EngagementFields {
  id: string;
  userId: string;
  name: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
}

/** A fully-loaded collection from a detail endpoint, including its items. */
export interface Collection extends EngagementFields {
  id: string;
  name: string;
  description: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
  items: readonly CollectionConstraintRef[];
  toneItems: readonly CollectionToneRef[];
}

/** A constraint reference inside a collection. */
export interface CollectionConstraintRef {
  /** Join-row id. */
  id: string;
  constraintId: string;
  text: string;
}

/** A tone reference inside a collection. */
export interface CollectionToneRef {
  /** Join-row id. */
  id: string;
  toneId: string;
  label: string;
}

/** Body of `POST /collections`. */
export interface CollectionCreateInput {
  name: string;
  description?: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
  constraintIds?: readonly string[];
  toneIds?: readonly string[];
}

/** Body of `PATCH /collections/{id}`. */
export interface CollectionUpdateInput {
  name: string;
  description?: string;
  tags?: readonly string[];
  /** Optional visibility change. */
  isPublic?: boolean;
}

/** Response body of `POST /collections`. Narrower than {@link Collection}. */
export interface CollectionCreateResponse {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  tags: readonly string[];
}
