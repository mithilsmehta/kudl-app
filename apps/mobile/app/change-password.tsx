import React, { useEffect, useState } from 'react';
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
import { changeCustomerPassword } from '../src/services/api';

/**
 * Changing the password while signed in.
 *
 * The current password is required, and that requirement is the whole security
 * value of this screen: without it, an unlocked phone is enough to lock the real
 * owner out of their account. The backend enforces it too — this is not a
 * client-side courtesy.
 */

const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing details', 'Enter your current and new password.');
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      Alert.alert('Too short', `Your new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    // Caught here as well as in the backend so the customer is told before the
    // round trip, and told about the field rather than about a rejected request.
    if (newPassword === currentPassword) {
      Alert.alert('No change', 'Your new password must be different from your current one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter your new password to confirm it.');
      return;
    }

    setIsBusy(true);
    try {
      await changeCustomerPassword(currentPassword, newPassword);
      Alert.alert('Password changed', 'Use your new password next time you sign in.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not change password', e?.message || 'Please try again.');
    } finally {
      setIsBusy(false);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.iconCircle}>
        <Feather name="lock" size={26} color="#2563eb" />
      </View>
      <Text style={styles.title}>Change password</Text>
      <Text style={styles.subtitle}>
        Enter your current password to confirm it&apos;s you, then pick a new one.
      </Text>

      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="••••••••"
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoComplete="current-password"
      />

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="At least 8 characters"
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoComplete="new-password"
      />

      <Text style={styles.label}>Confirm new password</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter the new password"
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoComplete="new-password"
      />

      <TouchableOpacity style={styles.revealBtn} onPress={() => setReveal((r) => !r)}>
        <Feather name={reveal ? 'eye-off' : 'eye'} size={16} color="#2563eb" />
        <Text style={styles.revealText}>{reveal ? 'Hide passwords' : 'Show passwords'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, isBusy && styles.primaryBtnDisabled]}
        onPress={handleSubmit}
        disabled={isBusy}
      >
        {isBusy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryBtnText}>Update password</Text>
        )}
      </TouchableOpacity>

      {/*
        Said out loud because the opposite is the common assumption. Medusa's
        customer tokens are stateless JWTs, so there is no server-side session to
        revoke and a password change cannot sign other devices out.
      */}
      <Text style={styles.footnote}>
        Changing your password does not sign you out on other devices. Tokens already issued stay
        valid until they expire.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: '#111827',
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  revealText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footnote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 16,
    lineHeight: 18,
  },
});
