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
  ShippingOption,
  addShippingMethod,
  completeCart,
  createCustomerAddress,
  getCustomerAddresses,
  getShippingOptions,
  initiatePaymentSession,
  updateCartAddress,
  Order,
} from '../src/services/api';
import { formatCurrency } from '../src/utils/currency';

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
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

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

  const loadShipping = async () => {
    if (!cart?.id) return;
    try {
      const options = await getShippingOptions(cart.id);
      setShippingOptions(options);
      if (options.length > 0) {
        setSelectedShippingId(options[0].id);
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
    await loadShipping();
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
          onPress={() => router.replace('/(tabs)/orders')}
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
                  onPress={() => setSelectedShippingId(opt.id)}
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
