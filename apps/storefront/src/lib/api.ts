/**
 * Medusa Store API client — the web counterpart of apps/mobile/src/services/api.ts.
 *
 * The two files are deliberately kept in step: same endpoints, same field
 * selections, same error handling, so the website and the app behave
 * identically against the same backend. Two things necessarily differ:
 *
 *   - Storage. The app uses AsyncStorage; the browser uses localStorage, which
 *     is synchronous but is wrapped in the same async signatures so the calling
 *     code (contexts, screens) ports over unchanged.
 *   - Backend URL. The app sniffs the Expo dev-server LAN IP so a phone can
 *     reach the dev machine. The browser goes through a same-origin proxy
 *     instead — see API_BASE_URL below.
 */

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "")

/**
 * Where the backend actually lives. Used for server-side calls, and as the
 * rewrite target in next.config.js.
 */
export const MEDUSA_BACKEND_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
)

/**
 * What the browser is told to call: a path on this origin, proxied to
 * MEDUSA_BACKEND_URL by the rewrite in next.config.js.
 *
 * This is deliberate and load-bearing. Calling the backend host directly from
 * the browser made the site depend on every visitor's DNS being willing to
 * resolve that host — and when a resolver refuses it (some phone hotspots,
 * captive-portal Wi-Fi, corporate or ad-blocking DNS), the page still loads and
 * simply shows no products, which looks like a broken deployment rather than a
 * network problem. Going through this origin means the only hostname the
 * visitor resolves is the one that already served them the page.
 *
 * Server-side rendering keeps the absolute URL, because `fetch("/store/...")`
 * has no origin to resolve against outside a browser.
 */
const API_BASE_URL =
  typeof window === "undefined" ? MEDUSA_BACKEND_URL : "/api/medusa"

const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const TOKEN_KEY = "@medusa_auth_token"
const CART_ID_KEY = "@medusa_cart_id"
const SESSION_ID_KEY = "@medusa_session_id"

/**
 * localStorage throws in a few real situations — Safari private mode, blocked
 * site data — and simply doesn't exist during server rendering. Both are
 * treated as "no stored value" rather than crashing the page.
 */
const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string | null): void => {
  if (typeof window === "undefined") return
  try {
    if (value) {
      window.localStorage.setItem(key, value)
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Non-fatal: the session just won't survive a reload.
  }
}

// Token Management
export const getStoredToken = async (): Promise<string | null> =>
  readStorage(TOKEN_KEY)

export const setStoredToken = async (token: string | null): Promise<void> => {
  writeStorage(TOKEN_KEY, token)
}

// Cart ID Management
export const getStoredCartId = async (): Promise<string | null> =>
  readStorage(CART_ID_KEY)

export const setStoredCartId = async (cartId: string | null): Promise<void> => {
  writeStorage(CART_ID_KEY, cartId)
}

// Anonymous Session ID — identifies a visitor with no customer account to the
// recommendation engine's event tracking. Generated once and reused for the
// life of the browser's localStorage, same lifecycle as the cart id.
export const getOrCreateSessionId = async (): Promise<string> => {
  const existing = readStorage(SESSION_ID_KEY)
  if (existing) return existing
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
  writeStorage(SESSION_ID_KEY, generated)
  return generated
}

// Fetch helper with headers
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getStoredToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_API_KEY
      ? { "x-publishable-api-key": PUBLISHABLE_API_KEY }
      : {}),
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return data as T
}

// ---- Medusa API Functions ----

// Products
export interface ProductVariant {
  id: string
  title: string
  sku?: string
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
  prices?: Array<{
    amount: number
    currency_code: string
  }>
}

export interface Product {
  id: string
  title: string
  handle?: string
  subtitle?: string
  description?: string
  thumbnail?: string
  images?: Array<{ id: string; url: string }>
  variants?: ProductVariant[]
  categories?: Array<{ id: string; name: string }>
  metadata?: Record<string, unknown> | null
  created_at?: string
}

let cachedRegionId: string | null = null

