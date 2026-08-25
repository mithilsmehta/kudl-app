import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Order, getOrderById } from '../../src/services/api';
import { formatCurrency } from '../../src/utils/currency';
import { formatOrderReference } from '../../src/utils/order-reference';

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'shopping-bag' as const },
  { key: 'confirmed', label: 'Payment Confirmed', icon: 'credit-card' as const },
  { key: 'shipped', label: 'Shipped', icon: 'truck' as const },
  { key: 'delivered', label: 'Delivered', icon: 'check-circle' as const },
];

const getCurrentStep = (order: Order): number => {
  const fulfillment = order.fulfillment_status || 'not_fulfilled';
  if (['delivered', 'partially_delivered'].includes(fulfillment)) return 3;
  if (['shipped', 'partially_shipped'].includes(fulfillment)) return 2;
  const payment = order.payment_status || 'not_paid';
  if (['authorized', 'captured', 'partially_captured'].includes(payment)) return 1;
  return 0;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getOrderById(id as string).then((data) => {
        setOrder(data);
        setIsLoading(false);
      });
    }
  }, [id]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loaderContainer}>
        <Feather name="alert-circle" size={40} color="#d1d5db" />
        <Text style={styles.notFoundText}>Order not found</Text>
      </View>
    );
  }

  const isCanceled = order.status === 'canceled';
  const currentStep = getCurrentStep(order);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.orderIdText}>{formatOrderReference(order)}</Text>
        <Text style={styles.dateText}>Placed on {formatDate(order.created_at)}</Text>
      </View>

      {isCanceled ? (
        <View style={styles.canceledBanner}>
          <Feather name="x-circle" size={20} color="#ef4444" />
          <Text style={styles.canceledText}>This order was canceled</Text>
        </View>
      ) : (
        <View style={styles.trackerCard}>
          {STEPS.map((step, index) => {
            const isDone = index <= currentStep;
            const isLast = index === STEPS.length - 1;
            return (
              <View key={step.key} style={styles.trackerRow}>
                <View style={styles.trackerIconColumn}>
                  <View style={[styles.trackerDot, isDone && styles.trackerDotDone]}>
                    <Feather name={step.icon} size={14} color={isDone ? '#ffffff' : '#9ca3af'} />
                  </View>
                  {!isLast && (
                    <View style={[styles.trackerLine, index < currentStep && styles.trackerLineDone]} />
                  )}
                </View>
                <View style={styles.trackerLabelColumn}>
                  <Text style={[styles.trackerLabel, isDone && styles.trackerLabelDone]}>{step.label}</Text>
                  {index === currentStep && (
                    <Text style={styles.trackerSub}>Current status</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.itemThumb} />
            ) : (
              <View style={styles.itemThumbPlaceholder}>
                <Feather name="package" size={16} color="#9ca3af" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.itemSub}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.unit_price * item.quantity, order.currency_code)}
            </Text>
          </View>
        ))}
      </View>

      {order.shipping_address && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressText}>
            {order.shipping_address.first_name} {order.shipping_address.last_name}
          </Text>
          <Text style={styles.addressText}>{order.shipping_address.address_1}</Text>
          <Text style={styles.addressText}>
            {order.shipping_address.city} - {order.shipping_address.postal_code}
          </Text>
          <Text style={styles.addressText}>{order.shipping_address.phone}</Text>
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.subtotal || 0, order.currency_code)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.shipping_total || 0, order.currency_code)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.total, order.currency_code)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: '#6b7280',
  },
  headerCard: {
    marginBottom: 16,
  },
  orderIdText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  dateText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  canceledText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
  trackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  trackerRow: {
    flexDirection: 'row',
  },
  trackerIconColumn: {
    alignItems: 'center',
    width: 32,
  },
  trackerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackerDotDone: {
    backgroundColor: '#2563eb',
  },
  trackerLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#e5e7eb',
  },
  trackerLineDone: {
    backgroundColor: '#2563eb',
  },
  trackerLabelColumn: {
    flex: 1,
    marginLeft: 14,
    paddingBottom: 24,
  },
  trackerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 3,
  },
  trackerLabelDone: {
    color: '#111827',
  },
  trackerSub: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  itemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  addressText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
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
    paddingTop: 10,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2563eb',
  },
});
