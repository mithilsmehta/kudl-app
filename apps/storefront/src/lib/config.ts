/**
 * Static presentation config. Nothing here duplicates Medusa data — products,
 * prices, categories, carts and orders all come from the Store API.
 */

/**
 * Free delivery is NOT automatic. The backend seeds Standard (₹99) and Express
 * (₹199) as unconditional flat rates (see backend seed-kudl-pets.ts), so no
 * cart total earns free shipping on its own. The only free delivery is the
 * KUDLFREE1000 coupon, which the backend gates on a ₹1000 item subtotal
 * (see backend src/lib/coupon-rules.ts).
 *
 * Both values below therefore mirror that coupon rule. If the coupon changes in
 * the backend, change it here — never advertise a threshold checkout won't honour.
 */
export const FREE_DELIVERY_COUPON = "KUDLFREE1000"
export const FREE_DELIVERY_MIN_SUBTOTAL = 1000

export const FREE_DELIVERY_SHORT = `Code ${FREE_DELIVERY_COUPON}`
export const FREE_DELIVERY_SUB = `Above ₹${FREE_DELIVERY_MIN_SUBTOTAL}`

/**
 * Visual treatment per pet category, keyed by the category name from Medusa.
 * Ported from PET_THEMES in the mobile home screen. A category with no entry
 * falls back to the neutral grey treatment.
 */
export const PET_THEMES: Record<string, { to: string; tagline: string }> = {
  Dogs: { to: "#1e40af", tagline: "Food, toys & care" },
  Cats: { to: "#d97706", tagline: "Treats & essentials" },
  Pharmacy: { to: "#047857", tagline: "Vet-trusted care" },
}

export const PET_THEME_FALLBACK = { to: "#4b5563", tagline: "Explore range" }
