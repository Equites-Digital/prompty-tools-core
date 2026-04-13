import type { EngagementFields } from "./common.js";

/** A single constraint in a list response. */
export interface ConstraintSummary extends EngagementFields {
  id: string;
  userId: string;
  text: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
}

/** A fully-loaded constraint from a detail endpoint. */
export interface Constraint extends EngagementFields {
  id: string;
  ownerUserId: string;
  text: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
}

/** Body of `POST /constraints`. */
export interface ConstraintCreateInput {
  text: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
}

/** Body of `PATCH /constraints/{id}`. */
export interface ConstraintUpdateInput {
  text: string;
  tags?: readonly string[];
  /** Optional visibility change. */
  isPublic?: boolean;
}

/** Response body of `POST /constraints`. Narrower than {@link Constraint}. */
export interface ConstraintCreateResponse {
  id: string;
  text: string;
  isPublic: boolean;
  tags: readonly string[];
}
