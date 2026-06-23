import type { Http } from "../internal/http.js";
import { createPage, walkPages } from "../internal/pagination.js";
import { extractList } from "../internal/envelope.js";
import type { Page } from "../types/page.js";
import type {
  DequeuedItem,
  MarkQueueItemInput,
  QueueCreateInput,
  QueueCreateResponse,
  QueueItem,
  QueueItemListParams,
  QueueListParams,
  QueueSummary,
} from "../types/queue.js";

const QUEUE_DEFAULT_PAGE_SIZE = 12;
const QUEUE_ITEM_DEFAULT_PAGE_SIZE = 20;

export interface QueuesResource {
  list(params?: QueueListParams): Promise<Page<QueueSummary>>;
  listAll(params?: QueueListParams): AsyncIterable<QueueSummary>;
  create(input: QueueCreateInput): Promise<QueueCreateResponse>;
  listItems(queueId: string, params?: QueueItemListParams): Promise<Page<QueueItem>>;
  listAllItems(queueId: string, params?: QueueItemListParams): AsyncIterable<QueueItem>;
  addItem(queueId: string, promptId: string): Promise<QueueItem>;
  dequeue(queueId: string): Promise<DequeuedItem | null>;
  markItem(queueId: string, itemId: string, input: MarkQueueItemInput): Promise<void>;
  removeItem(queueId: string, itemId: string): Promise<void>;
}

async function fetchQueuePage(
  http: Http,
  params: QueueListParams | undefined,
  page: number,
): Promise<Page<QueueSummary>> {
  const pageSize = params?.pageSize ?? QUEUE_DEFAULT_PAGE_SIZE;
  const body = await http.request<unknown>("GET", "/queues", {
    query: { page, pageSize, search: params?.search },
    ...(params?.signal !== undefined ? { signal: params.signal } : {}),
  });
  const { items, total } = extractList<QueueSummary>(body, "queues");
  return createPage(items, total, page, pageSize, (next) =>
    fetchQueuePage(http, params, next),
  );
}

async function fetchQueueItemPage(
  http: Http,
  queueId: string,
  params: QueueItemListParams | undefined,
  page: number,
): Promise<Page<QueueItem>> {
  const path = `/queues/${encodeURIComponent(queueId)}/items`;
  const pageSize = params?.pageSize ?? QUEUE_ITEM_DEFAULT_PAGE_SIZE;
  const body = await http.request<unknown>("GET", path, {
    query: { page, pageSize, status: params?.status },
    ...(params?.signal !== undefined ? { signal: params.signal } : {}),
  });
  const { items, total } = extractList<QueueItem>(body, "items");
  return createPage(items, total, page, pageSize, (next) =>
    fetchQueueItemPage(http, queueId, params, next),
  );
}

export function queuesResource(http: Http): QueuesResource {
  return {
    list: (params) => fetchQueuePage(http, params, params?.page ?? 1),
    listAll: async function* (params) {
      yield* walkPages(await fetchQueuePage(http, params, params?.page ?? 1));
    },
    create: (input) =>
      http.request<QueueCreateResponse>("POST", "/queues", { body: input }),
    listItems: (queueId, params) =>
      fetchQueueItemPage(http, queueId, params, params?.page ?? 1),
    listAllItems: async function* (queueId, params) {
      yield* walkPages(await fetchQueueItemPage(http, queueId, params, params?.page ?? 1));
    },
    addItem: (queueId, promptId) =>
      http.request<QueueItem>(
        "POST",
        `/queues/${encodeURIComponent(queueId)}/items`,
        { body: { promptId } },
      ),
    dequeue: async (queueId) => {
      const result = await http.request<{ item: DequeuedItem | null }>(
        "POST",
        `/queues/${encodeURIComponent(queueId)}/items/dequeue`,
      );
      return result.item;
    },
    markItem: async (queueId, itemId, input) => {
      await http.request<{ success: true }>(
        "PATCH",
        `/queues/${encodeURIComponent(queueId)}/items/${encodeURIComponent(itemId)}`,
        { body: input },
      );
    },
    removeItem: async (queueId, itemId) => {
      await http.request<{ success: true }>(
        "DELETE",
        `/queues/${encodeURIComponent(queueId)}/items/${encodeURIComponent(itemId)}`,
      );
    },
  };
}
