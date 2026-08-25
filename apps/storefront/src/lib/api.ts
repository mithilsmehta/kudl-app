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
 *     reach the dev machine. A browser has no such problem, so the URL comes
 *     straight from NEXT_PUBLIC_MEDUSA_BACKEND_URL.
 */

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "")

export const MEDUSA_BACKEND_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
)

const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const TOKEN_KEY = "@medusa_auth_token"
const CART_ID_KEY = "@medusa_cart_id"

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

// Fetch helper with headers
async function apiRequest<T>(
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

  const response = await fetch(`${MEDUSA_BACKEND_URL}${endpoint}`, {
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
}

let cachedRegionId: string | null = null

export const getDefaultRegionId = async (): Promise<string | undefined> => {
  if (cachedRegionId) return cachedRegionId
  const regions = await getRegions()
  const preferred = regions.find((r) => r.currency_code === "inr") || regions[0]
  cachedRegionId = preferred?.id || null
  return cachedRegionId || undefined
}

const PRODUCT_FIELDS =
  "fields=*variants,*variants.calculated_price,*images,*categories"

export const getProducts = async (): Promise<Product[]> => {
  try {
    const regionId = await getDefaultRegionId()
    const regionParam = regionId ? `&region_id=${regionId}` : ""
    const data = await apiRequest<{ products: Product[] }>(
      `/store/products?${PRODUCT_FIELDS}${regionParam}`
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

export const getCategories = async (): Promise<
  Array<{ id: string; name: string }>
> => {
  try {
    const data = await apiRequest<{
      product_categories: Array<{ id: string; name: string }>
    }>("/store/product-categories")
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

export const removeCartItem = async (
  cartId: string,
  lineItemId: string
): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  )
  return data.cart
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
  applied: boolean
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

export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const data = await apiRequest<{ order: Order }>(`/store/orders/${id}`)
    return data.order || null
  } catch (e) {
    return null
  }
}
