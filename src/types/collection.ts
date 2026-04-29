import type { EngagementFields } from "./common.js";

export interface CollectionSummary extends EngagementFields {
  id: string;
  userId: string;
  name: string;
  description: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
  itemCount: number;
}

interface CollectionBase extends EngagementFields {
  id: string;
  name: string;
  description: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
}

export interface ToneCollection extends CollectionBase {
  items: readonly ToneCollectionItem[];
}

export interface ConstraintCollection extends CollectionBase {
  items: readonly ConstraintCollectionItem[];
}

export interface ToneCollectionItem {
  /** Join-row id. */
  id: string;
  toneId: string;
  label: string;
}

export interface ConstraintCollectionItem {
  /** Join-row id. */
  id: string;
  constraintId: string;
  text: string;
}

export interface CollectionCreateInput {
  name: string;
  description?: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
  /** IDs of tones (for tone collections) or constraints (for constraint collections). */
  itemIds?: readonly string[];
}

export interface CollectionUpdateInput {
  name: string;
  description?: string;
  tags?: readonly string[];
  isPublic?: boolean;
}

export interface CollectionCreateResponse {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  tags: readonly string[];
}
