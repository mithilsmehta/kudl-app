import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Order, getCustomerOrders } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { formatCurrency } from '../../src/utils/currency';

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const data = await getCustomerOrders();
      setOrders(data);
    } catch (e) {
      console.log('Error loading orders:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency?: string) => {
    return formatCurrency(amount, currency);
  };

  const getStatusDisplay = (item: Order) => {
    if (item.status === 'canceled') return { label: 'CANCELED', color: '#ef4444', bg: '#fee2e2', icon: 'x-circle' as const };
    const fulfillment = item.fulfillment_status || 'not_fulfilled';
    if (['delivered', 'partially_delivered'].includes(fulfillment)) {
      return { label: 'DELIVERED', color: '#065f46', bg: '#d1fae5', icon: 'check-circle' as const };
    }
    if (['shipped', 'partially_shipped'].includes(fulfillment)) {
      return { label: 'SHIPPED', color: '#1e40af', bg: '#dbeafe', icon: 'truck' as const };
    }
    return { label: 'PROCESSING', color: '#92400e', bg: '#fef3c7', icon: 'clock' as const };
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusDisplay = getStatusDisplay(item);
    return (
    <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/order/${item.id}`)}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.orderIdRow}>
          <Feather name="package" size={18} color="#2563eb" />
          <Text style={styles.orderIdText}>
            Order #{item.display_id || item.id.substring(0, 8)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bg }]}>
          <Feather name={statusDisplay.icon} size={12} color={statusDisplay.color} />
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Feather name="clock" size={12} color="#9ca3af" />
        <Text style={styles.dateText}>Placed on {formatDate(item.created_at)}</Text>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsList}>
        {item.items && item.items.length > 0 ? (
          item.items.map((lineItem) => (
            <View key={lineItem.id} style={styles.itemRow}>
              {lineItem.thumbnail ? (
                <Image source={{ uri: lineItem.thumbnail }} style={styles.itemThumb} />
              ) : (
                <View style={styles.itemThumbPlaceholder}>
                  <Feather name="package" size={14} color="#9ca3af" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {lineItem.title}
                </Text>
                <Text style={styles.itemSub}>Qty: {lineItem.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatAmount(lineItem.unit_price * lineItem.quantity, item.currency_code)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noItemsText}>Items details available in backend</Text>
        )}
      </View>

      {/* Footer Total */}
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <View style={styles.footerRight}>
          <Text style={styles.totalAmount}>
            {formatAmount(item.total, item.currency_code)}
          </Text>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Fetching order history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              When you place orders through the app, they will appear here.
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemsList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 10,
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  itemThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontSize: 11,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  noItemsText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
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
});
