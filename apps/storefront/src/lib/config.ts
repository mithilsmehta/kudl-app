/**
 * Static presentation config. Nothing here duplicates Medusa data — products,
 * prices, categories, carts and orders all come from the Store API.
 */

/*
 * The free-delivery coupon used to be hardcoded here as FREE_DELIVERY_COUPON /
 * FREE_DELIVERY_MIN_SUBTOTAL. It is not any more: coupons live in Medusa, and a
 * constant here meant deleting the promotion in the admin left the site still
 * advertising a dead code. The homepage badge and cart hint now read the live
 * delivery coupon via lib/useDeliveryCoupon.ts. Do not reintroduce a coupon
 * code as a frontend constant.
 */

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
