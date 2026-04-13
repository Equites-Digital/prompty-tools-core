import type { EngagementFields } from "./common.js";

/** A single output in a list response. */
export interface OutputSummary extends EngagementFields {
  id: string;
  userId: string;
  label: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
}

/** A fully-loaded output from a detail endpoint. */
export interface Output extends EngagementFields {
  id: string;
  ownerUserId: string;
  label: string;
  tags: readonly string[];
  isPublic: boolean;
  username: string | null;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  isOwner: boolean;
}

/** Body of `POST /outputs`. */
export interface OutputCreateInput {
  label: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
}

/** Body of `PATCH /outputs/{id}`. */
export interface OutputUpdateInput {
  label: string;
  tags?: readonly string[];
  /** Optional visibility change. */
  isPublic?: boolean;
}

/** Response body of `POST /outputs`. Narrower than {@link Output}. */
export interface OutputCreateResponse {
  id: string;
  label: string;
  isPublic: boolean;
  tags: readonly string[];
}
