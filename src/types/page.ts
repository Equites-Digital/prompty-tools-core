/**
 * A single page of items from a list endpoint.
 *
 * @remarks
 * Use {@link Page.next} / {@link Page.prev} to walk pages, or call
 * `resource.listAll(params)` to get an async iterator over every item.
 */
export interface Page<T> {
  /** Items on the current page. */
  readonly items: readonly T[];
  /** Total number of items across all pages. */
  readonly total: number;
  /** 1-based page number. */
  readonly page: number;
  /** Number of items per page. */
  readonly pageSize: number;
  /** Whether there is at least one more page. */
  readonly hasNext: boolean;
  /** Whether there is a previous page. */
  readonly hasPrev: boolean;
  /**
   * Fetches the next page.
   * @throws {RangeError} If there is no next page.
   */
  next(): Promise<Page<T>>;
  /**
   * Fetches the previous page.
   * @throws {RangeError} If there is no previous page.
   */
  prev(): Promise<Page<T>>;
}
