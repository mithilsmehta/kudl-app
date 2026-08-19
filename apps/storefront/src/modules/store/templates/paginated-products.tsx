import { listCategories } from "@lib/data/categories"
import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getProductBrand, PRICE_RANGES } from "@lib/kudl/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import SortDropdown from "@modules/store/components/sort-dropdown"

const PRODUCT_LIMIT = 12

export type ShopFilterValues = {
  pet?: string
  category?: string
  brands?: string[]
  price?: string
  availability?: string
  q?: string
}

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: string
}

const isInStock = (product: HttpTypes.StoreProduct) =>
  (product.variants ?? []).some(
    (variant) =>
      !variant.manage_inventory ||
      Boolean(variant.allow_backorder) ||
      (variant.inventory_quantity ?? 0) > 0
  )

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  filters,
  showToolbar = false,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: ShopFilterValues
  showToolbar?: boolean
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  // Free-text search is a real Medusa Store API filter.
  if (filters?.q) {
    queryParams["q"] = filters.q
  }

  // Pet/category filters resolve to real Medusa category ids so the API does
  // the filtering rather than the browser.
  const categoryHandle = filters?.category || filters?.pet
  if (categoryHandle && !categoryId) {
    const categories = await listCategories().catch(() => [])
    const match = (categories ?? []).find(
      (category) => category.handle === categoryHandle
    )
    if (match) {
      queryParams["category_id"] = [match.id]
    }
  }

  const {
    response: { products: fetchedProducts },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  // Brand, price and availability are refined here because Medusa has no
  // Store API filter for metadata or computed price buckets in this version.
  const activeBrands = filters?.brands ?? []
  const priceRange = PRICE_RANGES.find((range) => range.key === filters?.price)
  const inStockOnly = filters?.availability === "in-stock"

  const products = fetchedProducts.filter((product) => {
    if (activeBrands.length) {
      const brand = getProductBrand(product)
      if (!brand || !activeBrands.includes(brand)) {
        return false
      }
    }

    if (priceRange) {
      const amount =
        getProductPrice({ product }).cheapestPrice?.calculated_price_number
      if (
        amount === undefined ||
        amount < priceRange.min ||
        amount > priceRange.max
      ) {
        return false
      }
    }

    if (inStockOnly && !isInStock(product)) {
      return false
    }

    return true
  })

  const count = products.length
  const totalPages = Math.max(1, Math.ceil(count / PRODUCT_LIMIT))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const start = (currentPage - 1) * PRODUCT_LIMIT
  const visible = products.slice(start, start + PRODUCT_LIMIT)

  return (
    <div className="w-full">
      {showToolbar && (
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-kudl-border pb-4">
          <p className="text-sm text-kudl-muted" data-testid="product-count">
            {count} {count === 1 ? "product" : "products"}
            {filters?.q && (
              <>
                {" "}
                for <span className="text-kudl-ink">“{filters.q}”</span>
              </>
            )}
          </p>
          <SortDropdown sortBy={sortBy ?? "created_at"} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kudl-border bg-kudl-soft px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-kudl-ink">
            No products available
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-kudl-muted">
            Nothing matches these filters right now. Try clearing a filter or
            searching for something else.
          </p>
        </div>
      ) : (
        <>
          <ul
            className="grid grid-cols-2 gap-4 small:grid-cols-3 medium:grid-cols-4 small:gap-6"
            data-testid="products-list"
          >
            {visible.map((product) => (
              <li key={product.id} className="flex">
                <div className="w-full">
                  <ProductPreview product={product} region={region} />
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                data-testid="product-pagination"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
