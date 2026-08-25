"use client"

/**
 * Homepage "Recommended for You" — implements the Phase 8 fallback chain for
 * this widget: Personalized -> Popular. Renders nothing if both come back
 * empty (a brand-new store with no order history yet); the homepage's own
 * Featured Products section, always shown below this one, is what covers
 * that last case, so this widget doesn't duplicate it.
 */

import { useEffect, useState } from "react"
import { Product } from "@/lib/api"
import { getPersonalizedProducts, getPopularProducts } from "@/lib/recommendations"
import ProductCard from "@/components/ProductCard"

export default function PersonalizedRecommendations() {
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState("Recommended for You")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const personalized = await getPersonalizedProducts()
      if (cancelled) return
      if (personalized.length > 0) {
        setProducts(personalized)
        setTitle("Recommended for You")
        setIsLoading(false)
        return
      }

      const popular = await getPopularProducts()
      if (cancelled) return
      setProducts(popular)
      setTitle("Trending Now")
      setIsLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!isLoading && products.length === 0) return null

  return (
    <section className="mt-5 md:mt-10">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        {title}
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[1/1.5] animate-pulse rounded-[14px] bg-kudl-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
