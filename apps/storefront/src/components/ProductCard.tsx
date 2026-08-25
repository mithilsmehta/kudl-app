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
import { ShoppingBag } from "@/components/icons"
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

export default function ProductCard({ product }: { product: Product }) {
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
    <div className="group relative overflow-hidden rounded-[14px] border border-kudl-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[1/1.1] w-full bg-kudl-surface">
          <ProductImage
            src={product.thumbnail || product.images?.[0]?.url}
            alt={product.title}
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 240px"
          />
        </div>
        <div className="p-2.5">
          <p className="truncate text-[11px] font-medium uppercase text-kudl-faint">
            {product.categories?.[0]?.name || "Collection"}
          </p>
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
