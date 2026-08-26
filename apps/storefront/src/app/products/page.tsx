"use client"

/**
 * All Products — filterable/sortable listing over the live Medusa catalog.
 * Filter facets (pet type, category, breed, brand, rating, stock) read the
 * metadata the backend's seed-kudl-catalog.ts stamps on each product (see
 * src/lib/productFacets.ts). Every product in the catalog is a Dogs, Cats or
 * Pharmacy product, so the whole catalog is shown and filtered rather than
 * pre-filtered on load. Filter/sort/view state is mirrored into the URL so
 * results are shareable and survive back/reload, the same way the old page
 * honoured `category` and `q`.
 */

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Search, X, SlidersHorizontal } from "@/components/icons"
import { Product, getProducts, getCategories } from "@/lib/api"
import {
  getBrand,
  getBreeds,
  getCategory,
  getCheapestPrice,
  getInStock,
  getPetType,
  getPharmacyCategory,
  getRating,
  getReviewCount,
  getSubcategory,
  PetType,
  ProductCategory,
} from "@/lib/productFacets"
import { trackEvent } from "@/lib/recommendations"
import { catsMenu, dogsMenu, findItemWithCategory, pharmacyMenu } from "@/lib/taxonomy"
import { BREEDS } from "@/lib/homeContent"
import Spinner from "@/components/Spinner"
import Breadcrumbs from "@/components/products/Breadcrumbs"
import FilterSidebar from "@/components/products/FilterSidebar"
import FilterDrawer from "@/components/products/FilterDrawer"
import FilterChips from "@/components/products/FilterChips"
import SortDropdown from "@/components/products/SortDropdown"
import ViewToggle from "@/components/products/ViewToggle"
import ProductGrid from "@/components/products/ProductGrid"
import ProductListItem from "@/components/products/ProductListItem"
import QuickViewModal from "@/components/products/QuickViewModal"
import EmptyState from "@/components/products/EmptyState"
import {
  activeFilterCount,
  EMPTY_FILTERS,
  Filters,
  PET_TYPE_OPTIONS,
  PRICE_RANGES,
  PriceRangeId,
  SORT_OPTIONS,
  SortKey,
  ViewMode,
} from "@/components/products/filterTypes"

const PAGE_SIZE = 12

