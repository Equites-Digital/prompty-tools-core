# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-04-13

### Fixed
- Bind the fallback `globalThis.fetch` to its host so Firefox and some Safari
  versions no longer throw `TypeError: 'fetch' called on an object that does
  not implement interface Window` when the client is invoked from the
  browser.

## [0.1.0] - 2026-04-10

### Added
- Initial release.
- `createPromptyClient` factory with namespaced resources: `prompts`, `personas`, `tones`, `outputs`, `constraints`, `collections`.
- Full coverage of the 46 `/api/v1` endpoints of `prompty.tools`.
- Typed error class hierarchy (`PromptyError`, `PromptyAuthError`, `PromptyNotFoundError`, `PromptyRateLimitError`, etc.).
- Offset-based pagination with `Page<T>` navigation and `listAll()` async iterator.
- Custom `fetch` injection for edge runtimes (Cloudflare Workers, Deno, Bun).
- Zero runtime dependencies.
- Dual ESM + CJS publish with TypeScript declarations.
