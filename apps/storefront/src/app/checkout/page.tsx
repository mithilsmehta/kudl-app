'use client';

/**
 * Checkout — port of apps/mobile/app/checkout.tsx.
 *
 * Two-step flow (address, then shipping + payment + coupon), then a success
 * screen. Two behaviours are worth calling out, both carried over from the app:
 *
 *   - Totals are always read off the cart, never computed locally. The backend
 *     recalculates on every coupon change, so what's displayed is what's charged.
 *   - Applying a coupon attaches the selected shipping method FIRST. A
 *     free-delivery promotion can only discount shipping that already exists on
 *     the cart, so the order matters.
 *
 * The coupon calls go through the backend's own /apply-coupon route rather than
 * Medusa's promotions endpoint, because that is where the minimum-order-value
 * rule is enforced.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  MapPin,
  Truck,
  CreditCard,
  Plus,
  CheckCircle,
  ArrowRight,
  Tag,
  ChevronRight,
  Shield,
} from '@/components/icons';
import {
  Address,
  Coupon,
  Order,
  ShippingOption,
  addShippingMethod,
  applyCoupon,
  completeCart,
  createCustomerAddress,
  getCustomerAddresses,
  getCoupons,
  getShippingOptions,
  getPaymentProviders,
  initiatePaymentSession,
  removeCoupon,
  updateCartAddress,
} from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

import { formatOrderReference } from '@/lib/order-reference';
import { openRazorpayCheckout, type RazorpayHandshake } from '@/lib/razorpay';

import { trackEvent } from '@/lib/recommendations';

import { useCart } from '@/context/CartContext';
import { useRequireAuth } from '@/lib/useRequireAuth';
import AddressForm, { AddressFormValues, emptyAddressForm } from '@/components/AddressForm';
import { fieldClass } from '@/components/FormField';
import CouponSheet from '@/components/CouponSheet';
import ScreenHeader from '@/components/ScreenHeader';
import Spinner from '@/components/Spinner';
import ErrorBanner from '@/components/ErrorBanner';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart, resetCart } = useCart();
  const { user, isReady } = useRequireAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Saved addresses — pick a saved one, or add a new one inline.
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [form, setForm] = useState<AddressFormValues>(emptyAddressForm);

  // Shipping & payment
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingUpdating, setShippingUpdating] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * Payment providers come from the backend rather than being hardcoded, so the
   * Razorpay id (pp_razorpay_razorpay) never has to be duplicated here and the
   * option simply disappears if the backend has no credentials configured.
   */
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Which code the sheet is currently working on, so only that row spins. */
  const [busyCode, setBusyCode] = useState<string | null>(null);

  /*
   * Only promotions the customer entered themselves count as "the coupon".
   * Medusa also puts automatic promotions in cart.promotions; treating one of
   * those as the customer's coupon renders a Remove button that cannot work,
   * because Medusa re-applies automatic promotions immediately.
   */
  const customerPromotions = (cart?.promotions ?? []).filter((p) => p?.code && !p.is_automatic);
  const autoPromotions = (cart?.promotions ?? []).filter((p) => p?.code && p.is_automatic);
  const appliedCoupon = customerPromotions[0]?.code || null;
  const itemTotal = cart?.item_total ?? cart?.subtotal ?? 0;
  const shippingTotal = cart?.shipping_total ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const cartTotal = cart?.total ?? 0;
  const selectedShippingAmount = shippingOptions.find((o) => o.id === selectedShippingId)?.amount ?? 0;
  // A shipping-target coupon zeroes shipping_total while an option is still selected.
  const isFreeDelivery = !!appliedCoupon && shippingTotal === 0 && selectedShippingAmount > 0;

  // Seeds the new-address form with the customer's own name, without clobbering
  // anything they've already typed. Memoised so the effect below can depend on it.
  const prefillName = useCallback(() => {
    setForm((f) => ({
      ...f,
      first_name: f.first_name || user?.first_name || '',
      last_name: f.last_name || user?.last_name || '',
    }));
  }, [user?.first_name, user?.last_name]);

  /**
   * Attaches a shipping option to the cart and pulls the recalculated totals.
   *
   * This has to happen the moment a method is picked, not at order placement:
   * `shipping_total` is a property of the cart, so until a method is actually on
   * the cart the summary reads ₹0 delivery and understates the total. Medusa
   * replaces the existing method rather than appending, so calling this on every
   * change is safe — the cart never ends up with two shipping methods.
   */
  const chooseShipping = async (optionId: string) => {
    if (!cart?.id) return;
    setSelectedShippingId(optionId);
    setShippingUpdating(true);
    setError(null);
    try {
      await addShippingMethod(cart.id, optionId);
      await refreshCart();
    } catch (e: any) {
      setError(e?.message || 'Could not update the shipping method.');
    } finally {
      setShippingUpdating(false);
    }
  };

  const loadShipping = async (cartId: string, preferredId?: string | null) => {
    try {
      const options = await getShippingOptions(cartId);
      setShippingOptions(options);
      if (options.length === 0) return;
      // Attach the default selection too, so the summary is correct on arrival
      // rather than only after the customer touches the radio group.
      const next = preferredId ?? options[0].id;
      setSelectedShippingId(next);
      await addShippingMethod(cartId, next);
      await refreshCart();
    } catch (e) {
      console.log('Error loading shipping options:', e);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const load = async () => {
      setLoadingAddresses(true);
      try {
        const list = await getCustomerAddresses();
        if (cancelled) return;
        setAddresses(list);
        if (list.length > 0) {
          const preferred = list.find((a) => a.is_default_shipping) || list[0];
          setSelectedAddressId(preferred.id);
          setShowAddressForm(false);
        } else {
          setShowAddressForm(true);
          prefillName();
        }
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isReady, prefillName]);

  useEffect(() => {
    const regionId = cart?.region_id;
    if (!regionId) return;
    let cancelled = false;
    getPaymentProviders(regionId).then((list) => {
      if (cancelled) return;
      const ids = list.filter((p) => p.is_enabled !== false).map((p) => p.id);
      setProviders(ids);
      // Prefer Razorpay when the backend offers it, otherwise fall back to whatever
      // provider exists (the default manual one in a store without credentials).
      setSelectedProvider((current) => current ?? ids.find((id) => id.includes('razorpay')) ?? ids[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [cart?.region_id]);

  useEffect(() => {
    if (cart?.id) loadShipping(cart.id, selectedShippingId);
    // `loadShipping` closes over `refreshCart`, which the cart context recreates on
    // every render. Depending on either would re-run this effect in a loop and
    // re-POST the shipping method endlessly, so the cart id is the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.id]);

  const applyAddressToCart = async (address: Address) => {
    if (!cart?.id) return;
    await updateCartAddress(
      cart.id,
      {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        city: address.city,
        country_code: 'in',
        postal_code: address.postal_code,
        phone: address.phone,
      },
      user?.email,
    );
    await refreshCart();
    await loadShipping(cart.id);
    setStep(2);
  };

  const handleContinueWithSelected = async () => {
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (!address) {
      setError('Please choose a delivery address.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await applyAddressToCart(address);
    } catch (e: any) {
      setError(e?.message || 'Failed to update shipping address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await createCustomerAddress({
        first_name: form.first_name,
        last_name: form.last_name,
        address_1: form.address_1,
        city: form.city,
        postal_code: form.postal_code,
        phone: `+91${form.phone}`,
        is_default_shipping: addresses.length === 0,
      });
      setAddresses(updated);
      const created = updated[updated.length - 1];
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      await applyAddressToCart(created);
    } catch (e: any) {
      setError(e?.message || 'Failed to save address.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCoupons = async (cartId: string) => {
    setCouponsLoading(true);
    try {
      setCoupons(await getCoupons(cartId));
    } finally {
      setCouponsLoading(false);
    }
  };

  /**
   * Applies a code. Shipping is attached first because a free-delivery coupon can
   * only discount a shipping method that is already on the cart.
   *
   * Throws on failure so the coupon sheet can surface the reason on its own row;
   * the inline form catches it separately.
   */
  const applyCode = async (code: string) => {
    if (!cart?.id) return;
    if (selectedShippingId) {
      await addShippingMethod(cart.id, selectedShippingId);
    }
    await applyCoupon(cart.id, code);
    await refreshCart();
    await loadCoupons(cart.id);
  };

  const removeCode = async (code: string) => {
    if (!cart?.id) return;
    await removeCoupon(cart.id, code);
    await refreshCart();
    await loadCoupons(cart.id);
  };

  const handleApplyCoupon = async () => {
    if (!cart?.id || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      await applyCode(couponCode.trim());
      setCouponCode('');
    } catch (e: any) {
      // The backend returns a customer-facing reason (invalid code, minimum not
      // met, coupon doesn't match the cart's items).
      setCouponError(e?.message || 'Could not apply this coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!cart?.id || !appliedCoupon) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      await removeCode(appliedCoupon);
    } catch (e: any) {
      setCouponError(e?.message || 'Could not remove this coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  /** Sheet actions mark only their own row busy, and let errors bubble to it. */
  const sheetApply = async (code: string) => {
    setBusyCode(code);
    setCouponError(null);
    try {
      await applyCode(code);
    } finally {
      setBusyCode(null);
    }
  };

  const sheetRemove = async (code: string) => {
    setBusyCode(code);
    try {
      await removeCode(code);
    } finally {
      setBusyCode(null);
    }
  };

  const openCouponSheet = async () => {
    setSheetOpen(true);
    if (cart?.id) await loadCoupons(cart.id);
  };

  const handlePlaceOrder = async () => {
    if (!cart?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      if (selectedShippingId) {
        await addShippingMethod(cart.id, selectedShippingId);
      }

      const providerId = selectedProvider ?? 'pp_system_default';
      const session = await initiatePaymentSession(cart.id, providerId);

      /*
       * Razorpay needs the customer to authorise the payment in its own Checkout
       * before the cart can be completed. The backend created a Razorpay order and
       * returned its id plus the public key on the session, so nothing about the
       * payment is configured or computed here.
       */
      if (providerId.includes('razorpay')) {
        const data = (session?.data ?? {}) as Record<string, any>;
        const orderId = data.razorpay_order_id as string | undefined;
        const keyId = data.key_id as string | undefined;

        if (!orderId || !keyId) {
          throw new Error('Payment could not be started. Please try again in a moment.');
        }

        const handshake: RazorpayHandshake = await openRazorpayCheckout({
          keyId,
          orderId,
          amountInPaise: Number(data.amount_in_paise ?? 0),
          currency: String(data.currency ?? 'INR'),
          storeName: 'KUDL Pet Store',
          description: `Order for ${user?.email ?? 'your cart'}`,
          customer: {
            name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
            email: user?.email,
            contact: addresses.find((a) => a.id === selectedAddressId)?.phone,
          },
        });

        /*
         * Hand the signed result back so the backend can verify it. The provider
         * recognises a completed handshake and keeps the order that was actually
         * paid rather than creating a new one.
         */
        await initiatePaymentSession(cart.id, providerId, {
          ...data,
          razorpay_payment_id: handshake.razorpay_payment_id,
          razorpay_signature: handshake.razorpay_signature,
        });
      }

      const res = await completeCart(cart.id);
      if (res.type === 'order' && res.order) {
        setPlacedOrder(res.order);
        res.order.items?.forEach((item) => {
          if (item.product_id) {
            trackEvent('product_purchased', { productId: item.product_id });
          }
        });
        await resetCart();
        setStep(3);
      } else {
        /*
         * Medusa returns type "cart" when completion was rejected — the cart is
         * still live and no order exists. The app fabricates a placeholder order
         * here; that's misleading on the web, where the customer would be shown
         * a confirmation for an order that was never placed. Surface the failure
         * instead and leave the cart intact so they can retry.
         */
        setError("We couldn't complete your order. Your cart is unchanged — please check your details and try again.");
      }
    } catch (e: any) {
      setError(e?.message || 'Could not complete order.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-kudl-primary" label="Loading checkout" />
      </div>
    );
  }

  /* ---- Step 3: success ---- */
  if (step === 3 && placedOrder) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <CheckCircle className="h-20 w-20 text-kudl-success" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold text-kudl-ink">Order Placed Successfully!</h1>
        <p className="mt-2 text-sm text-kudl-muted">{formatOrderReference(placedOrder)} has been recorded.</p>

        <div className="mt-6 w-full rounded-kudl-card border border-kudl-border bg-white p-4 text-left">
          <p className="text-[15px] font-bold text-kudl-ink">Order Summary</p>
          <p className="mt-2 text-[13px] text-kudl-subtle">Status: {placedOrder.status.toUpperCase()}</p>
          <p className="mt-1 text-[13px] text-kudl-subtle">
            Total: {formatCurrency(placedOrder.total, placedOrder.currency_code)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.replace('/orders')}
          className="mt-6 h-[50px] w-full rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark"
        >
          View My Orders
        </button>
        <Link
          href="/"
          className="mt-3 flex h-[50px] w-full items-center justify-center rounded-xl border border-kudl-hairline bg-white text-base font-semibold text-kudl-body"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const stepClass = (n: 1 | 2) =>
    step === n ? 'border-kudl-primary text-kudl-primary' : 'border-transparent text-kudl-faint';

  return (
    <div>
      <ScreenHeader title="Checkout" fallbackHref="/cart" />

      {/* Steps header */}
      <div className="border-b border-kudl-border bg-white">
        <div className="mx-auto flex max-w-3xl gap-6 px-4 md:px-6">
          <span className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold ${stepClass(1)}`}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            1. Address
          </span>
          <span className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold ${stepClass(2)}`}>
            <Truck className="h-4 w-4" aria-hidden="true" />
            2. Payment
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-4 md:px-6 md:pb-16">
        <ErrorBanner message={error} />

        {step === 1 ? (
          showAddressForm ? (
            <div className="mt-3">
              <AddressForm
                title="Add New Address"
                values={form}
                onChange={setForm}
                onSubmit={handleAddAddress}
                submitLabel="Save & Deliver Here"
                onCancel={addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                isSaving={isLoading}
              />
            </div>
          ) : (
            <div className="mt-3">
              <h2 className="mb-3 text-base font-bold text-kudl-ink">Choose Delivery Address</h2>

              {loadingAddresses ? (
                <div className="flex justify-center py-6">
                  <Spinner className="h-6 w-6 text-kudl-primary" />
                </div>
              ) : (
                <ul className="space-y-3">
                  {addresses.map((addr) => (
                    <li key={addr.id}>
                      <label
                        className={`flex cursor-pointer gap-3 rounded-kudl-card border bg-white p-4 ${
                          selectedAddressId === addr.id
                            ? 'border-kudl-primary ring-1 ring-kudl-primary'
                            : 'border-kudl-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          className="sr-only"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                        />
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-kudl-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-kudl-ink">
                              {addr.first_name} {addr.last_name}
                            </span>
                            {addr.is_default_shipping && (
                              <span className="rounded bg-kudl-tint px-1.5 py-0.5 text-[10px] font-extrabold text-kudl-primary">
                                DEFAULT
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[13px] text-kudl-muted">
                            {addr.address_1}, {addr.city} - {addr.postal_code}
                          </span>
                          <span className="block text-[13px] text-kudl-muted">{addr.phone}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => {
                  prefillName();
                  setShowAddressForm(true);
                }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-kudl-primary bg-white text-[15px] font-semibold text-kudl-primary transition-colors hover:bg-kudl-tint"
              >
                <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                Add New Address
              </button>

              <button
                type="button"
                onClick={handleContinueWithSelected}
                disabled={isLoading || !selectedAddressId}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-50"
              >
                {isLoading ? (
                  <Spinner className="h-5 w-5 text-white" />
                ) : (
                  <>
                    Deliver to this Address
                    <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          )
        ) : (
          /* ---- Step 2: shipping, payment, coupon ---- */
          <div className="mt-3">
            <h2 className="mb-3 text-base font-bold text-kudl-ink">Shipping Method</h2>
            {shippingOptions.length > 0 ? (
              <ul className="space-y-3">
                {shippingOptions.map((opt) => (
                  <li key={opt.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-kudl-card border bg-white p-4 ${
                        selectedShippingId === opt.id
                          ? 'border-kudl-primary ring-1 ring-kudl-primary'
                          : 'border-kudl-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        className="sr-only"
                        checked={selectedShippingId === opt.id}
                        onChange={() => chooseShipping(opt.id)}
                        disabled={shippingUpdating}
                      />
                      <Truck className="h-5 w-5 shrink-0 text-kudl-primary" aria-hidden="true" />
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold text-kudl-ink">{opt.name}</span>
                      </span>
                      <span className="text-[15px] font-bold text-kudl-ink">
                        {formatCurrency(opt.amount, cart?.currency_code)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-kudl-card border border-kudl-border bg-white p-4 text-[13px] text-kudl-muted">
                No shipping options are available for this address.
              </p>
            )}

            <h2 className="mb-3 mt-6 text-base font-bold text-kudl-ink">Payment Method</h2>
            {providers.length === 0 ? (
              <div className="flex items-center gap-3 rounded-kudl-card border border-kudl-border bg-white p-4">
                <Spinner className="h-4 w-4 text-kudl-faint" label="Loading payment methods" />
                <span className="text-[13px] text-kudl-muted">Loading payment methods…</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {providers.map((id) => {
                  const isRazorpay = id.includes('razorpay');
                  const selected = selectedProvider === id;
                  return (
                    <li key={id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-kudl-card border bg-white p-4 ${
                          selected ? 'border-kudl-primary ring-1 ring-kudl-primary' : 'border-kudl-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment-provider"
                          className="sr-only"
                          checked={selected}
                          onChange={() => setSelectedProvider(id)}
                        />
                        <CreditCard className="h-5 w-5 shrink-0 text-kudl-primary" aria-hidden="true" />
                        <span className="flex-1">
                          <span className="block text-[15px] font-semibold text-kudl-ink">
                            {isRazorpay ? 'Card, UPI & Netbanking' : 'Cash on Delivery'}
                          </span>
                          <span className="block text-[13px] text-kudl-muted">
                            {isRazorpay ? 'Pay securely via Razorpay' : 'Pay on arrival'}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedProvider?.includes('razorpay') && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-kudl-faint">
                <Shield className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
                Card details are entered on Razorpay and never reach this site.
              </p>
            )}

            {/* ---- Coupon ---- */}
            <h2 className="mb-3 mt-6 text-base font-bold text-kudl-ink">Coupon</h2>

            {appliedCoupon ? (
              <div className="flex items-center gap-3 rounded-kudl-card border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle className="h-[18px] w-[18px] shrink-0 text-kudl-success" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-kudl-ink">{appliedCoupon}</span>
                  <span className="block text-[13px] text-kudl-muted">
                    {discountTotal > 0
                      ? `You saved ${formatCurrency(discountTotal, cart?.currency_code)}`
                      : 'Coupon applied'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={couponLoading}
                  className="shrink-0 text-[13px] font-semibold text-kudl-muted underline"
                >
                  {couponLoading ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    className={fieldClass}
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="Enter coupon code"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={couponLoading}
                    aria-label="Coupon code"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                    className="h-[50px] shrink-0 rounded-xl bg-kudl-primary px-6 text-[15px] font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-50"
                  >
                    {couponLoading ? <Spinner className="h-5 w-5 text-white" /> : 'Apply'}
                  </button>
                </div>
                <ErrorBanner message={couponError} />
              </>
            )}

            {/* Swiggy-style entry point into the full coupon list. */}
            <button
              type="button"
              onClick={openCouponSheet}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-kudl-primary bg-kudl-tint px-3.5 py-3 text-left transition-colors hover:bg-blue-100"
            >
              <Tag className="h-4 w-4 shrink-0 text-kudl-primary" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-[13px] font-bold text-kudl-primary">View all coupons</span>
                <span className="block text-[11px] text-kudl-muted">See every offer you can use on this order</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-kudl-primary" aria-hidden="true" />
            </button>

            {/*
              Automatic promotions are shown for transparency but never with a
              Remove control — Medusa re-applies them instantly, so a Remove
              button here would simply appear broken.
            */}
            {autoPromotions.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-kudl-surface px-3.5 py-3">
                <CheckCircle className="mt-px h-4 w-4 shrink-0 text-kudl-success" aria-hidden="true" />
                <p className="text-[12px] text-kudl-muted">
                  <span className="font-semibold text-kudl-ink">{autoPromotions.map((p) => p.code).join(', ')}</span>{' '}
                  applied automatically by the store.
                </p>
              </div>
            )}

            {/* ---- Order summary ---- */}
            <div className="mt-6 rounded-kudl-card border border-kudl-border bg-white p-4">
              <div className="mb-2 flex justify-between">
                <span className="text-sm text-kudl-muted">Items</span>
                <span className="text-sm font-semibold text-kudl-ink">
                  {formatCurrency(itemTotal, cart?.currency_code)}
                </span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="text-sm text-kudl-muted">Delivery</span>
                {shippingUpdating ? (
                  <Spinner className="h-4 w-4 text-kudl-faint" label="Updating delivery" />
                ) : isFreeDelivery ? (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-kudl-faint line-through">
                      {formatCurrency(selectedShippingAmount, cart?.currency_code)}
                    </span>
                    <span className="text-sm font-bold text-kudl-success">FREE</span>
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-kudl-ink">
                    {formatCurrency(shippingTotal, cart?.currency_code)}
                  </span>
                )}
              </div>
              {discountTotal > 0 && (
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-kudl-muted">Discount</span>
                  <span className="text-sm font-semibold text-kudl-success">
                    -{formatCurrency(discountTotal, cart?.currency_code)}
                  </span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-kudl-divider pt-3">
                <span className="text-base font-bold text-kudl-ink">Total</span>
                <span className="text-lg font-bold text-kudl-primary">
                  {formatCurrency(cartTotal, cart?.currency_code)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isLoading}
              className="mt-4 flex h-[52px] w-full items-center justify-center rounded-xl bg-kudl-primary text-base font-bold text-white transition-colors hover:bg-kudl-dark disabled:opacity-70"
            >
              {isLoading ? <Spinner className="h-5 w-5 text-white" label="Placing order" /> : 'Complete & Place Order'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="mt-3 h-[50px] w-full rounded-xl border border-kudl-hairline bg-white text-base font-semibold text-kudl-body"
            >
              Back to Address
            </button>
          </div>
        )}
      </div>

      <CouponSheet
        open={sheetOpen}
        coupons={coupons}
        isLoading={couponsLoading}
        currencyCode={cart?.currency_code}
        busyCode={busyCode}
        onApply={sheetApply}
        onRemove={sheetRemove}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
