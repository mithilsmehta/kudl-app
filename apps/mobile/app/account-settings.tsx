import React, { useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

/**
 * Account Settings — the editable half of the profile.
 *
 * Split three ways by how much proof each change needs, which is also why they
 * are not one big Save button:
 *
 *   - Name, phone and company: no proof. Saved inline here.
 *   - Email: proof that the new address is reachable, because it is also the
 *     login identifier. Own screen, own two-step flow.
 *   - Password: proof of the current password. Own screen.
 *
 * Delete Account sits at the bottom, visually separated, and is the only route
 * out of here that cannot be undone.
 */
export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading, updateProfile, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  // Re-seeds the form from the customer record whenever it changes — including
  // on the way back from the email screen, so a just-changed address shows
  // immediately instead of the stale one this screen loaded with.
  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setPhone(user.phone || '');
    setCompanyName(user.company_name || '');
  }, [user]);

  // The email row is rendered from `user`, and the email screen changes it on
  // the server. Without this the customer comes back to their old address.
  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, []),
  );

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      firstName.trim() !== (user.first_name || '') ||
      lastName.trim() !== (user.last_name || '') ||
      phone.trim() !== (user.phone || '') ||
      companyName.trim() !== (user.company_name || '')
    );
  }, [user, firstName, lastName, phone, companyName]);

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      Alert.alert('Add your name', 'Enter at least a first or last name.');
      return;
    }

    // Deliberately loose: 10 digits after stripping spaces, dashes and a +91.
    // Indian mobile numbers get written half a dozen ways and rejecting a valid
    // one is worse than storing a slightly odd one.
    const digits = phone.replace(/[^\d]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (phone.trim() && digits.length !== 10) {
      Alert.alert('Check the phone number', 'Enter a 10-digit mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim() ? digits : '',
        company_name: companyName,
      });
      Alert.alert('Saved', 'Your details have been updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Personal details</Text>
      <View style={styles.card}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>Used for delivery updates and order calls.</Text>

        {/* <Text style={styles.label}>Company (optional)</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="For GST invoices"
          autoCapitalize="words"
        /> */}

        <TouchableOpacity
          style={[styles.primaryBtn, (!isDirty || isSaving) && styles.primaryBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Sign-in & security</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/change-email')}>
          <Feather name="mail" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Email address</Text>
            <Text style={styles.rowValue}>{user.email}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/change-password')}>
          <Feather name="lock" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Password</Text>
            <Text style={styles.rowValue}>Change your password</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={() => router.push('/privacy-security')}>
          <Feather name="shield" size={20} color="#374151" />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Privacy & security</Text>
            <Text style={styles.rowValue}>Data, tracking and permissions</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Danger zone</Text>
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.dangerText}>Permanently removes your profile, addresses, pets and activity history.</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={() => router.push('/delete-account')}>
          <Feather name="trash-2" size={18} color="#ef4444" />
          <Text style={styles.dangerBtnText}>Delete my account</Text>
        </TouchableOpacity>
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowValue: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  dangerCard: {
    borderColor: '#fecaca',
    backgroundColor: '#fffbfb',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#b91c1c',
  },
  dangerText: {
    fontSize: 13,
    color: '#7f1d1d',
    marginTop: 6,
    lineHeight: 19,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    marginTop: 16,
  },
  dangerBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
