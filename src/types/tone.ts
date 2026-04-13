import type { EngagementFields } from "./common.js";

/** A single tone in a list response. */
export interface ToneSummary extends EngagementFields {
  id: string;
  userId: string;
  label: string;
  tags: readonly string[];
  /** ISO 8601 UTC date string. */
  createdAt: string;
  username: string | null;
}

/** A fully-loaded tone from a detail endpoint. */
export interface Tone extends EngagementFields {
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

/** Body of `POST /tones`. */
export interface ToneCreateInput {
  label: string;
  /** Defaults to `true` server-side. */
  isPublic?: boolean;
  tags?: readonly string[];
}

/** Body of `PATCH /tones/{id}`. */
export interface ToneUpdateInput {
  label: string;
  tags?: readonly string[];
  /** Optional visibility change (tones have no dedicated visibility endpoint). */
  isPublic?: boolean;
}

/** Response body of `POST /tones`. Narrower than {@link Tone}. */
export interface ToneCreateResponse {
  id: string;
  label: string;
  isPublic: boolean;
  tags: readonly string[];
}
