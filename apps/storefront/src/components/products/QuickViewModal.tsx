"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Product } from "@/lib/api"
import { formatProductPrice } from "@/components/ProductCard"
import { useCart } from "@/context/CartContext"
import { getRating, getReviewCount } from "@/lib/productFacets"
import { X, Star, Minus, Plus, ShoppingBag } from "@/components/icons"
import ProductImage from "@/components/ProductImage"
import Spinner from "@/components/Spinner"

export default function QuickViewModal({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const variantId = product.variants?.[0]?.id
  // No tailwindcss-animate plugin in this app (see tailwind.config.js), so the
  // fade/scale-in is a plain mount-triggered transition instead of the
  // animate-in utility classes.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement
    closeButtonRef.current?.focus()
    const raf = requestAnimationFrame(() => setEntered(true))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [onClose])

  const quickAdd = async () => {
    if (!variantId) return
    setIsAdding(true)
    try {
      await addToCart(variantId, quantity, product.id)
      onClose()
    } catch (e) {
      console.log("Quick add error:", e)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${product.title} quick view`}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-kudl-card bg-white p-6 shadow-lg transition-all duration-200 ${
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="flex h-8 w-8 items-center justify-center rounded-full text-kudl-muted hover:bg-kudl-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-kudl-card bg-kudl-surface">
            <ProductImage
              src={product.thumbnail || product.images?.[0]?.url}
              alt={product.title}
              sizes="(max-width: 767px) 90vw, 400px"
            />
          </div>

          <div>
            <span className="inline-block rounded-full bg-kudl-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kudl-primary">
              {product.categories?.[0]?.name || "Collection"}
            </span>
            <h2 className="mt-2 text-xl font-bold text-kudl-ink">{product.title}</h2>

            <div className="mt-1 flex items-center gap-1 text-sm text-kudl-muted">
              <Star className="h-4 w-4 fill-kudl-amber-icon text-kudl-amber-icon" aria-hidden="true" />
              {getRating(product).toFixed(1)}
              <span className="text-kudl-faint">({getReviewCount(product)} reviews)</span>
            </div>

            <p className="mt-3 text-2xl font-bold text-kudl-primary">{formatProductPrice(product)}</p>

            {product.description && (
              <p className="mt-3 line-clamp-3 text-sm text-kudl-body">{product.description}</p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-kudl-hairline">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-9 w-9 items-center justify-center text-kudl-body"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="flex h-9 w-9 items-center justify-center text-kudl-body"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={quickAdd}
                disabled={isAdding || !variantId}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-kudl-primary py-2.5 text-sm font-semibold text-white hover:bg-kudl-dark disabled:opacity-60"
              >
                {isAdding ? (
                  <Spinner className="h-4 w-4 text-white" label="Adding to cart" />
                ) : (
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                )}
                Add to Cart
              </button>
            </div>

            <Link
              href={`/product/${product.id}`}
              className="mt-4 inline-block text-sm font-semibold text-kudl-primary hover:underline"
            >
              View Full Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
