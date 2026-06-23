export type QueueItemStatus = "pending" | "in_progress" | "succeeded" | "failed";
export type TerminalQueueItemStatus = "succeeded" | "failed";

export interface QueueSummary {
  id: string;
  name: string;
  description: string;
  pendingCount: number;
  inProgressCount: number;
  succeededCount: number;
  failedCount: number;
  totalCount: number;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  /** ISO 8601 UTC date string. */
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  queueId: string;
  promptId: string;
  status: QueueItemStatus;
  notes: string;
  promptTitle: string;
  currentVersion: number;
  /** ISO 8601 UTC date string. */
  createdAt: string;
  /** ISO 8601 UTC date string. */
  updatedAt: string;
}

export interface DequeuedItem extends QueueItem {
  compiledPrompt: string;
}

export interface QueueCreateInput {
  name: string;
  description?: string;
}

export interface QueueCreateResponse {
  id: string;
  name: string;
  description: string;
}

export interface MarkQueueItemInput {
  status: TerminalQueueItemStatus;
  notes?: string;
}

export interface QueueListParams {
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Items per page (1–100). Default: 12. */
  pageSize?: number;
  /** Full-text search (max 200 characters). */
  search?: string;
  /** Pass an AbortSignal to cancel this request. */
  signal?: AbortSignal;
}

export interface QueueItemListParams {
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Items per page (1–100). Default: 20. */
  pageSize?: number;
  /** Filter by item status. */
  status?: QueueItemStatus;
  /** Pass an AbortSignal to cancel this request. */
  signal?: AbortSignal;
}
