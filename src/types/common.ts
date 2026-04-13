/**
 * Shared pagination, sorting, and engagement types used across every resource.
 */

export type Scope = "public" | "mine" | "favorites" | "all";
export type Sort = "newest" | "most-upvoted" | "most-favorited";
export type VoteValue = 1 | -1;

/** Page sizes accepted by list endpoints. Server rejects any other value. */
export type ApiPageSize = 6 | 12 | 24 | 48 | 100;

/** Page sizes accepted by version list endpoints. */
export type VersionPageSize = 10 | 20 | 50;

/**
 * Query parameters for list endpoints.
 */
export interface ListParams {
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Items per page. Must be one of the accepted sizes. Default: 12. */
  pageSize?: ApiPageSize;
  /** Sort order. Default: "newest". */
  sort?: Sort;
  /** Access scope. Default: "public". */
  scope?: Scope;
  /** Full-text search (max 200 characters). */
  search?: string;
  /** Filter by a single tag. */
  tag?: string;
  /** Pass an AbortSignal to cancel this request. */
  signal?: AbortSignal;
}

/**
 * Query parameters for version list endpoints.
 */
export interface VersionListParams {
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Items per page. Default: 20. */
  pageSize?: VersionPageSize;
  /** Pass an AbortSignal to cancel this request. */
  signal?: AbortSignal;
}

/**
 * Personalized engagement fields that appear on every public/detail DTO.
 * The server computes these relative to the API key owner.
 */
export interface EngagementFields {
  upvotes: number;
  downvotes: number;
  favoritesCount: number;
  commentCount: number;
  /** The API key owner's current vote on this entity. `null` means no vote. */
  userVote: 1 | -1 | null;
  /** Whether the API key owner has favorited this entity. */
  isFavorited: boolean;
}