export const getDefaultRegionId = async (): Promise<string | undefined> => {
  if (cachedRegionId) return cachedRegionId
  const regions = await getRegions()
  const preferred = regions.find((r) => r.currency_code === "inr") || regions[0]
  cachedRegionId = preferred?.id || null
  return cachedRegionId || undefined
}

/**
 * Every scalar is named explicitly alongside the relations, and that is
 * load-bearing rather than verbose. Medusa's `fields` param switches from
 * "defaults plus these relations" to "only these" the moment a scalar column is
 * named — so listing `metadata` without also listing `description` and
 * `thumbnail` silently drops them from the response, and a product page renders
 * with no description at all. Keep this list in step with the Product interface
 * below.
 */
const PRODUCT_FIELDS =
  "fields=id,title,handle,subtitle,description,thumbnail,created_at,metadata," +
  "*variants,*variants.calculated_price,*images,*categories"

// The seeded catalog is 100 products (see the backend's seed-kudl-catalog.ts).
// An explicit limit well clear of that keeps Medusa's default page size from
// silently truncating the /products listing, without needing real server-side
// pagination yet — /products paginates client-side over the full set. Raise
// this before the catalog approaches it: truncation here is invisible, it just
// looks like products are missing.
const PRODUCT_LIST_LIMIT = 300

export const getProducts = async (): Promise<Product[]> => {
  try {
    const regionId = await getDefaultRegionId()
    const regionParam = regionId ? `&region_id=${regionId}` : ""
    const data = await apiRequest<{ products: Product[] }>(
      `/store/products?${PRODUCT_FIELDS}&limit=${PRODUCT_LIST_LIMIT}${regionParam}`
    )
    return data.products || []
  } catch (e) {
    console.log("Error fetching products:", e)
    return []
  }
}

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const regionId = await getDefaultRegionId()
    const regionParam = regionId ? `&region_id=${regionId}` : ""
    const data = await apiRequest<{ product: Product }>(
      `/store/products/${id}?${PRODUCT_FIELDS}${regionParam}`
    )
    return data.product || null
  } catch (e) {
    console.log(`Error fetching product ${id}:`, e)
    return null
  }
}

/**
 * Fetches multiple products by id in one request, preserving the order of
 * `ids` (Medusa's `id[]` filter does not guarantee response order). Used by
 * recommendation UI, which only ever gets product IDs back from the engine
 * and resolves them against Medusa for display data.
 */
export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  if (ids.length === 0) return []
  try {
    const regionId = await getDefaultRegionId()
    const regionParam = regionId ? `&region_id=${regionId}` : ""
    const idParams = ids.map((id) => `id[]=${encodeURIComponent(id)}`).join("&")
    const data = await apiRequest<{ products: Product[] }>(
      `/store/products?${PRODUCT_FIELDS}&${idParams}${regionParam}`
    )
    const byId = new Map((data.products || []).map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))
  } catch (e) {
    console.log("Error fetching products by ids:", e)
    return []
  }
}

/**
 * The top-level departments only — Dogs, Cats, Pharmacy.
 *
 * `parent_category_id=null` is load-bearing rather than tidiness. The backend
 * seed builds the full mega-menu taxonomy as a real three-level category tree
 * (see seed-kudl-catalog.ts), so an unfiltered call returns hundreds of
 * categories: every caller here wants the departments, and the endpoint's
 * default page size would otherwise truncate the list before "Dogs" was
 * reliably in it.
 */
export const getCategories = async (): Promise<
  Array<{ id: string; name: string }>
> => {
  try {
    const data = await apiRequest<{
      product_categories: Array<{ id: string; name: string }>
    }>("/store/product-categories?parent_category_id=null&limit=20")
    return data.product_categories || []
  } catch (e) {
    return []
  }
}

// Customer / Auth
export interface Customer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  company_name?: string
  created_at?: string
}

export const loginCustomer = async (
  email: string,
  password: string
): Promise<{ token: string; customer?: Customer }> => {
  const data = await apiRequest<{ token: string; customer?: Customer }>(
    "/auth/customer/emailpass",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  )
  if (data.token) {
    await setStoredToken(data.token)
  }
  return data
}

