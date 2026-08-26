import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getCouponRule } from "../../../lib/coupon-rules"

/**
 * Lists the coupons a customer can choose from at checkout.
 *
 * Medusa has no store-facing promotions endpoint — promotions are admin-only,
 * because exposing them wholesale would leak unlaunched campaigns. This route is
 * the deliberate, narrow exception: it returns only promotions that are already
 * active AND code-based, plus whether the given cart currently qualifies.
 *
 * Automatic promotions are excluded on purpose. They are not coupons: Medusa
 * applies them by itself, they have no code to enter, and listing them would
 * offer the customer a button that does nothing.
 *
 * This endpoint is the ONLY source the clients use to decide which coupons
 * exist. Nothing in the storefront or the app hardcodes a coupon code, so a
 * promotion created in the admin dashboard appears on the site by itself, and
 * one deleted there stops being advertised — including in the homepage and cart
 * copy, which read the delivery coupon off `target_type` below.
 */

type ApplicationMethod = {
  type?: string
  target_type?: string
  allocation?: string
  value?: number
  apply_to_quantity?: number
  buy_rules_min_quantity?: number
  currency_code?: string
}

/**
 * Turns a promotion's application method into customer-facing copy. A coupon
 * listed in `COUPON_RULES` with a `description` overrides this — hand-written
 * copy always beats a generated label.
 */
const describe = (
  code: string,
  am: ApplicationMethod | undefined
): { title: string; detail: string } => {
  const value = Number(am?.value ?? 0)
  const isPercent = am?.type === "percentage"
  const amount = isPercent ? `${value}%` : `₹${value}`

  switch (am?.target_type) {
    case "shipping_methods":
      return value >= 100 && isPercent
        ? { title: "Free delivery", detail: "No delivery charge on this order" }
        : { title: `${amount} off delivery`, detail: "Discount on delivery charge" }

    case "items": {
      // A 100%-off-items promotion with a buy/get quantity is a BxGy offer.
      const buy = Number(am?.buy_rules_min_quantity ?? 0)
      const get = Number(am?.apply_to_quantity ?? 0)
      if (isPercent && value >= 100 && buy > 0 && get > 0) {
        return {
          title: `Buy ${buy} Get ${get} Free`,
          detail: `Add ${buy + get} items to get ${get} free`,
        }
      }
      return { title: `${amount} off items`, detail: "Discount on eligible products" }
    }

    case "order":
      return {
        title: `${amount} off your order`,
        detail: "Discount on your order total",
      }

    default:
      return { title: code, detail: "Discount on this order" }
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const cartId = req.query.cart_id as string | undefined

  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: [
      "id",
      "code",
      "status",
      "is_automatic",
      "application_method.type",
      "application_method.target_type",
      "application_method.allocation",
      "application_method.value",
      "application_method.apply_to_quantity",
      "application_method.buy_rules_min_quantity",
      "application_method.currency_code",
    ],
    filters: { status: "active", is_automatic: false },
  })

  // The cart is optional: without one we can still list coupons, just without
  // per-cart eligibility. With one, the customer sees exactly how much more they
  // need to spend rather than discovering it only after tapping Apply.
  let subtotal: number | null = null
  // Total units in the cart, counting quantity — so two of one product counts
  // as two. This is what a Buy-x-Get-y offer is really gated on.
  let itemCount: number | null = null
  let appliedCodes: string[] = []

  if (cartId) {
    const { data: carts } = await query.graph({
      entity: "cart",
      // item_subtotal is the value of the goods BEFORE any discount. item_total is
      // net of item-level discounts, so a Buy-1-Get-1 already on the cart would
      // shrink it and make the customer look ineligible for a minimum they meet.
      fields: [
        "id",
        "item_subtotal",
        "items.quantity",
        "promotions.code",
        "promotions.is_automatic",
      ],
      filters: { id: cartId },
    })
    const cart = carts?.[0]
    if (cart) {
      subtotal = Number(cart.item_subtotal ?? 0)
      itemCount = (cart.items ?? []).reduce(
        (sum: number, i: any) => sum + Number(i?.quantity ?? 0),
        0
      )
      appliedCodes = (cart.promotions ?? [])
        .filter((p: any) => p?.code && !p.is_automatic)
        .map((p: any) => String(p.code))
    }
  }

  const coupons = (promotions ?? [])
    .filter((p: any) => p?.code)
    .map((p: any) => {
      const code = String(p.code)
      const rule = getCouponRule(code)
      const am = p.application_method
      const generated = describe(code, am)
      const minSubtotal = rule?.minSubtotal ?? 0

      /*
       * A Buy-x-Get-y offer needs x+y units in the cart before Medusa's engine
       * can discount anything. Without this the coupon looked freely available
       * and only failed on Apply with "does not apply to the items in your
       * cart", which reads as a broken coupon rather than as "you need one more
       * item". Derived from the promotion's own quantities, so an offer edited
       * in the admin from B1G1 to B2G1 updates here with no code change.
       */
      const buyQty = Number(am?.buy_rules_min_quantity ?? 0)
      const getQty = Number(am?.apply_to_quantity ?? 0)
      const minItems = buyQty > 0 && getQty > 0 ? buyQty + getQty : 0

      const meetsSubtotal = subtotal === null || subtotal >= minSubtotal
      const meetsItems = itemCount === null || itemCount >= minItems
      const eligible = meetsSubtotal && meetsItems

      const shortfall =
        subtotal !== null && !meetsSubtotal ? minSubtotal - subtotal : 0
      const itemShortfall =
        itemCount !== null && !meetsItems ? minItems - itemCount : 0

      return {
        code,
        title: generated.title,
        // Hand-written copy from COUPON_RULES wins over the generated label.
        description: rule?.description ?? generated.detail,
        min_subtotal: minSubtotal,
        /** Units required in the cart; 0 when the coupon has no item requirement. */
        min_items: minItems,
        eligible,
        shortfall,
        /** How many more units the customer must add; 0 when satisfied. */
        item_shortfall: itemShortfall,
        applied: appliedCodes.includes(code),
        // What the discount acts on: "shipping_methods", "items" or "order".
        // Exposed so a client can find, say, the free-delivery coupon without
        // string-matching the generated title — which is what lets the homepage
        // and cart advertise whatever delivery coupon actually exists in Medusa
        // instead of hardcoding a code that may have been deleted.
        target_type: p.application_method?.target_type ?? null,
      }
    })
    // Eligible coupons first, then the biggest minimums last — the customer sees
    // what they can use immediately without scrolling past what they cannot.
    .sort((a, b) =>
      a.eligible === b.eligible
        ? a.min_subtotal - b.min_subtotal
        : a.eligible
        ? -1
        : 1
    )

  res.json({ coupons, cart_subtotal: subtotal })
}
