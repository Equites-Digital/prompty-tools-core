# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-06-10

### Changed

- **Breaking:** `PromptCreateInput` no longer accepts `compiledPrompt`, `persona`,
  `output`, `tones`, or `constraints`. The API now compiles the prompt
  server-side from the `task` field and the referenced building block IDs
  (`personaVersionId`, `outputId`, `toneIds`, `constraintIds`). Passing those
  free-text fields had no effect server-side as of source commit
  `a8171c1292cc` and would have silently been ignored.
- **Breaking:** `PromptUpdateInput` removes the same set of fields
  (`compiledPrompt`, `persona`, `output`, `tones`, `constraints`) for the same
  reason. `changelog` remains required.
- Required fields for `POST /prompts` are now `title` and `task` only
  (previously also required `compiledPrompt`).
- Required fields for `PATCH /prompts/{id}` are now `title`, `task`, and
  `changelog` (previously also required `compiledPrompt`).

### Fixed

- Inaccessible or missing building block references (`toneIds`, `constraintIds`,
  `outputId`, `personaVersionId`) now correctly surface as `PromptyNotFoundError`
  (HTTP 404) rather than the previous 403, matching the updated server behaviour.

## [0.3.0] - 2026-05-05

### Added
- First-class `client.libraries` namespace covering every documented Libraries
  endpoint: `list`, `listAll`, `get`, `create`, `update`, `delete`, `vote`,
  `unvote`, `toggleFavorite`, `listPrompts`, `listAllPrompts`, `addPrompt`,
  `removePrompt`. Mirrors the platform's `/api/v1/libraries` and
  `/api/v1/libraries/{id}/prompts` endpoints.
- New types: `Library`, `LibrarySummary`, `LibraryMemberPrompt`,
  `LibraryCreateInput`, `LibraryUpdateInput`, `LibraryCreateResponse`, and
  `LibrariesResource`.

## [0.2.0] - 2026-04-29

### Changed
- **Breaking:** Collections are now scoped per building block. The flat
  `client.collections` namespace has been removed and replaced with
  `client.tones.collections` and `client.constraints.collections`, mirroring
  the platform's `/api/v1/{tones,constraints}/collections` URL hierarchy.
- A collection now holds a single `items` array of one type (tones or
  constraints) instead of the previous mixed `items` + `toneItems` shape.
  Item management uses the uniform `listItems(id)` / `setItems(id, itemIds)`
  pair (replacing `listConstraints` / `setConstraints` / `listTones` /
  `setTones`).
- `CollectionCreateInput` now accepts a single `itemIds` field instead of
  separate `constraintIds` / `toneIds`.
- `CollectionSummary` now includes `description` and `itemCount` (returned
  by the platform but previously dropped from the typed surface).

### Removed
- `Collection`, `CollectionConstraintRef`, `CollectionToneRef`, and
  `CollectionsResource` types. Replaced by `ToneCollection`,
  `ConstraintCollection`, `ToneCollectionItem`, `ConstraintCollectionItem`,
  `ToneCollectionsResource`, and `ConstraintCollectionsResource`.

### Fixed
- The previous `client.collections.*` calls targeted `/api/v1/collections/*`,
  which does not exist on the platform; every call returned 404. The new
  scoped resources hit the real endpoints under `/api/v1/tones/collections`
  and `/api/v1/constraints/collections`.

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
