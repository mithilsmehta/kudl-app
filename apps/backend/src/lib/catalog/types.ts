/**
 * Shape of one seeded product in the KUDL catalog.
 *
 * Taxonomy position is expressed as the human labels from lib/taxonomy.ts
 * (`column` / `item`), not as pre-computed slugs. The seed resolves those
 * labels against the taxonomy and derives both the Medusa category handle and
 * the `metadata.subcategory` slug from the match, so a typo here throws at seed
 * time instead of producing a product that quietly filters into nothing.
 */

import { ImageKey } from "./images"

/**
 * The coarse enum the storefront's filter sidebar keys off
 * (productFacets.ts `ProductCategory`). Deliberately separate from the
 * taxonomy's `column`/`item`, which is far more granular.
 */
export type ProductCategorySlug =
  | "food"
  | "treats"
  | "toys"
  | "grooming-health"
  | "litter-habitat"
  | "accessories"

/** Which top-level Medusa category tree the product hangs under. */
export type CatalogTree = "dogs" | "cats" | "pharmacy"

export interface CatalogProduct {
  title: string
  handle: string
  /**
   * Storefront PetType. Pharmacy products still carry one — the storefront's
   * pharmacy branch is cross-species but every individual SKU is formulated
   * for one animal, and a product with no petType would be invisible to the
   * pet-type filter.
   */
  petType: "dogs" | "cats"
  tree: CatalogTree
  /** Taxonomy column label within `tree`'s menu, e.g. "Dog Food". */
  column: string
  /** Taxonomy item label within `column`, e.g. "Dry Food". */
  item: string
  /**
   * Cross-species pharmacy placement, for products that also belong on the
   * Pharmacy branch. Resolved against pharmacyMenu and stamped as
   * `metadata.pharmacyCategory`. A `tree: "pharmacy"` product does not need
   * this — its own column/item already is its pharmacy placement.
   */
  pharmacyItem?: { column: string; item: string }
  brand: string
  category: ProductCategorySlug
  /**
   * Slugs from the storefront's Shop By Breed lineup. Left unset for products
   * that aren't breed-specific, which is most of them — an honest empty list
   * beats claiming every product suits every breed.
   */
  breeds?: string[]
  /** Fixed demo values, not randomised, so re-seeding is deterministic. */
  rating: number
  reviewCount: number
  /** Defaults to true; set false to demo the out-of-stock filter. */
  inStock?: boolean
  image: ImageKey
  /** Grams, used for shipping weight. */
  weight: number
  description: string
  variants: { title: string; sku: string; amount: number }[]
}
