import type { Http } from "../internal/http.js";
import type {
  ConstraintCollection,
  ConstraintCollectionItem,
} from "../types/collection.js";
import {
  createCollectionsResource,
  type CollectionsResource,
} from "./_collections-factory.js";

export type ConstraintCollectionsResource = CollectionsResource<
  ConstraintCollection,
  ConstraintCollectionItem
>;

export function constraintCollectionsResource(
  http: Http,
): ConstraintCollectionsResource {
  return createCollectionsResource<
    ConstraintCollection,
    ConstraintCollectionItem
  >(http, "/constraints/collections");
}
