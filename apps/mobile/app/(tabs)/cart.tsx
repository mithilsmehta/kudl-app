import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { CartItem } from '../../src/services/api';
import { formatCurrency } from '../../src/utils/currency';

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount, isLoading, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();

  const handleCheckout = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  const calculateSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, cart?.currency_code);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemImageContainer}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Feather name="shopping-cart" size={24} color="#9ca3af" />
          </View>
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>
          {formatAmount(item.unit_price)}
        </Text>

        <View style={styles.itemFooter}>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Feather name="minus" size={14} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Feather name="plus" size={14} color="#374151" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeItem(item.id)}
          >
            <Feather name="trash-2" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading && !cart) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="shopping-cart" size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you haven't added any products to your cart yet.
        </Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.push('/(tabs)/products')}
        >
          <Text style={styles.shopBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subtotal = calculateSubtotal();

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
          <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>Calculated at checkout</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Feather name="arrow-right" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  removeBtn: {
    padding: 6,
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  checkoutBtn: {
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
