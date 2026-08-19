import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { ShopFilterValues } from "@modules/store/templates/paginated-products"

export type ShopPageSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  pet?: string
  category?: string
  brand?: string | string[]
  price?: string
  availability?: string
  q?: string
}

const asArray = (value?: string | string[]): string[] | undefined => {
  if (!value) return undefined
  return Array.isArray(value) ? value : [value]
}

/** Normalises shop URL search params into the filter shape the grid expects. */
export const buildShopFilters = (
  searchParams: ShopPageSearchParams
): ShopFilterValues => ({
  pet: searchParams.pet,
  category: searchParams.category,
  brands: asArray(searchParams.brand),
  price: searchParams.price,
  availability: searchParams.availability,
  q: searchParams.q,
})