export const registerCustomer = async (details: {
  email: string
  password: string
  first_name?: string
  last_name?: string
}): Promise<{ token?: string; customer: Customer }> => {
  // Step 1: create the auth identity — this alone does not create a queryable customer record.
  const { token } = await apiRequest<{ token: string }>(
    "/auth/customer/emailpass/register",
    {
      method: "POST",
      body: JSON.stringify({
        email: details.email,
        password: details.password,
      }),
    }
  )
  await setStoredToken(token)

  // Step 2: create the customer record, linked to the auth identity via the bearer token.
  const { customer } = await apiRequest<{ customer: Customer }>(
    "/store/customers",
    {
      method: "POST",
      body: JSON.stringify({
        email: details.email,
        first_name: details.first_name,
        last_name: details.last_name,
      }),
    }
  )

  // Step 3: the registration token has no actor_id until the customer record exists, and it
  // isn't refreshed retroactively — re-login now to get a token actually scoped to this customer.
  const { token: scopedToken } = await loginCustomer(
    details.email,
    details.password
  )

  return { token: scopedToken, customer }
}

export const getCurrentCustomer = async (): Promise<Customer | null> => {
  try {
    const data = await apiRequest<{ customer: Customer }>(
      "/store/customers/me"
    )
    return data.customer || null
  } catch (e) {
    return null
  }
}

// Saved Addresses (India-only storefront — country is always "in")
export interface Address {
  id: string
  address_name?: string
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export type AddressInput = Omit<Address, "id" | "country_code">

export const getCustomerAddresses = async (): Promise<Address[]> => {
  try {
    const data = await apiRequest<{ addresses: Address[] }>(
      "/store/customers/me/addresses"
    )
    return data.addresses || []
  } catch (e) {
    return []
  }
}

export const createCustomerAddress = async (
  address: AddressInput
): Promise<Address[]> => {
  const data = await apiRequest<{ customer: { addresses: Address[] } }>(
    "/store/customers/me/addresses",
    {
      method: "POST",
      body: JSON.stringify({ ...address, country_code: "in" }),
    }
  )
  return data.customer.addresses
}

export const updateCustomerAddress = async (
  addressId: string,
  address: Partial<AddressInput>
): Promise<Address[]> => {
  const data = await apiRequest<{ customer: { addresses: Address[] } }>(
    `/store/customers/me/addresses/${addressId}`,
    {
      method: "POST",
      body: JSON.stringify(address),
    }
  )
  return data.customer.addresses
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  await apiRequest(`/store/customers/me/addresses/${addressId}`, {
    method: "DELETE",
  })
}

// Regions
export interface Region {
  id: string
  name: string
  currency_code: string
  countries?: Array<{ display_name: string; iso_2: string }>
}

export const getRegions = async (): Promise<Region[]> => {
  try {
    const data = await apiRequest<{ regions: Region[] }>("/store/regions")
    return data.regions || []
  } catch (e) {
    return []
  }
}

// Cart
export interface CartItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
  variant?: ProductVariant
  product_id?: string
  /**
   * The variant this line is for. Always returned by the Store API; declared
   * here because the product page needs it to tell whether the variant on
   * screen is already in the cart, and so decide between "Add to Cart" and
   * "Go to Cart".
   */
  variant_id?: string
}

export interface CartPromotion {
  id?: string
  code?: string
  /**
   * True for promotions Medusa applies on its own. These are NOT coupons: they
   * have no code to enter and cannot be removed (Medusa re-adds them
   * immediately), so the UI must never offer a Remove button for one.
   */
  is_automatic?: boolean
}

export interface Cart {
  id: string
  email?: string
  region_id?: string
  currency_code?: string
  items?: CartItem[]
  subtotal?: number
  item_total?: number
  shipping_total?: number
  discount_total?: number
  total?: number
  shipping_address?: any
  promotions?: CartPromotion[]
}

