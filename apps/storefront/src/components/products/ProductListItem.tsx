"use client"

import Link from "next/link"
import { useState } from "react"
import { Product } from "@/lib/api"
import { formatProductPrice } from "@/components/ProductCard"
import { useCart } from "@/context/CartContext"
import { getRating, getReviewCount } from "@/lib/productFacets"
import { Star, ShoppingBag } from "@/components/icons"
import ProductImage from "@/components/ProductImage"
import Spinner from "@/components/Spinner"

export default function ProductListItem({ product }: { product: Product }) {
  const { addToCart } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const variantId = product.variants?.[0]?.id

  const quickAdd = async () => {
    if (!variantId) return
    setIsAdding(true)
    try {
      await addToCart(variantId, 1, product.id)
    } catch (e) {
      console.log("Quick add error:", e)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <li className="flex items-center gap-4 border-b border-kudl-divider py-4">
      <Link href={`/product/${product.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-kudl-surface">
        <ProductImage
          src={product.thumbnail || product.images?.[0]?.url}
          alt={product.title}
          sizes="96px"
        />
      </Link>

      <Link href={`/product/${product.id}`} className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-kudl-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kudl-primary">
          {product.categories?.[0]?.name || "Collection"}
        </span>
        <p className="mt-1 truncate text-sm font-semibold text-kudl-ink">{product.title}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-kudl-muted">
          <Star className="h-3.5 w-3.5 fill-kudl-amber-icon text-kudl-amber-icon" aria-hidden="true" />
          {getRating(product).toFixed(1)}
          <span className="text-kudl-faint">({getReviewCount(product)})</span>
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-bold text-kudl-primary">{formatProductPrice(product)}</span>
        <button
          type="button"
          onClick={quickAdd}
          disabled={isAdding || !variantId}
          className="flex items-center gap-1.5 rounded-full bg-kudl-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-kudl-dark disabled:opacity-60"
        >
          {isAdding ? (
            <Spinner className="h-3.5 w-3.5 text-white" label="Adding to cart" />
          ) : (
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Add
        </button>
      </div>
    </li>
  )
}
