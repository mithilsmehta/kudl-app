"use client"

/**
 * "Frequently Bought Together" — co-purchase history for a product detail
 * page (Phase 2). Renders nothing while loading or once loaded with nothing
 * to show — there's no fallback for this one: an empty result just means
 * order history hasn't produced a co-purchase signal for this product yet.
 */

import { useEffect, useState } from "react"
import { Product } from "@/lib/api"
import { getFrequentlyBoughtTogether } from "@/lib/recommendations"
import ProductCard from "@/components/ProductCard"

export default function FrequentlyBoughtTogether({
  productId,
  title = "Frequently Bought Together",
}: {
  productId: string
  title?: string
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setIsLoading(true)
    getFrequentlyBoughtTogether(productId).then((together) => {
      if (cancelled) return
      setProducts(together)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (!isLoading && products.length === 0) return null

  return (
    <section className="mt-8 px-5 pb-8 md:px-0">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        {title}
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[1/1.5] animate-pulse rounded-[14px] bg-kudl-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
