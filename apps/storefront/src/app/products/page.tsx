"use client"

/**
 * All Products — port of apps/mobile/app/(tabs)/products.tsx.
 *
 * Search and category filtering are client-side over the full product list,
 * exactly as in the app. The `category` and `q` query params are honoured so
 * the home screen's pet tiles and the desktop nav search can deep-link in.
 */

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { Search, X, ShoppingBag } from "@/components/icons"
import { Product, getProducts, getCategories } from "@/lib/api"
import { trackEvent } from "@/lib/recommendations"
import ProductCard from "@/components/ProductCard"
import Spinner from "@/components/Spinner"

function ProductsView() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const queryParam = searchParams.get("q")

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Honour a category passed in from the home screen's "Shop by Pet" cards.
  useEffect(() => {
    setSelectedCategory(categoryParam || null)
  }, [categoryParam])

  // Honour a search term handed over by the desktop nav's search box.
  useEffect(() => {
    setSearchQuery(queryParam || "")
  }, [queryParam])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prods, cats] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
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

  const filteredProducts = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return products.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(needle)
      const matchesCat =
        !selectedCategory ||
        item.categories?.some((c) => c.id === selectedCategory)
      return matchesSearch && matchesCat
    })
  }, [products, searchQuery, selectedCategory])

  // Debounced so a track fires once the visitor pauses typing, not per keystroke.
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return
    const timeout = setTimeout(() => {
      trackEvent("search_performed", {
        metadata: { query, result_count: filteredProducts.length },
      })
    }, 600)
    return () => clearTimeout(timeout)
  }, [searchQuery, filteredProducts.length])

  const pills = [{ id: "all", name: "All" }, ...categories]

  return (
    <div>
      {/* Search header */}
      <div className="bg-white px-4 py-3 md:px-6 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-3 hidden text-2xl font-bold text-kudl-ink md:block">
            All Products
          </h1>
          <label className="flex h-11 items-center gap-2 rounded-xl bg-kudl-surface px-3">
            <Search className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food, toys, treats..."
              className="w-full bg-transparent text-[15px] text-kudl-ink outline-none placeholder:text-kudl-faint"
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
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="border-b border-kudl-divider bg-white pb-3">
          <div className="mx-auto max-w-6xl">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-6">
              {pills.map((item) => {
                const isSelected =
                  (item.id === "all" && !selectedCategory) ||
                  selectedCategory === item.id
                return (
                  <li key={item.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategory(item.id === "all" ? null : item.id)
                      }
                      aria-pressed={isSelected}
                      className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                        isSelected
                          ? "bg-kudl-primary text-white"
                          : "bg-kudl-surface text-kudl-subtle hover:bg-kudl-border"
                      }`}
                    >
                      {item.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <div className="flex flex-col items-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" label="Loading collection" />
          <p className="mt-3 text-sm text-kudl-muted">Loading collection...</p>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-3 py-3 md:px-6 md:py-6">
          {filteredProducts.length > 0 ? (
            <>
              <p className="mb-2.5 ml-1 text-[13px] font-medium text-kudl-muted">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
              </p>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
                {filteredProducts.map((item) => (
                  <li key={item.id}>
                    <ProductCard product={item} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center px-8 pt-20 text-center">
              <ShoppingBag className="h-12 w-12 text-kudl-hairline" aria-hidden="true" />
              <p className="mt-3 text-lg font-bold text-kudl-body">
                No products found
              </p>
              <p className="mt-1 text-[13px] text-kudl-muted">
                Try a different search or category.
              </p>
            </div>
          )}
        </div>
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
