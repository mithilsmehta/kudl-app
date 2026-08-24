"use client"

/**
 * Shopping Cart — port of apps/mobile/app/(tabs)/cart.tsx.
 *
 * The app's summary panel is pinned to the bottom of the screen; on md+ it
 * becomes a sticky sidebar beside the line items. Totals mirror the app: the
 * subtotal is summed from line items and shipping is deferred to checkout,
 * because no shipping method is attached to the cart at this point.
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
} from "@/components/icons"
import { CartItem } from "@/lib/api"
import { formatCurrency } from "@/lib/currency"
import { useCart } from "@/context/CartContext"
import { useAuth } from "@/context/AuthContext"
import ProductImage from "@/components/ProductImage"
import ScreenHeader from "@/components/ScreenHeader"
import Spinner from "@/components/Spinner"
import { FREE_DELIVERY_COUPON, FREE_DELIVERY_MIN_SUBTOTAL } from "@/lib/config"

export default function CartPage() {
  const router = useRouter()
  const { cart, itemCount, isLoading, updateQuantity, removeItem } = useCart()
  const { user } = useAuth()

  const handleCheckout = () => {
    // Checkout needs a customer for saved addresses and order history.
    router.push(user ? "/checkout" : "/login?next=/checkout")
  }

  const formatAmount = (amount: number) =>
    formatCurrency(amount, cart?.currency_code)

  const subtotal =
    cart?.items?.reduce(
      (acc, item) => acc + item.unit_price * item.quantity,
      0
    ) ?? 0

  if (isLoading && !cart) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading cart" />
      </div>
    )
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div>
        <ScreenHeader title="Shopping Cart" />
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <ShoppingCart className="h-16 w-16 text-kudl-hairline" aria-hidden="true" />
          <p className="mt-4 text-xl font-bold text-kudl-ink">
            Your cart is empty
          </p>
          <p className="mt-2 max-w-sm text-sm text-kudl-muted">
            Looks like you haven&apos;t added any products to your cart yet.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-xl bg-kudl-primary px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-kudl-dark"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  const renderItem = (item: CartItem) => (
    <li
      key={item.id}
      className="flex gap-3 rounded-xl border border-kudl-border bg-white p-3"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-kudl-surface">
        <ProductImage
          src={item.thumbnail}
          alt={item.title}
          sizes="80px"
          iconClassName="h-6 w-6"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <p className="line-clamp-2 text-sm font-semibold text-kudl-ink">
          {item.title}
        </p>
        <p className="text-[15px] font-bold text-kudl-success">
          {formatAmount(item.unit_price)}
        </p>

        <div className="mt-1.5 flex items-center justify-between">
          <div className="inline-flex items-center rounded-md border border-kudl-hairline">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              aria-label={`Decrease quantity of ${item.title}`}
              className="p-1.5 text-kudl-body"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="px-2.5 text-sm font-semibold text-kudl-ink">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              aria-label={`Increase quantity of ${item.title}`}
              className="p-1.5 text-kudl-body"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.title} from cart`}
            className="p-1.5 text-kudl-danger"
          >
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )

  const summary = (
    <div className="border-t border-kudl-border bg-white p-5 md:rounded-kudl-card md:border">
      <div className="mb-2 flex justify-between">
        <span className="text-sm text-kudl-muted">
          Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
        </span>
        <span className="text-sm font-semibold text-kudl-ink">
          {formatAmount(subtotal)}
        </span>
      </div>
      <div className="mb-2 flex justify-between">
        <span className="text-sm text-kudl-muted">Shipping</span>
        <span className="text-sm font-semibold text-kudl-ink">
          Calculated at checkout
        </span>
      </div>
      <div className="mb-4 mt-1 flex justify-between border-t border-kudl-divider pt-3">
        <span className="text-base font-bold text-kudl-ink">Total</span>
        <span className="text-lg font-bold text-kudl-primary">
          {formatAmount(subtotal)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark"
      >
        Proceed to Checkout
        <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {/* Only surfaced when the coupon could actually apply, so it reads as useful, not as an upsell. */}
      {subtotal >= FREE_DELIVERY_MIN_SUBTOTAL && (
        <p className="mt-3 text-center text-[11px] text-kudl-muted">
          Your subtotal qualifies for free delivery — enter{" "}
          <span className="font-semibold text-kudl-ink">{FREE_DELIVERY_COUPON}</span>{" "}
          at checkout.
        </p>
      )}
    </div>
  )

  return (
    <div>
      <ScreenHeader title="Shopping Cart" />

      <div className="mx-auto max-w-6xl md:px-6 md:pb-16">
        <div className="md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-8">
          <ul className="space-y-3 p-4 md:p-0">
            {cart.items.map(renderItem)}
          </ul>

          {/* Mobile: pinned above the tab bar. Desktop: sticky sidebar. */}
          <div className="fixed bottom-[60px] left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)] md:static md:bottom-auto md:top-24 md:pb-0 md:sticky">
            {summary}
          </div>
        </div>
      </div>

      {/* Spacer so the last line item isn't hidden behind the pinned summary. */}
      <div className="h-64 md:hidden" aria-hidden="true" />
    </div>
  )
}
