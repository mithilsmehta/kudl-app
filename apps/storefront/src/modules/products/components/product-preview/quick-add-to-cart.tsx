"use client"

import { addToCart } from "@lib/data/cart"
import { Check, Loader2, ShoppingCart } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Add-to-cart control for a product card. Single-variant products are added to
 * the real Medusa cart straight from the grid; multi-variant products route to
 * the product page so the shopper picks a pack size instead of us guessing.
 */
const QuickAddToCart = ({
  variantId,
  productHandle,
  inStock,
  needsVariantChoice,
}: {
  variantId?: string
  productHandle: string
  inStock: boolean
  needsVariantChoice: boolean
}) => {
  const router = useRouter()
  const countryCode = useParams().countryCode as string
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (needsVariantChoice || !variantId) {
      router.push(`/${countryCode}/products/${productHandle}`)
      return
    }

    setIsAdding(true)
    try {
      await addToCart({ variantId, quantity: 1, countryCode })
      setAdded(true)
      window.setTimeout(() => setAdded(false), 2000)
    } finally {
      setIsAdding(false)
    }
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full h-10 rounded-lg border border-kudl-border bg-kudl-soft text-sm font-medium text-kudl-muted cursor-not-allowed"
      >
        Out of stock
      </button>
    )
  }

  const label = needsVariantChoice
    ? "Select options"
    : added
    ? "Added to cart"
    : "Add to Cart"

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isAdding}
      aria-label={`${label} - ${productHandle.replace(/-/g, " ")}`}
      className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-kudl-primary text-sm font-medium text-white transition-colors hover:bg-kudl-dark disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
    >
      {isAdding ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : added ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </button>
  )
}

export default QuickAddToCart
