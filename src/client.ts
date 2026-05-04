import { normalizeConfig, type PromptyClientConfig } from "./config.js";
import { createHttp } from "./internal/http.js";
import { constraintsResource, type ConstraintsResource } from "./resources/constraints.js";
import { librariesResource, type LibrariesResource } from "./resources/libraries.js";
import { outputsResource, type OutputsResource } from "./resources/outputs.js";
import { personasResource, type PersonasResource } from "./resources/personas.js";
import { promptsResource, type PromptsResource } from "./resources/prompts.js";
import { tonesResource, type TonesResource } from "./resources/tones.js";

/**
 * A fully-configured prompty.tools API client.
 *
 * Create one with {@link createPromptyClient}.
 */
export interface PromptyClient {
  readonly prompts: PromptsResource;
  readonly personas: PersonasResource;
  readonly tones: TonesResource;
  readonly outputs: OutputsResource;
  readonly constraints: ConstraintsResource;
  readonly libraries: LibrariesResource;
}

/**
 * Creates a new prompty.tools API client.
 *
 * @example
 * ```ts
 * const client = createPromptyClient({ apiKey: process.env.PROMPTY_API_KEY! });
 * const page = await client.prompts.list({ scope: "public" });
 * ```
 *
 * @throws {PromptyConfigError} If the config is invalid.
 */
export function createPromptyClient(config: PromptyClientConfig): PromptyClient {
  const normalized = normalizeConfig(config);
  const http = createHttp(normalized);
  return {
    prompts: promptsResource(http),
    personas: personasResource(http),
    tones: tonesResource(http),
    outputs: outputsResource(http),
    constraints: constraintsResource(http),
    libraries: librariesResource(http),
  };
}
