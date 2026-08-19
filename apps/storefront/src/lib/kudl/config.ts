/**
 * KUDL Pets demo merchandising configuration.
 *
 * This is a thin presentation layer only. It never duplicates product data:
 * products, prices, variants, inventory, categories, cart and orders all come
 * from the Medusa Store API. This file only holds things Medusa has no opinion
 * about for this demo -- which handles to feature, local artwork per product
 * type, and static marketing copy. Replace any of it with CMS content later.
 */

/** Free-delivery threshold in rupees, used for the cart nudge and top bar. */
export const FREE_SHIPPING_THRESHOLD = 999

export const ANNOUNCEMENT =
  "Free shipping on orders above ₹999 • COD available across India"

/** Product handles surfaced in the homepage "Featured Products" rail. */
export const FEATURED_HANDLES = [
  "royal-canin-mini-adult",
  "pedigree-adult-dog-food",
  "whiskas-adult-cat-food",
  "interactive-cat-toy",
]

/**
 * Product handles surfaced in the homepage "Best Sellers" rail. Medusa has no
 * bestseller field, so ordering is configured here. Swap this for real sales
 * data (or a Medusa product tag) when that exists.
 */
export const BEST_SELLER_HANDLES = [
  "drools-puppy-food",
  "cat-litter-5kg",
  "dog-dental-chew",
  "whiskas-tuna-treats",
]

/**
 * Local artwork per product handle. Medusa products in this demo are seeded
 * without photography, so the storefront falls back to on-brand illustrations.
 * When real product images are uploaded in Medusa Admin, the Medusa thumbnail
 * wins automatically and these are no longer used.
 */
const PRODUCT_IMAGE_BY_HANDLE: Record<string, string> = {
  "pedigree-adult-dog-food": "/images/products/dog-food.svg",
  "royal-canin-mini-adult": "/images/products/dog-food.svg",
  "drools-puppy-food": "/images/products/dog-food.svg",
  "dog-dental-chew": "/images/products/dog-treat.svg",
  "rubber-dog-ball": "/images/products/dog-toy.svg",
  "dog-grooming-shampoo": "/images/products/dog-grooming.svg",
  "whiskas-adult-cat-food": "/images/products/cat-food.svg",
  "whiskas-tuna-treats": "/images/products/cat-treat.svg",
  "cat-litter-5kg": "/images/products/cat-litter.svg",
  "interactive-cat-toy": "/images/products/cat-toy.svg",
  "cat-grooming-brush": "/images/products/cat-grooming.svg",
}

export const PRODUCT_FALLBACK_IMAGE = "/images/products/placeholder.svg"

/**
 * Resolves the image to render for a product. Prefers whatever Medusa has, and
 * only falls back to local artwork when Medusa has no usable image.
 */
export const resolveProductImage = (product: {
  handle?: string | null
  thumbnail?: string | null
}): string => {
  const thumbnail = product.thumbnail

  // Ignore the seed's throwaway placeholder service so real uploads still win.
  const isSeedPlaceholder = thumbnail?.includes("placehold.co")

  if (thumbnail && !isSeedPlaceholder) {
    return thumbnail
  }

  return (
    (product.handle && PRODUCT_IMAGE_BY_HANDLE[product.handle]) ||
    PRODUCT_FALLBACK_IMAGE
  )
}

/** Reads the demo brand stamped onto product metadata by the backend seed. */
export const getProductBrand = (product: {
  metadata?: Record<string, unknown> | null
}): string | null => {
  const brand = product.metadata?.brand
  return typeof brand === "string" && brand.length ? brand : null
}

/** Quick-access menu shown behind the header menu button. */
export const MENU_LINKS = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Store", href: "/store", icon: "store" },
  { label: "Cart", href: "/cart", icon: "cart" },
  { label: "Account", href: "/account", icon: "account" },
] as const

/** Main navigation. `href` values are real routes in this app. */
export const NAV_LINKS = [
  { label: "Dogs", href: "/categories/dogs" },
  { label: "Cats", href: "/categories/cats" },
  { label: "Shop", href: "/shop" },
  { label: "Offers", href: "/shop?sortBy=price_asc" },
  { label: "Pet Care", href: "/#pet-care" },
]

/**
 * Category tiles on the homepage. Each `handle` must match a real Medusa
 * product category handle -- tiles whose category is missing from Medusa are
 * filtered out at render time so navigation never dead-ends.
 */
