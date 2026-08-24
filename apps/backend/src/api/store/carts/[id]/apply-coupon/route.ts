import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  PromotionActions,
} from "@medusajs/framework/utils"
import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { getCouponRule } from "../../../../../lib/coupon-rules"

type ApplyCouponBody = {
  code?: string
}

/**
 * Applies a coupon to a cart after checking the conditions Medusa cannot express
 * natively (currently: a minimum cart subtotal).
 *
 * Validation happens here rather than in the mobile app so the rule cannot be
 * bypassed by a modified client.
 */
const CART_FIELDS = [
  "id",
  "item_total",
  // Pre-discount goods value. The minimum-order rule is judged on this so that a
  // discount already on the cart cannot push the customer below a threshold they
  // genuinely meet.
  "item_subtotal",
  "shipping_total",
  "discount_total",
  "total",
  "currency_code",
  "promotions.code",
]

/** Reads the cart in the shape the clients expect back. */
async function readCart(query: any, cartId: string) {
  const { data } = await query.graph({
    entity: "cart",
    fields: CART_FIELDS,
    filters: { id: cartId },
  })
  return data?.[0]
}

/** Codes the customer entered themselves — automatic promotions excluded. */
async function customerCodes(query: any, cartId: string): Promise<string[]> {
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "promotions.code", "promotions.is_automatic"],
    filters: { id: cartId },
  })
  return (data?.[0]?.promotions ?? [])
    .filter((p: any) => p?.code && !p.is_automatic)
    .map((p: any) => String(p.code))
}

const setPromotions = (
  scope: any,
  cartId: string,
  codes: string[],
  action: any
) =>
  codes.length
    ? updateCartPromotionsWorkflow(scope).run({
        input: { cart_id: cartId, promo_codes: codes, action },
      })
    : Promise.resolve()

export async function POST(
  req: MedusaRequest<ApplyCouponBody>,
  res: MedusaResponse
) {
  const cartId = req.params.id
  const rawCode = req.body?.code

  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter a coupon code.")
  }

  const code = rawCode.trim().toUpperCase()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // 1. The coupon must exist and be active.
  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: ["id", "code", "status"],
    filters: { code },
  })

  const promotion = promotions?.[0]
  if (!promotion) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `"${code}" is not a valid coupon code.`
    )
  }

  if (promotion.status && promotion.status !== "active") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Coupon "${code}" is no longer active.`
    )
  }

  // 2. Applying the coupon that is already on the cart is a no-op, not an error.
  //    Without this, re-tapping the same coupon would look like "no benefit" in
  //    step 5 and strip the discount the customer already had.
  const applied = await customerCodes(query, cartId)
  if (applied.includes(code)) {
    res.json({ cart: await readCart(query, cartId), applied: code, replaced: [] })
    return
  }

  // 3. Only one customer-entered coupon may be active at a time. Drop the
  //    previous one BEFORE evaluating the minimum, so the minimum is judged on
  //    the real cart value rather than a value another coupon already discounted
  //    (a Buy-1-Get-1 lowers item_total, which would otherwise make the customer
  //    look ineligible for a minimum they actually meet).
  //
  //    Automatic promotions are left alone: Medusa re-adds those by itself.
  const displaced = applied.filter((c) => c !== code)
  await setPromotions(req.scope, cartId, displaced, PromotionActions.REMOVE)

  /** Puts back whatever we displaced, so a failed attempt costs the customer nothing. */
  const restore = () =>
    setPromotions(req.scope, cartId, displaced, PromotionActions.ADD)

  const baseline = await readCart(query, cartId)
  const totalBefore = Number(baseline?.total ?? 0)

  // 4. Enforce our own minimum-subtotal condition.
  const rule = getCouponRule(code)
  if (rule?.minSubtotal) {
    const subtotal = Number(baseline?.item_subtotal ?? 0)
    if (subtotal < rule.minSubtotal) {
      await restore()
      const shortfall = rule.minSubtotal - subtotal
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Coupon "${code}" needs a minimum order of \u20b9${rule.minSubtotal}. ` +
          `Add \u20b9${shortfall} more to use it.`
      )
    }
  }

  // 5. Hand off to Medusa's promotion engine to compute the actual discount.
  await setPromotions(req.scope, cartId, [code], PromotionActions.ADD)

  const cartAfter = await readCart(query, cartId)

  // 6. A promotion can be active, in date, and still do nothing — its target
  //    rules may not match anything in this cart (e.g. a Buy-1-Get-1 restricted
  //    to a product the customer hasn't added). Medusa reports that as a
  //    successful apply with a zero discount, which reads to the customer as a
  //    coupon that "worked" but changed no price. Detect it, undo it, and say so.
  if (Number(cartAfter?.total ?? 0) >= totalBefore) {
    await setPromotions(req.scope, cartId, [code], PromotionActions.REMOVE)
    await restore()
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Coupon "${code}" does not apply to the items in your cart.`
    )
  }

  res.json({ cart: cartAfter, applied: code, replaced: displaced })
}

/**
 * Removes a coupon from the cart. No conditions to check on the way out.
 */
export async function DELETE(
  req: MedusaRequest<ApplyCouponBody>,
  res: MedusaResponse
) {
  const cartId = req.params.id
  const code = (req.query.code as string)?.trim().toUpperCase()

  if (!code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Specify which coupon to remove."
    )
  }

  await updateCartPromotionsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      promo_codes: [code],
      action: PromotionActions.REMOVE,
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: updated } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "item_total",
      "shipping_total",
      "discount_total",
      "total",
      "currency_code",
      "promotions.code",
    ],
    filters: { id: cartId },
  })

  res.json({ cart: updated?.[0], removed: code })
}
