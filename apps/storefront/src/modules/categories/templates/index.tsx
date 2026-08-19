import { notFound } from "next/navigation"
import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { ChevronRight } from "lucide-react"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (current: HttpTypes.StoreProductCategory) => {
    if (current.parent_category) {
      parents.push(current.parent_category)
      getParents(current.parent_category)
    }
  }

  getParents(category)

  const breadcrumbs = [...parents].reverse()

  return (
    <div className="content-container py-8" data-testid="category-container">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-kudl-muted">
          <li>
            <LocalizedClientLink
              href="/shop"
              className="rounded hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
            >
              Shop
            </LocalizedClientLink>
          </li>
          {breadcrumbs.map((parent) => (
            <li key={parent.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <LocalizedClientLink
                href={`/categories/${parent.handle}`}
                className="rounded hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
                data-testid="sort-by-link"
              >
                {parent.name}
              </LocalizedClientLink>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-kudl-ink" aria-current="page">
              {category.name}
            </span>
          </li>
        </ol>
      </nav>

      <header className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight text-kudl-ink small:text-3xl"
          data-testid="category-page-title"
        >
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-kudl-muted">
            {category.description}
          </p>
        )}
      </header>

      {/* Sub-categories, when this category has children in Medusa. */}
      {category.category_children && category.category_children.length > 0 && (
        <ul className="mb-8 flex flex-wrap gap-2">
          {category.category_children.map((child) => (
            <li key={child.id}>
              <LocalizedClientLink
                href={`/categories/${child.handle}`}
                className="inline-flex h-9 items-center rounded-full border border-kudl-border bg-white px-4 text-sm text-kudl-ink transition-colors hover:border-kudl-primary hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
              >
                {child.name}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}

      <Suspense
        key={`${sort}-${pageNumber}-${category.id}`}
        fallback={<SkeletonProductGrid />}
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
          countryCode={countryCode}
          optionValueIds={optionValueIds}
          showToolbar
        />
      </Suspense>
    </div>
  )
}
