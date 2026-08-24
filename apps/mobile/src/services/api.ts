import AsyncStorageRaw from '@react-native-async-storage/async-storage';
import ConstantsRaw from 'expo-constants';

const AsyncStorage = (AsyncStorageRaw as any)?.default || AsyncStorageRaw;
const Constants = (ConstantsRaw as any)?.default || ConstantsRaw;

// Resolves the Medusa base URL, in priority order:
//
//   1. EXPO_PUBLIC_MEDUSA_BACKEND_URL — an explicit backend, required when pointing at a
//      shared/deployed instance (Docker on a team host, staging, production). LAN
//      detection below cannot find a machine that isn't on your Wi-Fi.
//   2. The Expo dev server's LAN IP — the zero-config path for local development, since
//      a phone cannot resolve "localhost".
//   3. localhost — simulator / web fallback.
//
// Note: EXPO_PUBLIC_* values are inlined by Metro at bundle time, so restart with
// `npx expo start -c` after changing .env.
const getBackendUrl = () => {
  const explicit = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = String(hostUri).split(':')[0];
    if (ip) {
      return `http://${ip}:9000`;
    }
  }
  return 'http://localhost:9000';
};

export const MEDUSA_BACKEND_URL = getBackendUrl();

const TOKEN_KEY = '@medusa_auth_token';
const CART_ID_KEY = '@medusa_cart_id';
const PUBLISHABLE_API_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

// Token Management
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const setStoredToken = async (token: string | null): Promise<void> => {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {}
};

// Cart ID Management
export const getStoredCartId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CART_ID_KEY);
  } catch (e) {
    return null;
  }
};

export const setStoredCartId = async (cartId: string | null): Promise<void> => {
  try {
    if (cartId) {
      await AsyncStorage.setItem(CART_ID_KEY, cartId);
    } else {
      await AsyncStorage.removeItem(CART_ID_KEY);
    }
  } catch (e) {}
};

// Fetch helper with headers
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(PUBLISHABLE_API_KEY ? { 'x-publishable-api-key': PUBLISHABLE_API_KEY } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${MEDUSA_BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

// ---- Medusa API Functions ----

// Products
export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
  prices?: Array<{
    amount: number;
    currency_code: string;
  }>;
}

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  images?: Array<{ id: string; url: string }>;
  variants?: ProductVariant[];
  categories?: Array<{ id: string; name: string }>;
}

let cachedRegionId: string | null = null;

export const getDefaultRegionId = async (): Promise<string | undefined> => {
  if (cachedRegionId) return cachedRegionId;
  const regions = await getRegions();
  const preferred = regions.find((r) => r.currency_code === 'inr') || regions[0];
  cachedRegionId = preferred?.id || null;
  return cachedRegionId || undefined;
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const regionId = await getDefaultRegionId();
    const regionParam = regionId ? `&region_id=${regionId}` : '';
    const data = await apiRequest<{ products: Product[] }>(`/store/products?fields=*variants,*variants.calculated_price,*images,*categories${regionParam}`);
    return data.products || [];
  } catch (e) {
    console.log('Error fetching products:', e);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const regionId = await getDefaultRegionId();
    const regionParam = regionId ? `&region_id=${regionId}` : '';
    const data = await apiRequest<{ product: Product }>(`/store/products/${id}?fields=*variants,*variants.calculated_price,*images,*categories${regionParam}`);
    return data.product || null;
  } catch (e) {
    console.log(`Error fetching product ${id}:`, e);
    return null;
  }
};

export const getCategories = async (): Promise<Array<{ id: string; name: string }>> => {
  try {
    const data = await apiRequest<{ product_categories: Array<{ id: string; name: string }> }>('/store/product-categories');
    return data.product_categories || [];
  } catch (e) {
    return [];
  }
};

// Customer / Auth
export interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export const loginCustomer = async (email: string, password: string): Promise<{ token: string; customer?: Customer }> => {
  const data = await apiRequest<{ token: string; customer?: Customer }>('/auth/customer/emailpass', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    await setStoredToken(data.token);
  }
  return data;
};

