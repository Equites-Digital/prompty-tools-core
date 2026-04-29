import type { Http } from "../internal/http.js";
import type {
  ToneCollection,
  ToneCollectionItem,
} from "../types/collection.js";
import {
  createCollectionsResource,
  type CollectionsResource,
} from "./_collections-factory.js";

export type ToneCollectionsResource = CollectionsResource<
  ToneCollection,
  ToneCollectionItem
>;

export function toneCollectionsResource(http: Http): ToneCollectionsResource {
  return createCollectionsResource<ToneCollection, ToneCollectionItem>(
    http,
    "/tones/collections",
  );
}
