import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Coupon } from '../services/api';
import { formatCurrency } from '../utils/currency';

/**
 * "View all coupons" sheet — the mobile counterpart of the storefront's
 * CouponSheet. Presented as a bottom sheet, the way offer lists appear in
 * food-delivery apps: coupons the cart already qualifies for come first, the
 * rest stay visible but locked behind what the customer still needs to add.
 *
 * Only one coupon can be active at a time. Applying a second replaces the
 * first — the backend enforces that, so this only reflects it.
 */
export default function CouponSheet({
  visible,
  coupons,
  isLoading,
  currencyCode,
  busyCode,
  error,
  onApply,
  onRemove,
  onClose,
}: {
  visible: boolean;
  coupons: Coupon[];
  isLoading: boolean;
  currencyCode?: string;
  /** Code currently being applied or removed, so only that row spins. */
  busyCode: string | null;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Tapping the dimmed area closes the sheet, as elsewhere in the app. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Available Coupons</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 40 }} />
          ) : coupons.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="tag" size={38} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No coupons available</Text>
              <Text style={styles.emptySub}>Check back later for offers.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {coupons.map((c) => {
                const busy = busyCode === c.code;
                return (
                  <View
                    key={c.code}
                    style={[
                      styles.card,
                      c.applied
                        ? styles.cardApplied
                        : !c.eligible && styles.cardLocked,
                    ]}
                  >
                    <View style={styles.cardBody}>
                      <View style={styles.codeChip}>
                        <Feather name="tag" size={11} color="#2563eb" />
                        <Text style={styles.codeChipText}>{c.code}</Text>
                      </View>

                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <Text style={styles.cardDesc}>{c.description}</Text>

                      {!c.eligible && c.shortfall > 0 && (
                        <Text style={styles.shortfall}>
                          Add {formatCurrency(c.shortfall, currencyCode)} more to
                          use this
                        </Text>
                      )}
                    </View>

                    {c.applied ? (
                      <TouchableOpacity
                        style={styles.appliedBtn}
                        onPress={() => onRemove(c.code)}
                        disabled={busy}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#059669" />
                        ) : (
                          <>
                            <Feather name="check" size={13} color="#059669" />
                            <Text style={styles.appliedBtnText}>APPLIED</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.applyBtn,
                          (!c.eligible || busy) && styles.applyBtnDisabled,
                        ]}
                        onPress={() => onApply(c.code)}
                        disabled={busy || !c.eligible}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.applyBtnText}>APPLY</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.footnote}>
            Only one coupon can be applied per order. Choosing another replaces
            the current one.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  cardApplied: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  cardLocked: {
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  cardBody: {
    flex: 1,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  codeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  shortfall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginTop: 6,
  },
  applyBtn: {
    height: 36,
    minWidth: 74,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  appliedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    minWidth: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  appliedBtnText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  footnote: {
    fontSize: 11,
    color: '#9ca3af',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
