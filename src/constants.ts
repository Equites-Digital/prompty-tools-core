import type { ApiPageSize, VersionPageSize } from "./types/common.js";

/** Current version of this package. Used in the default User-Agent. */
export const VERSION = "0.2.0";

/** Default base URL for the prompty.tools public API. */
export const PROMPTY_API_BASE_URL = "https://www.prompty.tools/api/v1";

/** Accepted page sizes for list endpoints. */
export const API_PAGE_SIZES = [6, 12, 24, 48, 100] as const satisfies readonly ApiPageSize[];

/** Default page size when none is specified. */
export const DEFAULT_PAGE_SIZE: ApiPageSize = 12;

/** Accepted page sizes for version list endpoints. */
export const VERSION_PAGE_SIZES = [10, 20, 50] as const satisfies readonly VersionPageSize[];

/** Default page size for version list endpoints. */
export const DEFAULT_VERSION_PAGE_SIZE: VersionPageSize = 20;

/** Default per-request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** API key prefix required by the server. */
export const API_KEY_PREFIX = "pk_";