export const CATEGORY_TILES = [
  { handle: "dog-food", label: "Dog Food", icon: "/images/categories/food.svg" },
  {
    handle: "dog-treats",
    label: "Dog Treats",
    icon: "/images/categories/treats.svg",
  },
  { handle: "dog-toys", label: "Dog Toys", icon: "/images/categories/toys.svg" },
  {
    handle: "dog-grooming",
    label: "Dog Grooming",
    icon: "/images/categories/grooming.svg",
  },
  { handle: "cat-food", label: "Cat Food", icon: "/images/categories/food.svg" },
  {
    handle: "cat-treats",
    label: "Cat Treats",
    icon: "/images/categories/treats.svg",
  },
  { handle: "cat-toys", label: "Cat Toys", icon: "/images/categories/toys.svg" },
  {
    handle: "cat-litter",
    label: "Cat Litter",
    icon: "/images/categories/litter.svg",
  },
  {
    handle: "cat-grooming",
    label: "Cat Grooming",
    icon: "/images/categories/grooming.svg",
  },
]

/** Top-level pet filter. Handles must match real Medusa categories. */
export const PET_FILTERS = [
  { handle: "dogs", label: "Dogs" },
  { handle: "cats", label: "Cats" },
]

/**
 * Brand filter options. Brands live on Medusa product metadata (stamped by the
 * backend merchandising seed), so this list mirrors what the catalog contains.
 */
export const BRAND_OPTIONS = [
  "Royal Canin",
  "Pedigree",
  "Drools",
  "Whiskas",
  "KUDL",
]

/** Price buckets in rupees, applied to a product's cheapest variant price. */
export const PRICE_RANGES = [
  { key: "under-300", label: "Under ₹300", min: 0, max: 300 },
  { key: "300-700", label: "₹300 – ₹700", min: 300, max: 700 },
  { key: "700-1500", label: "₹700 – ₹1500", min: 700, max: 1500 },
  { key: "over-1500", label: "Over ₹1500", min: 1500, max: Number.MAX_SAFE_INTEGER },
]

export const TRUST_POINTS = [
  {
    title: "Genuine Products",
    description: "Sourced from authorised distributors only.",
    icon: "shield",
  },
  {
    title: "Secure Payments",
    description: "Encrypted checkout with trusted providers.",
    icon: "lock",
  },
  {
    title: "Fast Delivery",
    description: "Dispatched in 24 hours, shipped India-wide.",
    icon: "truck",
  },
  {
    title: "Pet-First Support",
    description: "Real people who own pets, ready to help.",
    icon: "heart",
  },
] as const

/**
 * Demo brand names for the "Popular Brands" strip. These are illustrative
 * placeholders for a demo storefront and do not imply any partnership,
 * endorsement, or authorised-retailer relationship.
 */
export const DEMO_BRANDS = [
  "Royal Canin",
  "Pedigree",
  "Drools",
  "Whiskas",
  "Farmina",
]

/** Static demo cards. No blog/CMS exists yet, so these do not link out. */
export const PET_CARE_TIPS = [
  {
    title: "How to Choose the Right Dog Food",
    excerpt:
      "Match protein, life stage and breed size so your dog gets what they actually need.",
    readTime: "4 min read",
  },
  {
    title: "Essential Supplies for a New Puppy",
    excerpt:
      "The short list of things worth buying before your puppy comes home.",
    readTime: "5 min read",
  },
  {
    title: "How to Choose the Right Cat Litter",
    excerpt:
      "Clumping, crystal or biodegradable -- what changes for you and your cat.",
    readTime: "3 min read",
  },
]

export const FOOTER_COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Dogs", href: "/categories/dogs" },
      { label: "Cats", href: "/categories/cats" },
      { label: "Dog Food", href: "/categories/dog-food" },
      { label: "Cat Food", href: "/categories/cat-food" },
      { label: "Treats", href: "/categories/dog-treats" },
      { label: "Toys", href: "/categories/dog-toys" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact Us", href: "/#" },
      { label: "Shipping", href: "/#" },
      { label: "Returns", href: "/#" },
      { label: "FAQs", href: "/#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About KUDL", href: "/#" },
      { label: "Pet Care", href: "/#pet-care" },
      { label: "Privacy", href: "/#" },
      { label: "Terms", href: "/#" },
    ],
  },
]