const SORT_COMPARATORS: Record<SortKey, (a: Product, b: Product) => number> = {
  featured: () => 0,
  "price-asc": (a, b) => (getCheapestPrice(a) ?? 0) - (getCheapestPrice(b) ?? 0),
  "price-desc": (a, b) => (getCheapestPrice(b) ?? 0) - (getCheapestPrice(a) ?? 0),
  newest: (a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  rating: (a, b) => getRating(b) - getRating(a),
  // No real sales data exists in this demo catalog — review count is the
  // closest available proxy for "best selling".
  "best-selling": (a, b) => getReviewCount(b) - getReviewCount(a),
}

const isSortKey = (value: string | null): value is SortKey =>
  !!value && SORT_OPTIONS.some((o) => o.value === value)

const parseFiltersFromParams = (params: URLSearchParams): Filters => ({
  petType: (params.get("pet")?.split(",").filter(Boolean) ?? []) as PetType[],
  category: (params.get("cat")?.split(",").filter(Boolean) ?? []) as ProductCategory[],
  subcategory: params.get("sub")?.split(",").filter(Boolean) ?? [],
  pharmacyCategory: params.get("pharmacy")?.split(",").filter(Boolean) ?? [],
  pharmacyOnly: params.get("pharmacyOnly") === "1",
  breed: params.get("breed")?.split(",").filter(Boolean) ?? [],
  brand: params.get("brand")?.split(",").filter(Boolean) ?? [],
  priceRange: (params.get("price") as PriceRangeId | null) ?? null,
  minRating: params.get("rating") ? Number(params.get("rating")) : null,
  inStockOnly: params.get("stock") === "1",
})

const buildQueryString = (
  filters: Filters,
  sort: SortKey,
  view: ViewMode,
  search: string
): string => {
  const params = new URLSearchParams()
  if (filters.petType.length) params.set("pet", filters.petType.join(","))
  if (filters.category.length) params.set("cat", filters.category.join(","))
  if (filters.subcategory.length) params.set("sub", filters.subcategory.join(","))
  if (filters.pharmacyCategory.length) params.set("pharmacy", filters.pharmacyCategory.join(","))
  if (filters.pharmacyOnly) params.set("pharmacyOnly", "1")
  if (filters.breed.length) params.set("breed", filters.breed.join(","))
  if (filters.brand.length) params.set("brand", filters.brand.join(","))
  if (filters.priceRange) params.set("price", filters.priceRange)
  if (filters.minRating) params.set("rating", String(filters.minRating))
  if (filters.inStockOnly) params.set("stock", "1")
  if (sort !== "featured") params.set("sort", sort)
  if (view !== "grid") params.set("view", view)
  if (search.trim()) params.set("q", search.trim())
  return params.toString()
}

// Top-level pet categories a legacy `?category=<id-or-name>` link (from
// Footer / ShopByPet) should resolve to. Child categories (Dog Food, etc.)
// aren't part of this map, so they fall through and are ignored.
const LEGACY_CATEGORY_TO_PET_TYPES: Record<string, PetType[]> = {
  Dogs: ["dogs"],
  Cats: ["cats"],
}

function ProductsView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromParams(searchParams))
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "")
  const [sort, setSort] = useState<SortKey>(() => {
    const param = searchParams.get("sort")
    return isSortKey(param) ? param : "featured"
  })
  const [view, setView] = useState<ViewMode>(() =>
    searchParams.get("view") === "list" ? "list" : "grid"
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const legacyCategoryHandled = useRef(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prods, cats] = await Promise.all([getProducts(), getCategories()])
        if (cancelled) return
        setProducts(prods)
        setCategories(cats)
      } catch (e) {
        console.log("Error loading products:", e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Honour a legacy `?category=<id-or-name>` link (Footer, ShopByPet) by
  // translating it into the new pet-type filter, once categories are loaded.
  useEffect(() => {
    if (legacyCategoryHandled.current || categories.length === 0) return
    const categoryParam = searchParams.get("category")
    if (!categoryParam) {
      legacyCategoryHandled.current = true
      return
    }
    const match = categories.find((c) => c.id === categoryParam || c.name === categoryParam)
    const petTypes = match ? LEGACY_CATEGORY_TO_PET_TYPES[match.name] : undefined
    if (petTypes) {
      setFilters((f) => (f.petType.length === 0 ? { ...f, petType: petTypes } : f))
    }
    legacyCategoryHandled.current = true
  }, [categories, searchParams])

  // Mirror filter/sort/view/search state into the URL so results are
  // shareable and survive reload/back, without spamming browser history.
  useEffect(() => {
    const qs = buildQueryString(filters, sort, view, searchQuery)
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false })
  }, [filters, sort, view, searchQuery, router])

  // Debounced so a track fires once the visitor pauses typing, not per keystroke.
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return
    const timeout = setTimeout(() => {
      trackEvent("search_performed", { metadata: { query } })
    }, 600)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const filteredProducts = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    const list = products.filter((p) => {
      if (filters.petType.length && !filters.petType.includes(getPetType(p) as PetType)) {
        return false
      }
      if (
        filters.category.length &&
        !filters.category.includes(getCategory(p) as ProductCategory)
      ) {
        return false
      }
      if (filters.subcategory.length) {
        const subcategory = getSubcategory(p)
        if (!subcategory || !filters.subcategory.includes(subcategory)) return false
      }
      if (filters.pharmacyCategory.length) {
        const pharmacyCategory = getPharmacyCategory(p)
        if (!pharmacyCategory || !filters.pharmacyCategory.includes(pharmacyCategory)) return false
      }
      if (filters.pharmacyOnly && !getPharmacyCategory(p)) return false
      if (filters.breed.length) {
        const breeds = getBreeds(p)
        if (!filters.breed.some((b) => breeds.includes(b))) return false
      }
      if (filters.brand.length) {
        const brand = getBrand(p)
        if (!brand || !filters.brand.includes(brand)) return false
      }
      if (filters.priceRange) {
        const range = PRICE_RANGES.find((r) => r.id === filters.priceRange)
        const price = getCheapestPrice(p)
        if (range && (price === null || price < range.min || price > range.max)) return false
      }
      if (filters.minRating && getRating(p) < filters.minRating) return false
      if (filters.inStockOnly && !getInStock(p)) return false
      if (needle && !p.title.toLowerCase().includes(needle)) return false
      return true
    })
    return [...list].sort(SORT_COMPARATORS[sort])
  }, [products, filters, searchQuery, sort])

  // Reset pagination whenever the result set would change under it.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filters, searchQuery, sort])

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const hasMore = visibleCount < filteredProducts.length

  const loadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE)
      setIsLoadingMore(false)
    }, 400)
  }

  const activePetLabel =
    filters.petType.length === 1
      ? PET_TYPE_OPTIONS.find((o) => o.value === filters.petType[0])?.label
      : null

  // Deepest single-selection wins so the trail reads like the mega menu path
  // that would have produced it (Pharmacy takes priority since it's the
  // cross-species branch of the taxonomy). Multi-select combinations don't
  // get a deep trail — there's no one path that represents "3 categories at
  // once" — so they fall back to the plain "Products" crumb.
  const breadcrumbItems = (() => {
    const base = [{ label: "Home", href: "/" }]

    if (filters.pharmacyCategory.length === 1) {
      const found = findItemWithCategory(pharmacyMenu, filters.pharmacyCategory[0])
      return [
        ...base,
        { label: "Pharmacy", href: "/products?pharmacy=" },
        ...(found ? [{ label: found.categoryLabel }, { label: found.itemLabel }] : []),
      ]
    }

    if (filters.subcategory.length === 1 && activePetLabel) {
      const menu = filters.petType[0] === "dogs" ? dogsMenu : catsMenu
      const found = findItemWithCategory(menu, filters.subcategory[0])
      return [
        ...base,
        { label: activePetLabel, href: `/products?pet=${filters.petType[0]}` },
        ...(found ? [{ label: found.categoryLabel }, { label: found.itemLabel }] : []),
      ]
    }

    if (filters.pharmacyOnly) {
      return [...base, { label: "Pharmacy" }]
    }

    if (filters.breed.length === 1) {
      const breedLabel = BREEDS.find((b) => b.slug === filters.breed[0])?.name ?? filters.breed[0]
      return [...base, { label: "Shop By Breed", href: "/products?pet=dogs" }, { label: breedLabel }]
    }

    return [
      ...base,
      activePetLabel ? { label: "Products", href: "/products" } : { label: "Products" },
      ...(activePetLabel ? [{ label: activePetLabel }] : []),
    ]
  })()

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-8">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-kudl-ink md:text-3xl">All Products</h1>
        <p className="mt-1 text-sm text-kudl-muted">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
        </p>
      </div>

      <label className="mb-4 flex h-12 items-center gap-2 rounded-full border border-kudl-hairline px-4">
        <Search className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
        <span className="sr-only">Search products</span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for food, toys, treats..."
          className="w-full bg-transparent text-sm text-kudl-ink outline-none placeholder:text-kudl-faint"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="shrink-0 text-kudl-faint"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
      </label>

      <div className="mb-4 flex items-center gap-2 xl:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full border border-kudl-hairline px-4 py-2 text-sm font-semibold text-kudl-body"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeFilterCount(filters) > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-kudl-primary px-1 text-[11px] font-bold text-white">
              {activeFilterCount(filters)}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <SortDropdown value={sort} onChange={setSort} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <FilterChips filters={filters} onChange={setFilters} />

      <div className="flex items-start gap-6">
        <FilterSidebar products={products} filters={filters} onChange={setFilters} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 hidden items-center justify-end gap-2 xl:flex">
            <SortDropdown value={sort} onChange={setSort} />
            <ViewToggle value={view} onChange={setView} />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-24">
              <Spinner className="h-8 w-8 text-kudl-primary" label="Loading collection" />
              <p className="mt-3 text-sm text-kudl-muted">Loading collection...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState onClearFilters={() => setFilters(EMPTY_FILTERS)} />
          ) : view === "grid" ? (
            <ProductGrid products={visibleProducts} onQuickView={setQuickViewProduct} />
          ) : (
            <ul className="transition-opacity duration-200">
              {visibleProducts.map((product) => (
                <ProductListItem key={product.id} product={product} />
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-full border border-kudl-hairline px-6 py-2.5 text-sm font-semibold text-kudl-body hover:border-kudl-primary hover:text-kudl-primary disabled:opacity-60"
              >
                {isLoadingMore && <Spinner className="h-4 w-4" label="Loading more" />}
                Load More Products
              </button>
            </div>
          )}
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        products={products}
        filters={filters}
        onChange={setFilters}
        resultCount={filteredProducts.length}
      />

      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      )}
    </div>
  )
}

/**
 * useSearchParams needs a Suspense boundary so the rest of the route can be
 * prerendered rather than bailing out to fully-dynamic rendering.
 */
export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      }
    >
      <ProductsView />
    </Suspense>
  )
}