export const registerCustomer = async (details: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}): Promise<{ token?: string; customer: Customer }> => {
  // Step 1: create the auth identity — this alone does not create a queryable customer record.
  const { token } = await apiRequest<{ token: string }>('/auth/customer/emailpass/register', {
    method: 'POST',
    body: JSON.stringify({ email: details.email, password: details.password }),
  });
  await setStoredToken(token);

  // Step 2: create the customer record, linked to the auth identity via the bearer token.
  const { customer } = await apiRequest<{ customer: Customer }>('/store/customers', {
    method: 'POST',
    body: JSON.stringify({
      email: details.email,
      first_name: details.first_name,
      last_name: details.last_name,
    }),
  });

  // Step 3: the registration token has no actor_id until the customer record exists, and it
  // isn't refreshed retroactively — re-login now to get a token actually scoped to this customer.
  const { token: scopedToken } = await loginCustomer(details.email, details.password);

  return { token: scopedToken, customer };
};

export const getCurrentCustomer = async (): Promise<Customer | null> => {
  try {
    const data = await apiRequest<{ customer: Customer }>('/store/customers/me');
    return data.customer || null;
  } catch (e) {
    return null;
  }
};

// Saved Addresses (India-only storefront — country is always "in")
export interface Address {
  id: string;
  address_name?: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code: string;
  country_code: string;
  phone: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'country_code'>;

export const getCustomerAddresses = async (): Promise<Address[]> => {
  try {
    const data = await apiRequest<{ addresses: Address[] }>('/store/customers/me/addresses');
    return data.addresses || [];
  } catch (e) {
    return [];
  }
};

export const createCustomerAddress = async (address: AddressInput): Promise<Address[]> => {
  const data = await apiRequest<{ customer: { addresses: Address[] } }>('/store/customers/me/addresses', {
    method: 'POST',
    body: JSON.stringify({ ...address, country_code: 'in' }),
  });
  return data.customer.addresses;
};

export const updateCustomerAddress = async (addressId: string, address: Partial<AddressInput>): Promise<Address[]> => {
  const data = await apiRequest<{ customer: { addresses: Address[] } }>(`/store/customers/me/addresses/${addressId}`, {
    method: 'POST',
    body: JSON.stringify(address),
  });
  return data.customer.addresses;
};

export const deleteCustomerAddress = async (addressId: string): Promise<void> => {
  await apiRequest(`/store/customers/me/addresses/${addressId}`, { method: 'DELETE' });
};

// Regions
export interface Region {
  id: string;
  name: string;
  currency_code: string;
  countries?: Array<{ display_name: string; iso_2: string }>;
}

export const getRegions = async (): Promise<Region[]> => {
  try {
    const data = await apiRequest<{ regions: Region[] }>('/store/regions');
    return data.regions || [];
  } catch (e) {
    return [];
  }
};

// Cart
export interface CartItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
  variant?: ProductVariant;
}

export interface CartPromotion {
  id?: string;
  code?: string;
  /**
   * True for promotions Medusa applies on its own. These are NOT coupons: they
   * have no code to enter and cannot be removed (Medusa re-adds them
   * immediately), so the UI must never offer a Remove button for one.
   */
  is_automatic?: boolean;
}

export interface Cart {
  id: string;
  email?: string;
  region_id?: string;
  currency_code?: string;
  items?: CartItem[];
  subtotal?: number;
  item_total?: number;
  shipping_total?: number;
  discount_total?: number;
  total?: number;
  shipping_address?: any;
  promotions?: CartPromotion[];
}

