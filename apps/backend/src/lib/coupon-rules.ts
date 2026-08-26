/**
 * Optional minimum-order conditions layered on top of Medusa's promotion engine.
 *
 * Coupons themselves are NOT defined here. Every coupon lives in Medusa and is
 * created and deleted in the admin dashboard — create one there and it appears
 * on the site, delete it and it disappears. `GET /store/coupons` is the single
 * source both clients read.
 *
 * This file exists only because of one gap that cannot be closed in Medusa
 * 2.19: there is no cart-total rule. A promotion rule can match on customer
 * group, region, country, sales channel, currency, product, category,
 * collection, type and tag — but not on "cart is worth at least X". The admin
 * API's CreatePromotion schema is `.strict()` and has no `metadata` field
 * either, so the threshold cannot be attached to the promotion from the
 * dashboard. It therefore lives here and is enforced by
 * `POST /store/carts/:id/apply-coupon`.
 *
 * This map is keyed by coupon code and is purely additive:
 *   - A code listed here gets a minimum. Nothing else.
 *   - A code NOT listed here works fine and simply has no minimum.
 *   - A code listed here whose promotion has been deleted from Medusa is inert.
 *     It is not a coupon; the entry is ignored because the coupon list and the
 *     apply route both start from Medusa.
 *
 * So adding a coupon needs no change here unless you want a minimum on it.
 *
 * Amounts are in the cart's currency, in major units (1000 = ₹1000).
 */
export type CouponRule = {
  /** Cart item subtotal (excluding shipping) required before the coupon applies. */
  minSubtotal?: number
  /** Shown to the customer when the minimum is not met. */
  description?: string
}

export const COUPON_RULES: Record<string, CouponRule> = {
  KUDLFREE1000: {
    minSubtotal: 1000,
    description: "Free delivery on orders of ₹1000 or more",
  },
}

export const getCouponRule = (code: string): CouponRule | undefined =>
  COUPON_RULES[code.trim().toUpperCase()]
