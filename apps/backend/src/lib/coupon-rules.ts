/**
 * Extra conditions enforced on top of Medusa's own promotion engine.
 *
 * Medusa v2 promotion rules can only match on customer group, region, country,
 * sales channel and currency — there is no built-in "minimum cart value" rule, and
 * promotions do not accept metadata. So minimums live here and are enforced by
 * `POST /store/carts/:id/apply-coupon`.
 *
 * To add a coupon: create the promotion in the admin dashboard (or via the admin API),
 * then add its code here with the minimum subtotal it requires. A code that is not
 * listed has no minimum and is applied as long as Medusa accepts it.
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
