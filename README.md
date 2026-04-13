# @prompty-tools/core

Typed TypeScript client for the [prompty.tools](https://www.prompty.tools) public HTTP API.

- Zero runtime dependencies
- Full TypeScript types for every endpoint
- Works in Node 20+, modern browsers, Deno, Bun, and edge runtimes (Cloudflare Workers, Vercel Edge)
- Dual ESM + CJS publish

## Installation

```sh
npm install @prompty-tools/core
```

## Quickstart

```ts
import { createPromptyClient } from "@prompty-tools/core";

const client = createPromptyClient({ apiKey: process.env.PROMPTY_API_KEY! });

const page = await client.prompts.list({ scope: "public", pageSize: 12 });
console.log(page.items.length, "of", page.total);

const prompt = await client.prompts.get(page.items[0].id);
console.log(prompt.title, prompt.compiledPrompt);
```

## Authentication

Generate an API key in your Prompty dashboard. Keys start with `pk_` and are passed to the client at construction time:

```ts
const client = createPromptyClient({
  apiKey: process.env.PROMPTY_API_KEY!,
});
```

The key is required and validated synchronously - a missing or malformed key throws `PromptyConfigError` immediately.

## Namespaces

The client exposes one namespace per resource:

| Namespace              | Covers                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `client.prompts`       | Prompts (versioned) - list, get, create, update, versions   |
| `client.personas`      | Personas (versioned)                                        |
| `client.tones`         | Tones                                                       |
| `client.outputs`       | Outputs                                                     |
| `client.constraints`   | Constraints                                                 |
| `client.collections`   | Collections (groups of tones and constraints)               |

All resources support `.list()`, `.get(id)`, `.create(input)`, `.update(id, input)`, `.delete(id)`, `.vote(id, 1 | -1)`, `.unvote(id)`, `.toggleFavorite(id)`. Prompts and personas additionally support `.setVisibility(id, isPublic)`, `.listVersions(id)`, and `.getVersion(id, versionId)`.

## Error handling

Every non-2xx response throws a typed error:

```ts
import {
  PromptyRateLimitError,
  PromptyNotFoundError,
  PromptyAuthError,
} from "@prompty-tools/core";

try {
  await client.prompts.get("prompt_missing");
} catch (err) {
  if (err instanceof PromptyNotFoundError) {
    console.log("not found");
  } else if (err instanceof PromptyRateLimitError) {
    console.log("rate limited");
  } else if (err instanceof PromptyAuthError) {
    console.log("bad API key");
  } else {
    throw err;
  }
}
```

## Pagination

`list()` returns a `Page<T>` with navigation helpers:

```ts
let page = await client.prompts.list({ scope: "public", pageSize: 24 });
while (page.hasNext) {
  page = await page.next();
  console.log(page.items.map((p) => p.title));
}
```

Or use the async iterator to walk every page:

```ts
for await (const prompt of client.prompts.listAll({ scope: "mine" })) {
  console.log(prompt.title);
}
```

## Bring your own fetch

Inject a custom `fetch` for Cloudflare Workers, Deno, Bun, or tracing:

```ts
const client = createPromptyClient({
  apiKey: process.env.PROMPTY_API_KEY!,
  fetch: (input, init) => tracedFetch(input, init),
});
```

## Runtime support

- Node.js 20+
- Modern browsers (any that implement `fetch`)
- Deno
- Bun
- Cloudflare Workers, Vercel Edge, and other edge runtimes

## License

[MIT](./LICENSE) - prompty.tools
