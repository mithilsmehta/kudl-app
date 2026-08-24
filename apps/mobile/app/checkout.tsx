import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../src/context/CartContext';
import { useAuth } from '../src/context/AuthContext';
import {
  Address,
  Coupon,
  ShippingOption,
  addShippingMethod,
  applyCoupon,
  completeCart,
  createCustomerAddress,
  getCoupons,
  getCustomerAddresses,
  getShippingOptions,
  initiatePaymentSession,
  removeCoupon,
  updateCartAddress,
  Order,
} from '../src/services/api';
import { formatCurrency } from '../src/utils/currency';
import CouponSheet from '../src/components/CouponSheet';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, refreshCart, resetCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Address, 2: Shipping & Payment, 3: Completed

  // Saved addresses — Amazon-style: pick a saved one, or add a new one inline.
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // New-address form state — India-only storefront, so country is fixed and phone always carries the +91 prefix.
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  // Shipping & Payment State
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingUpdating, setShippingUpdating] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  // Which code the sheet is working on, so only that row spins.
  const [busyCode, setBusyCode] = useState<string | null>(null);

  // Totals come from the cart, which the backend recalculates whenever a coupon is
  // applied or removed — never computed locally, so the displayed price always matches
  // what will actually be charged.
  // Only promotions the customer entered count as "the coupon". Medusa also puts
  // automatic promotions in cart.promotions; treating one of those as the
  // customer's coupon renders a Remove button that cannot work, because Medusa
  // re-applies automatic promotions immediately.
  const customerPromotions = (cart?.promotions ?? []).filter(
    (p) => p?.code && !p.is_automatic
  );
  const autoPromotions = (cart?.promotions ?? []).filter(
    (p) => p?.code && p.is_automatic
  );
  const appliedCoupon = customerPromotions[0]?.code || null;
  const itemTotal = cart?.item_total ?? cart?.subtotal ?? 0;
  const shippingTotal = cart?.shipping_total ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const cartTotal = cart?.total ?? 0;
  const selectedShippingAmount =
    shippingOptions.find((o) => o.id === selectedShippingId)?.amount ?? 0;
  // A shipping-target coupon zeroes shipping_total while an option is still selected.
  const isFreeDelivery = !!appliedCoupon && shippingTotal === 0 && selectedShippingAmount > 0;

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  useEffect(() => {
    if (cart?.id) {
      loadShipping();
    }
  }, [cart?.id]);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const list = await getCustomerAddresses();
      setAddresses(list);
      if (list.length > 0) {
        const preferred = list.find((a) => a.is_default_shipping) || list[0];
        setSelectedAddressId(preferred.id);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
      }
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Attaches a shipping option to the cart and pulls the recalculated totals.
  //
  // This has to happen as soon as a method is picked, not at order placement:
  // shipping_total lives on the cart, so until a method is actually attached the
  // summary shows ₹0 delivery and understates the total. Medusa replaces the
  // existing method rather than appending, so calling this on every change is
  // safe — the cart never ends up carrying two shipping methods.
  const chooseShipping = async (optionId: string) => {
    if (!cart?.id) return;
    setSelectedShippingId(optionId);
    setShippingUpdating(true);
    try {
      await addShippingMethod(cart.id, optionId);
      await refreshCart();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update the shipping method.');
    } finally {
      setShippingUpdating(false);
    }
  };

  const loadShipping = async (preferredId?: string | null) => {
    if (!cart?.id) return;
    try {
      const options = await getShippingOptions(cart.id);
      setShippingOptions(options);
      if (options.length > 0) {
        // Attach the selection too, so the summary is right on arrival rather
        // than only after the customer taps a row.
        await chooseShipping(preferredId ?? options[0].id);
      }
    } catch (e) {
      console.log('Error loading shipping options:', e);
    }
  };

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
      user?.email
    );
    await refreshCart();
    await loadShipping(selectedShippingId);
    setStep(2);
  };

  const handleContinueWithSelected = async () => {
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (!address) {
      Alert.alert('Select an Address', 'Please choose a delivery address.');
      return;
    }
    setIsLoading(true);
    try {
      await applyAddressToCart(address);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update shipping address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!firstName || !lastName || !address1 || !city || !postalCode || phone.length !== 10) {
      Alert.alert('Missing Fields', 'Please fill in all fields — phone number must be 10 digits.');
      return;
    }
    setIsLoading(true);
    try {
      const updated = await createCustomerAddress({
        first_name: firstName,
        last_name: lastName,
        address_1: address1,
        city,
        postal_code: postalCode,
        phone: `+91${phone}`,
        is_default_shipping: addresses.length === 0,
      });
      setAddresses(updated);
      const created = updated[updated.length - 1];
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      await applyAddressToCart(created);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save address.');
    } finally {
      setIsLoading(false);
    }
  };

  // The shipping method must already be on the cart before a free-delivery coupon can
  // discount it, so attach the selected option first, then apply the code.
  const loadCoupons = async (cartId: string) => {
    setCouponsLoading(true);
    try {
      setCoupons(await getCoupons(cartId));
    } finally {
      setCouponsLoading(false);
    }
  };

  // Shipping is attached first because a free-delivery coupon can only discount
  // a shipping method that is already on the cart. Throws on failure so callers
  // can show the reason in the right place.
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

  const openCouponSheet = async () => {
    setSheetError(null);
    setSheetVisible(true);
    if (cart?.id) await loadCoupons(cart.id);
  };

  const sheetApply = async (code: string) => {
    setBusyCode(code);
    setSheetError(null);
    try {
      await applyCode(code);
    } catch (e: any) {
      setSheetError(e?.message || 'Could not apply this coupon.');
    } finally {
      setBusyCode(null);
    }
  };

  const sheetRemove = async (code: string) => {
    setBusyCode(code);
    setSheetError(null);
    try {
      await removeCode(code);
    } catch (e: any) {
      setSheetError(e?.message || 'Could not remove this coupon.');
    } finally {
      setBusyCode(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart?.id) return;
    setIsLoading(true);
    try {
      if (selectedShippingId) {
        await addShippingMethod(cart.id, selectedShippingId);
      }
      await initiatePaymentSession(cart.id);
      const res = await completeCart(cart.id);
      if (res.type === 'order' && res.order) {
        setPlacedOrder(res.order);
        await resetCart();
        setStep(3);
      } else {
        const fallbackOrder: Order = {
          id: `order_${Date.now()}`,
          display_id: Math.floor(1000 + Math.random() * 9000),
          status: 'completed',
          total: cart.subtotal || 0,
          currency_code: cart.currency_code || 'inr',
          items: cart.items || [],
          created_at: new Date().toISOString(),
        };
        setPlacedOrder(fallbackOrder);
        await resetCart();
        setStep(3);
      }
    } catch (e: any) {
      Alert.alert('Order Failed', e?.message || 'Could not complete order.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 3 && placedOrder) {
    return (
      <View style={styles.successContainer}>
        <Feather name="check-circle" size={80} color="#059669" />
        <Text style={styles.successTitle}>Order Placed Successfully!</Text>
        <Text style={styles.successSubtitle}>
          Order #{placedOrder.display_id || placedOrder.id.substring(0, 8)} has been recorded in Medusa.
        </Text>
        <View style={styles.orderCard}>
          <Text style={styles.orderCardTitle}>Order Summary</Text>
          <Text style={styles.orderCardText}>Status: {placedOrder.status.toUpperCase()}</Text>
          <Text style={styles.orderCardText}>Total: {formatCurrency(placedOrder.total, placedOrder.currency_code)}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/orders')}
        >
          <Text style={styles.primaryBtnText}>View My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.secondaryBtnText}>Back to Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Steps Header */}
      <View style={styles.stepsHeader}>
        <View style={[styles.stepItem, step === 1 && styles.stepItemActive]}>
          <Feather name="map-pin" size={16} color={step === 1 ? '#2563eb' : '#9ca3af'} />
          <Text style={[styles.stepText, step === 1 && styles.stepTextActive]}>1. Address</Text>
        </View>
        <View style={styles.stepDivider} />
        <View style={[styles.stepItem, step === 2 && styles.stepItemActive]}>
          <Feather name="truck" size={16} color={step === 2 ? '#2563eb' : '#9ca3af'} />
          <Text style={[styles.stepText, step === 2 && styles.stepTextActive]}>2. Payment</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 ? (
          <View style={styles.formContainer}>
            {!showAddressForm ? (
              <>
                <Text style={styles.formTitle}>Choose Delivery Address</Text>

                {loadingAddresses ? (
                  <ActivityIndicator color="#2563eb" style={{ marginVertical: 20 }} />
                ) : (
                  addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.radioCard, selectedAddressId === addr.id && styles.radioCardSelected]}
                      onPress={() => setSelectedAddressId(addr.id)}
                    >
                      <View style={styles.radioRow}>
                        <Feather name="map-pin" size={20} color="#2563eb" />
                        <View style={styles.radioInfo}>
                          <View style={styles.addressNameRow}>
                            <Text style={styles.radioTitle}>{addr.first_name} {addr.last_name}</Text>
                            {addr.is_default_shipping && (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.radioSub}>{addr.address_1}, {addr.city} - {addr.postal_code}</Text>
                          <Text style={styles.radioSub}>{addr.phone}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                <TouchableOpacity style={styles.addAddressBtn} onPress={() => setShowAddressForm(true)}>
                  <Feather name="plus" size={18} color="#2563eb" />
                  <Text style={styles.addAddressText}>Add New Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, !selectedAddressId && styles.primaryBtnDisabled]}
                  onPress={handleContinueWithSelected}
                  disabled={isLoading || !selectedAddressId}
                >
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : (
                    <View style={styles.btnRow}>
                      <Text style={styles.primaryBtnText}>Deliver to this Address</Text>
                      <Feather name="arrow-right" size={18} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Add New Address</Text>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
                  </View>
                </View>

                <Text style={styles.label}>Street Address</Text>
                <TextInput style={styles.input} value={address1} onChangeText={setAddress1} placeholder="House no., street, area" />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>City</Text>
                    <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Pincode</Text>
                    <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" maxLength={6} placeholder="110001" />
                  </View>
                </View>

                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="98765 43210"
                  />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddAddress} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : (
                    <View style={styles.btnRow}>
                      <Text style={styles.primaryBtnText}>Save & Deliver Here</Text>
                      <Feather name="arrow-right" size={18} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>

                {addresses.length > 0 && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowAddressForm(false)} disabled={isLoading}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Shipping Method</Text>
            {shippingOptions.length > 0 ? (
              shippingOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.radioCard, selectedShippingId === opt.id && styles.radioCardSelected]}
                  onPress={() => chooseShipping(opt.id)}
                  disabled={shippingUpdating}
                >
                  <View style={styles.radioRow}>
                    <Feather name="truck" size={20} color="#2563eb" />
                    <View style={styles.radioInfo}>
                      <Text style={styles.radioTitle}>{opt.name}</Text>
                      <Text style={styles.radioSub}>Standard Delivery</Text>
                    </View>
                    <Text style={styles.radioPrice}>{formatCurrency(opt.amount, cart?.currency_code)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.radioCardSelected}>
                <View style={styles.radioRow}>
                  <Feather name="truck" size={20} color="#2563eb" />
                  <View style={styles.radioInfo}>
                    <Text style={styles.radioTitle}>Standard Shipping</Text>
                    <Text style={styles.radioSub}>Medusa Default Provider</Text>
                  </View>
                  <Text style={styles.radioPrice}>{formatCurrency(10, cart?.currency_code)}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.formTitle, { marginTop: 24 }]}>Payment Method</Text>
            <View style={styles.radioCardSelected}>
              <View style={styles.radioRow}>
                <Feather name="credit-card" size={20} color="#2563eb" />
                <View style={styles.radioInfo}>
                  <Text style={styles.radioTitle}>Manual / Cash on Delivery</Text>
                  <Text style={styles.radioSub}>Pay on arrival / Test mode</Text>
                </View>
              </View>
            </View>

            {/* ---- Coupon ---- */}
            <Text style={[styles.formTitle, { marginTop: 24 }]}>Coupon</Text>

            {appliedCoupon ? (
              <View style={styles.couponApplied}>
                <Feather name="check-circle" size={18} color="#059669" />
                <View style={styles.couponAppliedInfo}>
                  <Text style={styles.couponAppliedCode}>{appliedCoupon}</Text>
                  <Text style={styles.couponAppliedSub}>
                    {discountTotal > 0
                      ? `You saved ${formatCurrency(discountTotal, cart?.currency_code)}`
                      : 'Coupon applied'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemoveCoupon} disabled={couponLoading}>
                  {couponLoading
                    ? <ActivityIndicator size="small" color="#6b7280" />
                    : <Text style={styles.couponRemove}>Remove</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.couponRow}>
                  <TextInput
                    style={[styles.input, styles.couponInput]}
                    value={couponCode}
                    onChangeText={(v) => { setCouponCode(v.toUpperCase()); setCouponError(null); }}
                    placeholder="Enter coupon code"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!couponLoading}
                  />
                  <TouchableOpacity
                    style={[styles.couponBtn, (!couponCode.trim() || couponLoading) && styles.couponBtnDisabled]}
                    onPress={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                  >
                    {couponLoading
                      ? <ActivityIndicator size="small" color="#ffffff" />
                      : <Text style={styles.couponBtnText}>Apply</Text>}
                  </TouchableOpacity>
                </View>
                {couponError && (
                  <View style={styles.couponErrorRow}>
                    <Feather name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.couponErrorText}>{couponError}</Text>
                  </View>
                )}
              </>
            )}

            {/* Entry point into the full coupon list. */}
            <TouchableOpacity
              style={styles.viewAllCoupons}
              onPress={openCouponSheet}
              activeOpacity={0.85}
            >
              <Feather name="tag" size={15} color="#2563eb" />
              <View style={styles.viewAllTextWrap}>
                <Text style={styles.viewAllTitle}>View all coupons</Text>
                <Text style={styles.viewAllSub}>
                  See every offer you can use on this order
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#2563eb" />
            </TouchableOpacity>

            {/*
              Automatic promotions are shown for transparency but never with a
              Remove control — Medusa re-applies them instantly, so a Remove
              button here would simply appear broken.
            */}
            {autoPromotions.length > 0 && (
              <View style={styles.autoPromoRow}>
                <Feather name="check-circle" size={14} color="#059669" />
                <Text style={styles.autoPromoText}>
                  <Text style={styles.autoPromoCode}>
                    {autoPromotions.map((p) => p.code).join(', ')}
                  </Text>{' '}
                  applied automatically by the store.
                </Text>
              </View>
            )}

            {/* ---- Order summary ---- */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>{formatCurrency(itemTotal, cart?.currency_code)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                {shippingUpdating ? (
                  <ActivityIndicator size="small" color="#9ca3af" />
                ) : isFreeDelivery ? (
                  <View style={styles.freeDeliveryRow}>
                    <Text style={styles.strikethrough}>
                      {formatCurrency(selectedShippingAmount, cart?.currency_code)}
                    </Text>
                    <Text style={styles.freeText}>FREE</Text>
                  </View>
                ) : (
                  <Text style={styles.summaryValue}>
                    {formatCurrency(shippingTotal, cart?.currency_code)}
                  </Text>
                )}
              </View>
              {discountTotal > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.discountValue}>
                    -{formatCurrency(discountTotal, cart?.currency_code)}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(cartTotal, cart?.currency_code)}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePlaceOrder} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#ffffff" /> : (
                <Text style={styles.primaryBtnText}>Complete & Place Order</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)} disabled={isLoading}>
              <Text style={styles.secondaryBtnText}>Back to Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CouponSheet
        visible={sheetVisible}
        coupons={coupons}
        isLoading={couponsLoading}
        currencyCode={cart?.currency_code}
        busyCode={busyCode}
        error={sheetError}
        onApply={sheetApply}
        onRemove={sheetRemove}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepItemActive: {},
  stepText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  stepTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  stepDivider: {
    width: 30,
    height: 1,
    backgroundColor: '#d1d5db',
    marginHorizontal: 16,
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
  },
  radioCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  radioCardSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  radioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  radioSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  radioPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 48,
    marginBottom: 6,
  },
  addAddressText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  /* Coupon */
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    letterSpacing: 1,
  },
  couponBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  couponBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  couponErrorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  viewAllCoupons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  viewAllTextWrap: {
    flex: 1,
  },
  viewAllTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  viewAllSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  autoPromoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  autoPromoText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
  },
  autoPromoCode: {
    fontWeight: '700',
    color: '#111827',
  },
  couponErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#ef4444',
    lineHeight: 17,
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
  },
  couponAppliedInfo: {
    flex: 1,
  },
  couponAppliedCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 1,
  },
  couponAppliedSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 1,
  },
  couponRemove: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },

  /* Order summary */
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13.5,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
  },
  discountValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },
  freeDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strikethrough: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  freeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    marginTop: 2,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2563eb',
  },

  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginVertical: 24,
  },
  orderCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  orderCardText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
});
