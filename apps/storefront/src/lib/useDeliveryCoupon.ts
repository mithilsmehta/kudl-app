"use client"

/**
 * The live delivery coupon, or null when there isn't one.
 *
 * Free delivery is not automatic on this store: the backend seeds Standard
 * (₹99) and Express (₹199) as unconditional flat rates, so the only way a
 * customer gets free delivery is a coupon that targets shipping. The homepage
 * badge and the cart hint both need to name that coupon, and they used to do it
 * from a hardcoded `FREE_DELIVERY_COUPON = "KUDLFREE1000"` constant — which
 * meant deleting the promotion in the admin left the site still promising a code
 * that no longer worked, and renaming it left the site naming the wrong one.
 *
 * So this reads `GET /store/coupons`, which lists only active, code-based
 * promotions straight out of Medusa, and picks the one that targets shipping.
 * Create a delivery coupon in the dashboard and the copy appears; delete it and
 * the copy disappears. Nothing to change in the frontend either way.
 *
 * Returns null while loading as well as when no such coupon exists, because
 * both cases call for the same thing: render no promise at all. Never advertise
 * a threshold checkout won't honour.
 */

import { useEffect, useState } from "react"
import { Coupon, getCoupons } from "@/lib/api"

export function useDeliveryCoupon(): Coupon | null {
  const [coupon, setCoupon] = useState<Coupon | null>(null)

  useEffect(() => {
    let cancelled = false
    getCoupons()
      .then((coupons) => {
        if (cancelled) return
        // Lowest minimum first, so if there are several delivery coupons the one
        // advertised is the one most customers can actually reach.
        const delivery = coupons
          .filter((c) => c.target_type === "shipping_methods")
          .sort((a, b) => a.min_subtotal - b.min_subtotal)[0]
        setCoupon(delivery ?? null)
      })
      .catch(() => {
        // getCoupons already swallows and logs; this is belt-and-braces so a
        // failed fetch renders no promise rather than breaking the page.
        if (!cancelled) setCoupon(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return coupon
}