export const createCart = async (regionId?: string): Promise<Cart> => {
  const body: any = {}
  if (regionId) body.region_id = regionId
  const data = await apiRequest<{ cart: Cart }>("/store/carts", {
    method: "POST",
    body: JSON.stringify(body),
  })
  await setStoredCartId(data.cart.id)
  return data.cart
}

export const getCart = async (cartId: string): Promise<Cart | null> => {
  try {
    const data = await apiRequest<{ cart: Cart }>(
      `/store/carts/${cartId}?fields=*items,*shipping_methods,*region,*promotions`
    )
    return data.cart || null
  } catch (e) {
    return null
  }
}

export const addToCart = async (
  cartId: string,
  variantId: string,
  quantity: number = 1
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items`,
    {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
    }
  )
  return data.cart
}

export const updateCartItem = async (
  cartId: string,
  lineItemId: string,
  quantity: number
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }
  )
  return data.cart
}

/**
 * Removes ONE line item from the cart.
 *
 * Medusa's DELETE /store/carts/:id/line-items/:line_id does not answer with
 * `{ cart }` like the POST routes do — it answers with
 * `{ id, object: "line-item", deleted: true, parent: <cart> }`. Reading
 * `data.cart` off that gives `undefined`, and handing `undefined` to the cart
 * state made the whole cart render as empty after deleting a single item: it
 * looked like every item had been removed when in fact Medusa still held the
 * rest. The fix is to read `parent`.
 *
 * `data.cart` is kept as a fallback purely so this keeps working if a future
 * Medusa version normalises the shape.
 */
export const removeCartItem = async (
  cartId: string,
  lineItemId: string
): Promise<Cart> => {
  const data = await apiRequest<{ parent?: Cart; cart?: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  )
  const cart = data.parent ?? data.cart
  if (!cart) {
    // Never return undefined: the caller would blank the cart state and the
    // page would claim the cart is empty. Refetch instead.
    const refetched = await getCart(cartId)
    if (!refetched) {
      throw new Error("Could not read the cart after removing the item.")
    }
    return refetched
  }
  return cart
}

export const updateCartAddress = async (
  cartId: string,
  shippingAddress: {
    first_name: string
    last_name: string
    address_1: string
    city: string
    country_code: string
    postal_code: string
    phone?: string
  },
  email?: string
): Promise<Cart> => {
  const body: any = { shipping_address: shippingAddress }
  if (email) body.email = email

  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.cart
}

export interface ShippingOption {
  id: string
  name: string
  amount: number
}

export const getShippingOptions = async (
  cartId: string
): Promise<ShippingOption[]> => {
  try {
    const data = await apiRequest<{ shipping_options: ShippingOption[] }>(
      `/store/shipping-options?cart_id=${cartId}`
    )
    return data.shipping_options || []
  } catch (e) {
    return []
  }
}

export const addShippingMethod = async (
  cartId: string,
  optionId: string
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      body: JSON.stringify({ option_id: optionId }),
    }
  )
  return data.cart
}

// Coupons
//
// Goes through our custom route rather than Medusa's own POST /store/carts/:id/promotions,
// because the minimum-order-value condition is enforced there. Medusa's promotion rules
// cannot express a cart-total minimum, so the backend checks it before applying.
// A rejected coupon comes back as an error with a customer-facing message.
export interface Coupon {
  code: string
  /** Short label derived from the promotion, e.g. "Free delivery". */
  title: string
  description: string
  /** Minimum pre-discount goods value required, 0 when unrestricted. */
  min_subtotal: number
  eligible: boolean
  /** How much more the customer must add to qualify; 0 when eligible. */
  shortfall: number
  /** Units required in the cart, e.g. 2 for Buy-1-Get-1; 0 when unrestricted. */
  min_items: number
  /** How many more units the customer must add; 0 when satisfied. */
  item_shortfall: number
  applied: boolean
  /**
   * What the discount acts on: "shipping_methods", "items" or "order". Used to
   * find the delivery coupon without matching on its title, so the homepage and
   * cart advertise whatever delivery coupon exists in Medusa rather than a
   * hardcoded code.
   */
  target_type?: string | null
}

/**
 * Lists the coupons the customer can pick from. Passing the cart id makes the
 * backend compute per-cart eligibility, so the list can show "Add ₹201 more"
 * instead of failing only after the customer taps Apply.
 */
export const getCoupons = async (cartId?: string): Promise<Coupon[]> => {
  try {
    const qs = cartId ? `?cart_id=${encodeURIComponent(cartId)}` : ""
    const data = await apiRequest<{ coupons: Coupon[] }>(`/store/coupons${qs}`)
    return data.coupons || []
  } catch (e) {
    console.log("Error fetching coupons:", e)
    return []
  }
}

export const applyCoupon = async (
  cartId: string,
  code: string
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/apply-coupon`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
    }
  )
  return data.cart
}

