"use client"

/**
 * Product detail — port of apps/mobile/app/product/[id].tsx.
 *
 * The app's paged image carousel becomes a snap-scrolling strip on mobile and a
 * main image with thumbnails on desktop. The app pins "Add to Cart" to the
 * bottom of the screen; that's kept on mobile and moves inline beside the
 * details on md+, where there's room.
 */

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Product, ProductVariant, getProductById } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { useCart } from "@/context/CartContext"
import {
  ShoppingBag,
  Minus,
  Plus,
  Check,
} from "@/components/icons"
import ProductImage from "@/components/ProductImage"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import ErrorBanner from "@/components/ErrorBanner"
import ProductRecommendations from "@/components/recommendations/ProductRecommendations"
import FrequentlyBoughtTogether from "@/components/recommendations/FrequentlyBoughtTogether"
import { trackEvent } from "@/lib/recommendations"

export default function ProductDetail({ id }: { id: string }) {
  const router = useRouter()
  const { addToCart, lineItemForVariant } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  )
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await getProductById(id)
        if (cancelled) return
        setProduct(data)
        if (data?.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0])
        }
        if (data) {
          trackEvent("product_viewed", { productId: data.id })
        }
      } catch (e) {
        console.log("Error loading product detail:", e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleAddToCart = async () => {
    if (!selectedVariant || !product) return
    setIsAdding(true)
    setError(null)
    try {
      await addToCart(selectedVariant.id, quantity, product.id)
      // No "Added!" timer any more. Once the variant is in the cart the button
      // becomes "Go to Cart" on its own, because it reads the cart rather than
      // a flag — which also means it still says "Go to Cart" when the customer
      // navigates back to this product later in the session.
    } catch (e: any) {
      setError(e?.message || "Could not add item to cart")
    } finally {
      setIsAdding(false)
    }
  }

  const formatPrice = () => {
    if (!selectedVariant) return "Price unavailable"
    const calc = selectedVariant.calculated_price
    if (calc?.calculated_amount) {
      return formatCurrency(calc.calculated_amount, calc.currency_code)
    }
    const price = selectedVariant.prices?.[0]
    if (price?.amount) {
      return formatCurrency(price.amount, price.currency_code)
    }
    return "Price unavailable"
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading product" />
      </div>
    )
  }

  if (!product) {
    return (
      <div>
        <ScreenHeader title="Product Details" fallbackHref="/products" />
        <p className="py-24 text-center text-base text-kudl-muted">
          Product not found.
        </p>
      </div>
    )
  }

  const images =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.url)
      : product.thumbnail
      ? [product.thumbnail]
      : []

  /*
   * One button with two jobs, chosen by whether the selected variant is already
   * in the cart. Deliberately keyed off real cart contents rather than a
   * just-added flag, which means it is correct on a fresh page load too — come
   * back to a product you added earlier and it still offers "Go to Cart"
   * instead of silently adding a second one.
   *
   * It tracks the variant, not the product: switching to a pack size that is
   * not in the cart goes back to "Add to Cart", because that size genuinely
   * hasn't been added.
   */
  const cartLine = selectedVariant ? lineItemForVariant(selectedVariant.id) : undefined
  const isInCart = Boolean(cartLine)

  const addToCartButton = (
    <button
      type="button"
      onClick={isInCart ? () => router.push("/cart") : handleAddToCart}
      disabled={isAdding || !selectedVariant}
      className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white transition-colors disabled:opacity-70 ${
        isInCart ? "bg-kudl-success hover:brightness-95" : "bg-kudl-primary hover:bg-kudl-dark"
      }`}
    >
      {isAdding ? (
        <Spinner className="h-5 w-5 text-white" label="Adding to cart" />
      ) : isInCart ? (
        <>
          <Check className="h-5 w-5" aria-hidden="true" />
          Go to Cart
          <span className="font-semibold opacity-90">
            ({cartLine!.quantity} in cart)
          </span>
        </>
      ) : (
        <>
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          Add to Cart
        </>
      )}
    </button>
  )

  return (
    <div className="bg-white">
      <ScreenHeader title="Product Details" fallbackHref="/products" />

      <div className="mx-auto max-w-6xl md:px-6 md:pb-16">
        <div className="md:grid md:grid-cols-2 md:gap-12">
          {/* ---- Images ---- */}
          <div className="md:pt-6">
            {images.length > 0 ? (
              <>
                {/* Mobile: full-bleed snap carousel, as in the app */}
                <ul className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:hidden">
                  {images.map((url, idx) => (
                    <li
                      key={idx}
                      className="relative aspect-[1/1.1] w-full shrink-0 snap-center bg-kudl-surface"
                    >
                      <ProductImage
                        src={url}
                        alt={`${product.title} — image ${idx + 1}`}
                        sizes="100vw"
                        priority={idx === 0}
                        iconClassName="h-12 w-12"
                      />
                    </li>
                  ))}
                </ul>

                {/* Desktop: one main image plus thumbnails */}
                <div className="hidden md:block">
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-kudl-surface">
                    <ProductImage
                      src={images[activeImage]}
                      alt={product.title}
                      sizes="(max-width: 1279px) 50vw, 560px"
                      priority
                      iconClassName="h-12 w-12"
                    />
                  </div>
                  {images.length > 1 && (
                    <ul className="mt-3 flex gap-3">
                      {images.map((url, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => setActiveImage(idx)}
                            aria-label={`Show image ${idx + 1}`}
                            aria-current={idx === activeImage}
                            className={`relative block h-20 w-20 overflow-hidden rounded-xl border-2 bg-kudl-surface ${
                              idx === activeImage
                                ? "border-kudl-primary"
                                : "border-transparent"
                            }`}
                          >
                            <ProductImage
                              src={url}
                              alt=""
                              sizes="80px"
                              iconClassName="h-5 w-5"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="relative flex aspect-[1/1.1] w-full items-center justify-center bg-kudl-surface md:aspect-square md:rounded-2xl">
                <ShoppingBag className="h-12 w-12 text-kudl-faint" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* ---- Details ---- */}
          <div className="px-5 pb-32 pt-5 md:px-0 md:pb-0 md:pt-6">
            <p className="text-xs font-semibold uppercase text-kudl-primary">
              {product.categories?.[0]?.name || "Collection"}
            </p>
            <h1 className="mt-1 text-[22px] font-bold text-kudl-ink md:text-3xl">
              {product.title}
            </h1>
            <p className="mt-2 text-xl font-bold text-kudl-success md:text-2xl">
              {formatPrice()}
            </p>

            {product.description && (
              <p className="mt-4 text-[15px] leading-[22px] text-kudl-subtle">
                {product.description}
              </p>
            )}

            {/* Variant selection */}
            {product.variants && product.variants.length > 1 && (
              <div className="mt-5">
                <p className="mb-2.5 text-sm font-semibold text-kudl-body">
                  Select Option
                </p>
                <ul className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id
                    return (
                      <li key={variant.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedVariant(variant)}
                          aria-pressed={isSelected}
                          className={`rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? "border-kudl-primary bg-kudl-tint font-bold text-kudl-primary"
                              : "border-kudl-hairline bg-white font-medium text-kudl-body hover:border-kudl-faint"
                          }`}
                        >
                          {variant.title}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5">
              <p className="mb-2.5 text-sm font-semibold text-kudl-body">
                Quantity
              </p>
              <div className="inline-flex items-center rounded-lg border border-kudl-hairline">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="p-2.5 text-kudl-body disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  className="min-w-[3rem] px-4 text-center text-base font-semibold text-kudl-ink"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="p-2.5 text-kudl-body"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <ErrorBanner message={error} />

            {/* Desktop: inline CTA. Mobile uses the pinned footer below. */}
            <div className="mt-7 hidden md:block">{addToCartButton}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl md:px-6">
        <FrequentlyBoughtTogether productId={product.id} />
        <ProductRecommendations productId={product.id} />
      </div>

      {/* Mobile pinned footer — sits above the tab bar */}
      <div className="fixed bottom-[60px] left-0 right-0 z-30 border-t border-kudl-border bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
        {addToCartButton}
      </div>
    </div>
  )
}
