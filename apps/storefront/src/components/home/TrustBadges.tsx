/**
 * Extracted from the homepage's inline trust-badge strip so ShopByBreed can
 * sit between it and Shop by Pet without page.tsx turning into one long file.
 */

import { Truck, Shield, RefreshCw, Headphones } from "@/components/icons"
import {
  FREE_DELIVERY_SUB,
  FREE_DELIVERY_SHORT,
  FREE_DELIVERY_COUPON,
  FREE_DELIVERY_MIN_SUBTOTAL,
} from "@/lib/config"

const BADGES = [
  { Icon: Truck, label: "Free Delivery", sub: FREE_DELIVERY_SUB },
  { Icon: Shield, label: "100% Genuine", sub: "Vet approved" },
  { Icon: RefreshCw, label: "Easy Returns", sub: "7 day policy" },
  { Icon: Headphones, label: "24/7 Support", sub: "Always here to help" },
]

export default function TrustBadges() {
  return (
    <section className="mt-5 md:mt-10">
      <div className="grid grid-cols-2 gap-y-4 rounded-2xl border border-kudl-border bg-white py-3.5 md:grid-cols-4 md:gap-y-0 md:py-6">
        {BADGES.map(({ Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center px-1 text-center">
            <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-kudl-tint">
              <Icon className="h-[17px] w-[17px] text-kudl-primary" aria-hidden="true" />
            </span>
            <p className="text-xs font-bold text-kudl-ink md:text-sm">{label}</p>
            <p className="mt-px text-[10.5px] text-kudl-faint md:text-xs">{sub}</p>
          </div>
        ))}
      </div>

      {/*
        Free delivery is coupon-gated, not automatic — the backend seeds flat
        ₹99/₹199 shipping. Spelling out the code here keeps the badge above
        honest about what actually happens at checkout.
      */}
      <p className="mt-2 text-center text-[11px] text-kudl-faint">
        Free delivery applies with code{" "}
        <span className="font-semibold text-kudl-muted">{FREE_DELIVERY_COUPON}</span>{" "}
        on orders above ₹{FREE_DELIVERY_MIN_SUBTOTAL}. {FREE_DELIVERY_SHORT} is
        entered at checkout.
      </p>
    </section>
  )
}
