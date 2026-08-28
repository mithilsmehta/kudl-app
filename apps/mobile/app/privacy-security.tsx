import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import {
  PrivacyDataSummary,
  PrivacySettings,
  clearActivityHistory,
  getPrivacyOverview,
  updatePrivacySettings,
} from '../src/services/api';

/**
 * Privacy & Security.
 *
 * Built around a simple idea: a privacy screen is only worth having if every
 * control on it changes what the backend actually does, and if it can tell the
 * customer what is held about them. So it has three parts, in that order:
 *
 *   1. Your data — real counts, straight from the database. This is what makes
 *      the buttons underneath it mean something.
 *   2. Permissions — three toggles, each honoured by a specific backend route:
 *      marketing email, activity tracking (the recommendation event log stops
 *      being written), and personalization (the log stops being used for
 *      ranking). Tracking and personalization are separate because they answer
 *      different questions, and someone may well allow one and not the other.
 *   3. Security & data controls — change password, wipe activity history, delete
 *      the account.
 *
 * Toggles are written optimistically and rolled back on failure, because a
 * switch that lags a network round trip feels broken and gets tapped twice.
 */
export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [summary, setSummary] = useState<PrivacyDataSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  const load = useCallback(async () => {
    try {
      const overview = await getPrivacyOverview();
      setSettings(overview.settings);
      setSummary(overview.data_summary);
    } catch (e: any) {
      Alert.alert('Could not load settings', e?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reloaded on focus, not just on mount: the counts go stale as soon as the
  // customer places an order or adds a pet elsewhere in the app.
  useFocusEffect(
    React.useCallback(() => {
      if (user) load();
    }, [user, load])
  );

  const toggle = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    try {
      const saved = await updatePrivacySettings({ [key]: value });
      setSettings(saved);
    } catch (e: any) {
      setSettings(previous);
      Alert.alert('Could not save', e?.message || 'Please try again.');
    }
  };

  const handleClearActivity = () => {
    Alert.alert(
      'Clear activity history?',
      'Your browsing and purchase signals will be deleted. Recommendations will start from scratch. Orders, addresses and pets are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const deleted = await clearActivityHistory();
              setSummary((s) => (s ? { ...s, activity_events: 0 } : s));
              Alert.alert(
                'History cleared',
                deleted
                  ? `${deleted} activity ${deleted === 1 ? 'record' : 'records'} deleted.`
                  : 'There was nothing to clear.'
              );
            } catch (e: any) {
              Alert.alert('Could not clear history', e?.message || 'Please try again.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  if (authLoading || !user || isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const memberSince = summary?.account_created_at
    ? new Date(summary.account_created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Your data</Text>
      <View style={styles.card}>
        <Text style={styles.cardIntro}>
          What KUDL currently stores against your account.
        </Text>
        <View style={styles.statGrid}>
          <Stat icon="package" label="Orders" value={summary?.orders ?? 0} />
          <Stat icon="map-pin" label="Addresses" value={summary?.addresses ?? 0} />
          <Stat icon="heart" label="Pet profiles" value={summary?.pets ?? 0} />
          <Stat icon="activity" label="Activity records" value={summary?.activity_events ?? 0} />
        </View>
        {memberSince && <Text style={styles.memberSince}>Member since {memberSince}</Text>}
      </View>

      <Text style={styles.sectionLabel}>Permissions</Text>
      <View style={styles.card}>
        <ToggleRow
          icon="mail"
          title="Promotional emails"
          description="Offers, new arrivals and pet care tips. Order and delivery updates are sent either way."
          value={settings?.marketing_emails ?? true}
          onValueChange={(v) => toggle('marketing_emails', v)}
        />
        <ToggleRow
          icon="activity"
          title="Activity tracking"
          description="Lets us record what you view and buy. Turning this off stops new activity being saved."
          value={settings?.activity_tracking ?? true}
          onValueChange={(v) => toggle('activity_tracking', v)}
        />
        <ToggleRow
          icon="star"
          title="Personalised recommendations"
          description={
            settings?.activity_tracking === false
              ? 'Uses your saved activity to pick products for you. Nothing new is being recorded while tracking is off.'
              : 'Uses your saved activity to pick products for you. Turn off to see the same picks as everyone else.'
          }
          value={settings?.personalized_recommendations ?? true}
          onValueChange={(v) => toggle('personalized_recommendations', v)}
          isLast
        />
      </View>

      <Text style={styles.sectionLabel}>Security</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/change-password')}>
          <Feather name="lock" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Change password</Text>
            <Text style={styles.rowValue}>Requires your current password</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, styles.rowLast]}
          onPress={() => router.push('/change-email')}
        >
          <Feather name="mail" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Change sign-in email</Text>
            <Text style={styles.rowValue}>{user.email}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Data controls</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.row, styles.rowLast]}
          onPress={handleClearActivity}
          disabled={isClearing}
        >
          <Feather name="trash" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Clear activity history</Text>
            <Text style={styles.rowValue}>
              {summary?.activity_events
                ? `Delete ${summary.activity_events} saved activity records`
                : 'Nothing saved right now'}
            </Text>
          </View>
          {isClearing ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Feather name="info" size={16} color="#1e40af" />
        <Text style={styles.infoText}>
          Your past orders are kept even if you delete your account. They are payment records, and
          we need them for GST returns, refunds and payment disputes.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.policyBtn}
        // Opens the storefront's policy page rather than restating it here, so
        // there is only one version of the wording to keep accurate.
        onPress={() => Linking.openURL('https://kudl.in/privacy-policy')}
      >
        <Feather name="external-link" size={16} color="#2563eb" />
        <Text style={styles.policyText}>Read the full privacy policy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerBtn} onPress={() => router.push('/delete-account')}>
        <Feather name="trash-2" size={18} color="#ef4444" />
        <Text style={styles.dangerBtnText}>Delete my account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const Stat: React.FC<{ icon: any; label: string; value: number }> = ({ icon, label, value }) => (
  <View style={styles.stat}>
    <Feather name={icon} size={16} color="#2563eb" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ToggleRow: React.FC<{
  icon: any;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}> = ({ icon, title, description, value, onValueChange, isLast }) => (
  <View style={[styles.toggleRow, isLast && styles.rowLast]}>
    <Feather name={icon} size={20} color="#374151" style={styles.toggleIcon} />
    <View style={styles.rowBody}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
      thumbColor={value ? '#2563eb' : '#f3f4f6'}
      ios_backgroundColor="#e5e7eb"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 20,
  },
  cardIntro: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stat: {
    width: '50%',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  toggleIcon: {
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowValue: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 17,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  policyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    marginBottom: 8,
  },
  policyText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
