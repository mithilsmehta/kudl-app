import { Metadata } from "next"

import {
  buildShopFilters,
  ShopPageSearchParams,
} from "@lib/kudl/shop-filters"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Shop All Products | KUDL Pets",
  description:
    "Browse every KUDL Pets product for dogs and cats — food, treats, toys, litter and grooming, priced in INR.",
}

type Params = {
  searchParams: Promise<ShopPageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      filters={buildShopFilters(searchParams)}
    />
  )
}
