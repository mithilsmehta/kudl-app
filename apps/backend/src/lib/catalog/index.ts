/**
 * The full KUDL catalog, assembled from the three taxonomy branches.
 *
 * Coverage is deliberately a curated subset of the taxonomy rather than one
 * product per taxonomy item: every column of Dogs, Cats and Pharmacy is
 * represented, and the high-traffic items within each column have a product,
 * but the long tail (Ethnic Wear, Lehangas, Hematinic boosters, Endocrine care
 * and so on) has none and will show an empty result. That is the same accepted
 * gap the storefront's brand directory already has — the mega menu is the full
 * catalogue shape, the seeded catalog is a demo slice of it.
 */

import { catProducts } from "./cats"
import { dogProducts } from "./dogs"
import { pharmacyProducts } from "./pharmacy"
import { CatalogProduct } from "./types"

export * from "./images"
export * from "./types"

export const catalogProducts: CatalogProduct[] = [
  ...dogProducts,
  ...catProducts,
  ...pharmacyProducts,
]
