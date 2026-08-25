"use client"

/**
 * "You May Also Like" — related products for a product detail page. Renders
 * nothing while loading or if the engine has no related products, rather than
 * showing an empty section.
 */

import { useEffect, useState } from "react"
import { Product } from "@/lib/api"
import { getRelatedProducts } from "@/lib/recommendations"
import ProductCard from "@/components/ProductCard"

export default function ProductRecommendations({
  productId,
  title = "You May Also Like",
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
    getRelatedProducts(productId).then((related) => {
      if (cancelled) return
      setProducts(related)
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
