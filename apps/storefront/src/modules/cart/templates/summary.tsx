"use client"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import FreeDeliveryNudge from "@modules/cart/components/free-delivery-nudge"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-5 rounded-xl border border-kudl-border bg-white p-6">
      <h2 className="text-lg font-semibold tracking-tight text-kudl-ink">
        Order Summary
      </h2>

      <FreeDeliveryNudge
        itemSubtotal={cart.item_subtotal ?? 0}
        currencyCode={cart.currency_code}
      />

      <DiscountCode cart={cart} />
      <Divider />
      <CartTotals totals={cart} />

      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-kudl-primary text-sm font-semibold text-white transition-colors hover:bg-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
      >
        Go to checkout
      </LocalizedClientLink>

      <p className="text-center text-xs text-kudl-muted">
        Secure checkout • COD available across India
      </p>
    </div>
  )
}

export default Summary
