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
        "promotions.code",
        "promotions.is_automatic",
      ],
      filters: { id: cartId },
    })
    const cart = carts?.[0]
    if (cart) {
      subtotal = Number(cart.item_subtotal ?? 0)
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
      const generated = describe(code, p.application_method)
      const minSubtotal = rule?.minSubtotal ?? 0

      const eligible = subtotal === null || subtotal >= minSubtotal
      const shortfall =
        subtotal !== null && !eligible ? minSubtotal - subtotal : 0

      return {
        code,
        title: generated.title,
        // Hand-written copy from COUPON_RULES wins over the generated label.
        description: rule?.description ?? generated.detail,
        min_subtotal: minSubtotal,
        eligible,
        shortfall,
        applied: appliedCodes.includes(code),
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