export const createCart = async (regionId?: string): Promise<Cart> => {
  const body: any = {};
  if (regionId) body.region_id = regionId;
  const data = await apiRequest<{ cart: Cart }>('/store/carts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await setStoredCartId(data.cart.id);
  return data.cart;
};

export const getCart = async (cartId: string): Promise<Cart | null> => {
  try {
    const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}?fields=*items,*shipping_methods,*region,*promotions`);
    return data.cart || null;
  } catch (e) {
    return null;
  }
};

export const addToCart = async (cartId: string, variantId: string, quantity: number = 1): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: JSON.stringify({
      variant_id: variantId,
      quantity,
    }),
  });
  return data.cart;
};

export const updateCartItem = async (cartId: string, lineItemId: string, quantity: number): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: 'POST',
    body: JSON.stringify({
      quantity,
    }),
  });
  return data.cart;
};

export const removeCartItem = async (cartId: string, lineItemId: string): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: 'DELETE',
  });
  return data.cart;
};

export const updateCartAddress = async (cartId: string, shippingAddress: {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  country_code: string;
  postal_code: string;
  phone?: string;
}, email?: string): Promise<Cart> => {
  const body: any = {
    shipping_address: shippingAddress,
  };
  if (email) body.email = email;

  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.cart;
};

export interface ShippingOption {
  id: string;
  name: string;
  amount: number;
}

export const getShippingOptions = async (cartId: string): Promise<ShippingOption[]> => {
  try {
    const data = await apiRequest<{ shipping_options: ShippingOption[] }>(`/store/shipping-options?cart_id=${cartId}`);
    return data.shipping_options || [];
  } catch (e) {
    return [];
  }
};

export const addShippingMethod = async (cartId: string, optionId: string): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({
      option_id: optionId,
    }),
  });
  return data.cart;
};

// Coupons
//
// Goes through our custom route rather than Medusa's own POST /store/carts/:id/promotions,
// because the minimum-order-value condition is enforced there. Medusa's promotion rules
// cannot express a cart-total minimum, so the backend checks it before applying.
// A rejected coupon comes back as an error with a customer-facing message.
export interface Coupon {
  code: string;
  /** Short label derived from the promotion, e.g. "Free delivery". */
  title: string;
  description: string;
  /** Minimum pre-discount goods value required, 0 when unrestricted. */
  min_subtotal: number;
  eligible: boolean;
  /** How much more the customer must add to qualify; 0 when eligible. */
  shortfall: number;
  applied: boolean;
}

// Lists the coupons the customer can pick from. Passing the cart id makes the
// backend compute per-cart eligibility, so the list can show "Add ₹201 more"
// instead of failing only after the customer taps Apply.
export const getCoupons = async (cartId?: string): Promise<Coupon[]> => {
  try {
    const qs = cartId ? `?cart_id=${encodeURIComponent(cartId)}` : '';
    const data = await apiRequest<{ coupons: Coupon[] }>(`/store/coupons${qs}`);
    return data.coupons || [];
  } catch (e) {
    console.log('Error fetching coupons:', e);
    return [];
  }
};

export const applyCoupon = async (cartId: string, code: string): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(`/store/carts/${cartId}/apply-coupon`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data.cart;
};

export const removeCoupon = async (cartId: string, code: string): Promise<Cart> => {
  const data = await apiRequest<{ cart: Cart }>(
    `/store/carts/${cartId}/apply-coupon?code=${encodeURIComponent(code)}`,
    { method: 'DELETE' }
  );
  return data.cart;
};

export const initiatePaymentSession = async (cartId: string, providerId: string = 'pp_system_default'): Promise<void> => {
  const { payment_collection } = await apiRequest<{ payment_collection: { id: string } }>('/store/payment-collections', {
    method: 'POST',
    body: JSON.stringify({ cart_id: cartId }),
  });
  await apiRequest(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId }),
  });
};

export const completeCart = async (cartId: string): Promise<{ type: string; order?: Order; cart?: Cart }> => {
  const data = await apiRequest<{ type: string; order?: Order; cart?: Cart }>(`/store/carts/${cartId}/complete`, {
    method: 'POST',
  });
  if (data.order) {
    await setStoredCartId(null);
  }
  return data;
};

// Orders
export interface Order {
  id: string;
  display_id?: number;
  status: string;
  fulfillment_status?: string;
  payment_status?: string;
  total: number;
  subtotal?: number;
  shipping_total?: number;
  currency_code: string;
  items: CartItem[];
  created_at: string;
  shipping_address?: any;
  shipping_methods?: Array<{ name: string; amount: number }>;
}

export const getCustomerOrders = async (): Promise<Order[]> => {
  try {
    const data = await apiRequest<{ orders: Order[] }>('/store/orders');
    return data.orders || [];
  } catch (e) {
    return [];
  }
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const data = await apiRequest<{ order: Order }>(`/store/orders/${id}`);
    return data.order || null;
  } catch (e) {
    return null;
  }
};
