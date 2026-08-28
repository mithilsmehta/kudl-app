import React, { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../src/context/AuthContext';
import { useCart } from '../src/context/CartContext';
import { PrivacyDataSummary, getPrivacyOverview } from '../src/services/api';

/**
 * Deleting the account, for real and for good.
 *
 * Three deliberate pieces of friction, in increasing order of cost to fake:
 * the customer is shown exactly what goes and what stays (with real counts, so
 * it is not a generic warning they can skim), they must type DELETE, and they
 * must enter their password — which the backend verifies, so it is a real check
 * rather than theatre.
 *
 * The "what stays" list matters as much as the "what goes" one. Past orders are
 * retained as payment records, and someone deleting their account because they
 * want their data gone deserves to learn that here rather than discover it
 * later.
 */

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading, deleteAccount } = useAuth();
  const { resetCart } = useCart();

  const [summary, setSummary] = useState<PrivacyDataSummary | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  /*
   * A successful deletion signs the customer out, so `user` goes null on purpose.
   * Without a guard this effect reads that as "not signed in" and pushes /login
   * underneath the success alert, so dismissing the alert lands on a sign-in form
   * instead of the store.
   *
   * The guard is a ref set BEFORE the request as well as the `isDeleted` state
   * used by the render below, because `deleteAccount` signs out as part of its own
   * work — `user` is already null while `resetCart()` is still awaiting a network
   * call, and a render happens in that window. A state flag set after the await
   * arrives too late; the ref is readable by the effect immediately.
   */
  const isDeletingRef = useRef(false);

  useEffect(() => {
    if (isDeletingRef.current || isDeleted) return;
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, isDeleted]);

  useEffect(() => {
    if (!user) return;
    // Counts are a nice-to-have on this screen, not a precondition — a failed
    // load must not block someone from deleting their account, so the copy below
    // falls back to unnumbered wording.
    getPrivacyOverview()
      .then((overview) => setSummary(overview.data_summary))
      .catch(() => setSummary(null));
  }, [user]);

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD && !!password && !isBusy;

  const handleDelete = () => {
    Alert.alert(
      'Delete account permanently?',
      'This cannot be undone. Your profile, addresses, pet profiles and activity history will be deleted.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsBusy(true);
            isDeletingRef.current = true;
            try {
              const result = await deleteAccount(password);
              setIsDeleted(true);

              /*
               * The cart is dropped after, not before. It is tied to the
               * customer that no longer exists, so keeping its id would leave
               * the app pointing at a cart it can never check out — but doing it
               * first would throw away a live cart if the delete then failed on
               * a wrong password.
               */
              await resetCart();

              const kept = result.retained.orders;
              Alert.alert(
                'Account deleted',
                kept
                  ? `Your account is gone. ${kept} past ${
                      kept === 1 ? 'order is' : 'orders are'
                    } kept as payment records.`
                  : 'Your account and all associated data have been deleted.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }],
              );
            } catch (e: any) {
              // Deletion failed, so the customer is still signed in and the guard
              // should go back to doing its job.
              isDeletingRef.current = false;
              Alert.alert('Could not delete account', e?.message || 'Please try again.');
            } finally {
              setIsBusy(false);
            }
          },
        },
      ],
    );
  };

  if ((authLoading || !user) && !isDeleted) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.iconCircle}>
        <Feather name="alert-triangle" size={26} color="#ef4444" />
      </View>
      <Text style={styles.title}>Delete your account</Text>
      <Text style={styles.subtitle}>
        This is permanent. There is no way to restore the account or its data afterwards.
      </Text>

      <Text style={styles.blockLabel}>What gets deleted</Text>
      <View style={styles.card}>
        <Bullet icon="user" text="Your profile, name, phone and email" />
        <Bullet
          icon="map-pin"
          text={
            summary
              ? `${summary.addresses} saved ${summary.addresses === 1 ? 'address' : 'addresses'}`
              : 'Your saved addresses'
          }
        />
        <Bullet
          icon="heart"
          text={summary ? `${summary.pets} pet ${summary.pets === 1 ? 'profile' : 'profiles'}` : 'Your pet profiles'}
        />
        <Bullet
          icon="activity"
          text={
            summary ? `${summary.activity_events} activity records used for recommendations` : 'Your activity history'
          }
        />
        <Bullet icon="lock" text="Your sign-in credentials" isLast />
      </View>

      {/* <Text style={styles.blockLabel}>What we have to keep</Text> */}
      <View style={[styles.card, styles.keepCard]}>
        <Bullet
          icon="file-text"
          tint="#1e40af"
          text={
            summary && summary.orders
              ? `${summary.orders} past ${summary.orders === 1 ? 'order' : 'orders'} — payment records needed for GST returns, refunds and payment disputes. They will no longer be linked to an account you can sign in to.`
              : 'Any past orders, as payment records needed for GST returns, refunds and payment disputes.'
          }
          isLast
        />
      </View>

      <Text style={styles.blockLabel}>Confirm</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          Type <Text style={styles.labelStrong}>{CONFIRM_WORD}</Text> to confirm
        </Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={CONFIRM_WORD}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.label}>Your password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
        />
        <Text style={styles.hint}>Confirms it&apos;s really you, not someone with your phone.</Text>
      </View>

      <TouchableOpacity
        style={[styles.deleteBtn, !canSubmit && styles.deleteBtnDisabled]}
        onPress={handleDelete}
        disabled={!canSubmit}
      >
        {isBusy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.deleteBtnText}>Delete my account permanently</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isBusy}>
        <Text style={styles.cancelText}>Keep my account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const Bullet: React.FC<{ icon: any; text: string; isLast?: boolean; tint?: string }> = ({
  icon,
  text,
  isLast,
  tint,
}) => (
  <View style={[styles.bullet, isLast && styles.bulletLast]}>
    <Feather name={icon} size={16} color={tint || '#6b7280'} />
    <Text style={[styles.bulletText, !!tint && { color: '#1e3a8a' }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 20,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  keepCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  bullet: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  bulletLast: {
    paddingBottom: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  labelStrong: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  deleteBtnDisabled: {
    backgroundColor: '#fca5a5',
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
