// Copies the built ESM bundle from `dist/` into `docs/assets/lib/` so the
// static docs site can load `@prompty-tools/core` directly via a relative
// `<script type="module">` import.
//
// Run via `npm run docs:build` (which depends on `npm run build`).

import { copyFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const distEsm = resolve(root, "dist/index.js");
const distMap = resolve(root, "dist/index.js.map");
const targetDir = resolve(root, "docs/assets/lib");
const targetEsm = resolve(targetDir, "prompty-tools-core.js");
const targetMap = resolve(targetDir, "prompty-tools-core.js.map");

await ensureExists(distEsm, "Run `npm run build` first.");

await mkdir(targetDir, { recursive: true });
await copyFile(distEsm, targetEsm);
await copyAndRewriteSourcemap(distMap, targetMap);

console.log(`Copied ${distEsm} → ${targetEsm}`);

async function ensureExists(path, hint) {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(`Missing ${path}. ${hint}`);
  }
}

async function copyAndRewriteSourcemap(src, dst) {
  try {
    await access(src, constants.F_OK);
  } catch {
    return;
  }
  // Just copy - relative source paths are still valid since we're only one
  // directory deeper than dist/, but the map contents themselves don't need
  // rewriting for browser devtools to work.
  await copyFile(src, dst);
}