export const removeCoupon = async (
  cartId: string,
  code: string
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/apply-coupon?code=${encodeURIComponent(code)}`,
    { method: "DELETE" }
  )
  return data.cart
}

// Pets
//
// Backed by our own `pet` Medusa module (apps/backend/src/modules/pet) rather
// than customer metadata, so a pet is a real queryable row. Every route derives
// the owner from the auth token, so all of these require a signed-in customer —
// apiRequest attaches the bearer token automatically.

export interface Pet {
  id: string
  name: string
  type: "dog" | "cat" | "bird" | "small_pet" | "reptile" | "other"
  gender: "male" | "female"
  avatar_url?: string | null
  breed?: string | null
  /** ISO date string, or null when the owner gave a stage/band instead. */
  birthday?: string | null
  life_stage?: "baby" | "young" | "adult" | "senior" | null
  approx_age?:
    | "under_six_months"
    | "six_to_twelve_months"
    | "one_to_two_years"
    | "three_to_five_years"
    | "five_to_seven_years"
    | "over_seven_years"
    | null
  size?: "toy" | "small" | "medium" | "large" | null
  allergies?: string[] | null
  /** Tri-state: true / false / null for "not answered". */
  spayed_neutered?: boolean | null
  personality?: string[] | null
  created_at?: string
}

/** The fields a client may write. `id` and ownership are never client-supplied. */
export type PetDraft = Omit<Pet, "id" | "created_at">

export const getPets = async (): Promise<Pet[]> => {
  try {
    const data = await apiRequest<{ pets: Pet[] }>("/store/pets")
    return data.pets || []
  } catch (e) {
    console.log("Error fetching pets:", e)
    return []
  }
}

/**
 * Errors are rethrown rather than swallowed, unlike getPets. A failed read can
 * degrade to an empty list, but a failed save must reach the customer — quietly
 * returning null would show a success state for a pet that was never stored.
 */
export const createPet = async (draft: PetDraft): Promise<Pet> => {
  const data = await apiRequest<{ pet: Pet }>("/store/pets", {
    method: "POST",
    body: JSON.stringify(draft),
  })
  return data.pet
}

/**
 * Partial update: only the keys present in `changes` are written, so a form
 * that renders a subset of fields cannot blank the rest.
 */
export const updatePet = async (
  petId: string,
  changes: Partial<PetDraft>
): Promise<Pet> => {
  const data = await apiRequest<{ pet: Pet }>(`/store/pets/${petId}`, {
    method: "POST",
    body: JSON.stringify(changes),
  })
  return data.pet
}

/**
 * Uploads a pet photo and returns its public URL.
 *
 * Sends base64 JSON rather than multipart because the backend route takes it
 * that way — see the note there about avoiding multer for a single endpoint.
 * FileReader gives us a data URL; the route accepts that form directly.
 */
export const uploadPetAvatar = async (file: File): Promise<string> => {
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.readAsDataURL(file)
  })

  const data = await apiRequest<{ url: string }>("/store/pets/avatar", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return data.url
}

export const deletePet = async (petId: string): Promise<void> => {
  await apiRequest(`/store/pets/${petId}`, { method: "DELETE" })
}

export interface PaymentProvider {
  id: string
  is_enabled?: boolean
}

/**
 * Payment providers enabled for the cart's region. The ids are Medusa's own, e.g.
 * "pp_system_default" or "pp_razorpay_razorpay".
 */
export const getPaymentProviders = async (
  regionId: string
): Promise<PaymentProvider[]> => {
  try {
    const data = await apiRequest<{ payment_providers: PaymentProvider[] }>(
      `/store/payment-providers?region_id=${encodeURIComponent(regionId)}`
    )
    return data.payment_providers || []
  } catch (e) {
    console.log("Error fetching payment providers:", e)
    return []
  }
}

/** Everything the client needs to open Razorpay Checkout, produced by the backend. */
export interface RazorpaySession {
  razorpay_order_id: string
  key_id: string
  amount_in_paise: number
  currency: string
}

export interface PaymentSession {
  id: string
  provider_id: string
  data?: Record<string, unknown>
}

/**
 * Creates the payment collection and a session for the chosen provider, returning
 * the session so the caller can read provider-specific data off it.
 *
 * `data` is forwarded to the provider. For Razorpay it carries the completed
 * Checkout handshake on the second call, which the backend verifies before treating
 * the payment as real.
 */
export const initiatePaymentSession = async (
  cartId: string,
  providerId: string = "pp_system_default",
  data?: Record<string, unknown>
): Promise<PaymentSession | null> => {
  const { payment_collection } = await apiRequest<{
    payment_collection: { id: string }
  }>("/store/payment-collections", {
    method: "POST",
    body: JSON.stringify({ cart_id: cartId }),
  })

  const res = await apiRequest<{
    payment_collection: { id: string; payment_sessions?: PaymentSession[] }
  }>(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
    method: "POST",
    body: JSON.stringify({ provider_id: providerId, ...(data ? { data } : {}) }),
  })

  const sessions = res.payment_collection?.payment_sessions ?? []
  return sessions.find((s) => s.provider_id === providerId) ?? sessions[0] ?? null
}

export const completeCart = async (
  cartId: string
): Promise<{ type: string; order?: Order; cart?: Cart }> => {
  const data = await apiRequest<{
    type: string
    order?: Order
    cart?: Cart
  }>(`/store/carts/${cartId}/complete`, { method: "POST" })
  if (data.order) {
    await setStoredCartId(null)
  }
  return data
}

// Orders
export interface Order {
  id: string
  display_id?: number
  status: string
  fulfillment_status?: string
  payment_status?: string
  total: number
  subtotal?: number
  shipping_total?: number
  currency_code: string
  items: CartItem[]
  created_at: string
  shipping_address?: any
  shipping_methods?: Array<{ name: string; amount: number }>
}

export const getCustomerOrders = async (): Promise<Order[]> => {
  try {
    const data = await apiRequest<{ orders: Order[] }>("/store/orders")
    return data.orders || []
  } catch (e) {
    return []
  }
}

/**
 * Cancels the customer's own order.
 *
 * Cancels rather than deletes: an order is the record of a payment, so Medusa has no
 * delete-order API and destroying one would break GST, refund and chargeback trails.
 * The backend refunds any captured payment as part of cancelling.
 *
 * Throws with the backend's customer-facing reason (already dispatched, already
 * cancelled) so the caller can show it directly.
 */
export const cancelOrder = async (id: string): Promise<Order | null> => {
  const data = await apiRequest<{ order: Order }>(
    `/store/orders/${id}/cancel`,
    { method: "POST" }
  )
  return data.order || null
}

export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const data = await apiRequest<{ order: Order }>(`/store/orders/${id}`)
    return data.order || null
  } catch (e) {
    return null
  }
}

// ---- Account settings ----
//
// Port of the same block in apps/mobile/src/services/api.ts, against the same
// backend routes. Each change is a separate call because each needs a different
// amount of proof: Medusa's `POST /store/customers/me` accepts only the harmless
// fields (first_name, last_name, phone, company_name, metadata). Email is
// excluded there because it doubles as the login identifier, and there is no
// store route for the password at all — so both go through dedicated backend
// routes that can demand proof first.

export type ProfileUpdate = {
  first_name?: string
  last_name?: string
  phone?: string
  company_name?: string
}

// Empty strings are sent as null rather than "": a cleared phone field should
// become absent, not a blank string that renders as an empty line.
const blankToNull = (value?: string) => {
  const trimmed = (value ?? "").trim()
  return trimmed.length ? trimmed : null
}

export const updateCustomerProfile = async (
  details: ProfileUpdate
): Promise<Customer> => {
  const data = await apiRequest<{ customer: Customer }>(
    "/store/customers/me",
    {
      method: "POST",
      body: JSON.stringify({
        first_name: blankToNull(details.first_name),
        last_name: blankToNull(details.last_name),
        phone: blankToNull(details.phone),
        company_name: blankToNull(details.company_name),
      }),
    }
  )
  return data.customer
}

// Throws with the backend's message ("Your current password is incorrect.",
// "...at least 8 characters") so the page can show it verbatim in an ErrorBanner.
export const changeCustomerPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await apiRequest("/store/customers/me/password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

export interface EmailChangeRequest {
  pending_email: string
  requested_at: string
  /**
   * Whether the backend will actually check the code entered at the next step.
   * False until one-time-code delivery is wired up; the page reads this to label
   * the step honestly instead of showing a code box that accepts anything.
   */
  otp_required: boolean
  expires_in_seconds: number
}

export const requestEmailChange = async (
  email: string
): Promise<EmailChangeRequest> => {
  return apiRequest<EmailChangeRequest>("/store/customers/me/email", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export const cancelEmailChange = async (): Promise<void> => {
  await apiRequest("/store/customers/me/email", { method: "DELETE" })
}

// `code` is accepted and forwarded now so the page and the API agree on the
// shape; the backend ignores it until verification is enabled.
export const confirmEmailChange = async (code?: string): Promise<Customer> => {
  const data = await apiRequest<{ customer: Customer }>(
    "/store/customers/me/email/confirm",
    {
      method: "POST",
      body: JSON.stringify({ code }),
    }
  )
  return data.customer
}

// ---- Privacy & security ----

export interface PrivacySettings {
  marketing_emails: boolean
  activity_tracking: boolean
  personalized_recommendations: boolean
}

/** What the store holds about this customer, for the "Your data" summary. */
export interface PrivacyDataSummary {
  account_created_at: string
  orders: number
  addresses: number
  pets: number
  activity_events: number
}

export const getPrivacyOverview = async (): Promise<{
  settings: PrivacySettings
  data_summary: PrivacyDataSummary
}> => {
  return apiRequest("/store/customers/me/privacy")
}

// Sends only the changed keys; the backend merges them over what is stored, so a
// stale copy of the other toggles can never overwrite a newer value.
export const updatePrivacySettings = async (
  patch: Partial<PrivacySettings>
): Promise<PrivacySettings> => {
  const data = await apiRequest<{ settings: PrivacySettings }>(
    "/store/customers/me/privacy",
    {
      method: "POST",
      body: JSON.stringify(patch),
    }
  )
  return data.settings
}

/** Deletes this customer's browsing/purchase activity. Returns how many rows went. */
export const clearActivityHistory = async (): Promise<number> => {
  const data = await apiRequest<{ deleted: number }>(
    "/store/customers/me/privacy/activity",
    { method: "DELETE" }
  )
  return data.deleted ?? 0
}

export interface DeleteAccountResult {
  deleted: boolean
  removed: { pets: number; activity_events: number }
  /** Orders are kept as financial records — see the backend route's comment. */
  retained: { orders: number }
}

// Irreversible. The caller must log out afterwards: the stored bearer token
// still parses but no longer resolves to a customer, so every subsequent
// authenticated call would fail in a confusing way.
export const deleteCustomerAccount = async (
  password: string
): Promise<DeleteAccountResult> => {
  return apiRequest<DeleteAccountResult>(
    "/store/customers/me/account/delete",
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  )
}
