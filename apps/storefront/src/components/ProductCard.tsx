"use client"

/**
 * Catalogue product card — the app's products-screen card. The quick-add button
 * is the app's circular blue bag button, and it deliberately does not navigate:
 * it adds the first variant straight to the cart.
 */

import Link from "next/link"
import { useState } from "react"
import { Product } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { useCart } from "@/context/CartContext"
import { useWishlist } from "@/context/WishlistContext"
import { ShoppingBag, Heart } from "@/components/icons"
import ProductImage from "@/components/ProductImage"
import Spinner from "@/components/Spinner"

export const formatProductPrice = (product: Product): string => {
  const calc = product.variants?.[0]?.calculated_price
  if (calc?.calculated_amount) {
    return formatCurrency(calc.calculated_amount, calc.currency_code)
  }
  const price = product.variants?.[0]?.prices?.[0]
  if (price?.amount) {
    return formatCurrency(price.amount, price.currency_code)
  }
  return "Price unavailable"
}

export default function ProductCard({
  product,
  onQuickView,
}: {
  product: Product
  onQuickView?: (product: Product) => void
}) {
  const { addToCart } = useCart()
  const { has, toggle } = useWishlist()
  const [isAdding, setIsAdding] = useState(false)
  const isWishlisted = has(product.id)

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
    <div className="group relative overflow-hidden rounded-[14px] border border-kudl-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          toggle(product.id)
        }}
        aria-pressed={isWishlisted}
        aria-label={
          isWishlisted
            ? `Remove ${product.title} from wishlist`
            : `Add ${product.title} to wishlist`
        }
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-kudl-muted shadow-sm transition-colors hover:text-kudl-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
      >
        <Heart
          className={`h-4 w-4 ${isWishlisted ? "fill-kudl-danger text-kudl-danger" : ""}`}
          aria-hidden="true"
        />
      </button>
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[1/1.1] w-full overflow-hidden bg-kudl-surface">
          <ProductImage
            src={product.thumbnail || product.images?.[0]?.url}
            alt={product.title}
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 240px"
            imageClassName="transition-transform duration-300 group-hover:scale-110"
          />
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onQuickView(product)
              }}
              className="absolute inset-x-2 bottom-2 hidden translate-y-1 rounded-full bg-white/95 py-1.5 text-xs font-semibold text-kudl-ink opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:block"
            >
              Quick View
            </button>
          )}
        </div>
        <div className="p-2.5">
          <span className="inline-block rounded-full bg-kudl-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kudl-primary">
            {product.categories?.[0]?.name || "Collection"}
          </span>
          <p className="mt-0.5 truncate text-sm font-semibold text-kudl-ink">
            {product.title}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <span className="text-sm font-bold text-kudl-primary">
          {formatProductPrice(product)}
        </span>
        <button
          type="button"
          onClick={quickAdd}
          disabled={isAdding || !variantId}
          aria-label={`Add ${product.title} to cart`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kudl-primary text-white transition-colors hover:bg-kudl-dark disabled:opacity-60"
        >
          {isAdding ? (
            <Spinner className="h-4 w-4 text-white" label="Adding to cart" />
          ) : (
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}
