import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import ShopFilters from "@modules/store/components/shop-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts, { ShopFilterValues } from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  filters,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ShopFilterValues
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // Filter options are built from the real Medusa category tree.
  const categories = await listCategories().catch(() => [])

  const parentHandleById = new Map(
    (categories ?? []).map((category) => [category.id, category.handle])
  )

  const categoryOptions = (categories ?? [])
    .filter((category) => Boolean(category.parent_category))
    .map((category) => ({
      handle: category.handle,
      name: category.name,
      parentHandle:
        category.parent_category?.handle ??
        parentHandleById.get(category.parent_category_id ?? "") ??
        undefined,
    }))

  return (
    <div className="content-container py-8" data-testid="category-container">
      <header className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight text-kudl-ink small:text-3xl"
          data-testid="store-page-title"
        >
          All Products
        </h1>
        <p className="mt-1 text-sm text-kudl-muted">
          Everything for your dogs and cats, priced in INR.
        </p>
      </header>

      <div className="flex flex-col gap-8 small:flex-row small:items-start small:gap-10">
        <ShopFilters categories={categoryOptions} sortBy={sort} />

        <Suspense
          key={`${sort}-${pageNumber}-${JSON.stringify(filters ?? {})}`}
          fallback={<SkeletonProductGrid />}
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            filters={filters}
            showToolbar
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
