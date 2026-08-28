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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import {
  cancelEmailChange,
  confirmEmailChange,
  requestEmailChange,
} from '../src/services/api';

/**
 * Changing the account email, in two steps: enter the new address, then confirm
 * it with a one-time code.
 *
 * The code step is real UI against a real endpoint, but code DELIVERY is not
 * built yet — the backend reports this as `otp_required: false` and applies the
 * change on the strength of the session alone. Rather than hide the step or fake
 * it, the screen renders the code boxes and says plainly, in the banner, that no
 * code is being sent yet. When delivery lands, `otp_required` flips to true and
 * the only thing that changes here is that the banner and the button stop being
 * in "no code needed" mode.
 *
 * That is why the flow is two screens' worth of state rather than one submit:
 * the shape has to be right now so wiring the code in later is a backend change,
 * not a redesign.
 */

const CODE_LENGTH = 6;

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  const handleRequest = async () => {
    const email = newEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Check the address', 'Enter a valid email address.');
      return;
    }
    if (email === (user?.email || '').toLowerCase()) {
      Alert.alert('No change', 'That is already your email address.');
      return;
    }

    setIsBusy(true);
    try {
      const result = await requestEmailChange(email);
      setOtpRequired(result.otp_required);
      setCode('');
      setStep('code');
      // Focus after the step swap so the keyboard comes up on the code field
      // rather than on the email field that just unmounted.
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (e: any) {
      Alert.alert('Could not continue', e?.message || 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (otpRequired && code.length !== CODE_LENGTH) {
      Alert.alert('Enter the code', `Type the ${CODE_LENGTH}-digit code we sent you.`);
      return;
    }

    setIsBusy(true);
    try {
      await confirmEmailChange(otpRequired ? code : undefined);
      await refreshUser();
      Alert.alert(
        'Email updated',
        `You will sign in with ${newEmail.trim().toLowerCase()} from now on.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Could not update email', e?.message || 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartOver = async () => {
    setIsBusy(true);
    try {
      // Clears the staged address server-side too, so a mistyped one is not left
      // sitting on the account waiting to be confirmed for the next 15 minutes.
      await cancelEmailChange();
    } catch {
      // Best-effort: the staged address expires on its own, and blocking the
      // customer from editing their typo because the discard call failed would
      // be the worse outcome.
    } finally {
      setIsBusy(false);
      setCode('');
      setStep('email');
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
      {step === 'email' ? (
        <>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={26} color="#2563eb" />
          </View>
          <Text style={styles.title}>Change your email</Text>
          <Text style={styles.subtitle}>
            This is also how you sign in, so we will confirm the new address before switching.
          </Text>

          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>Current email</Text>
            <Text style={styles.currentValue}>{user.email}</Text>
          </View>

          <Text style={styles.label}>New email address</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isBusy && styles.primaryBtnDisabled]}
            onPress={handleRequest}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.iconCircle}>
            <Feather name="shield" size={26} color="#2563eb" />
          </View>
          <Text style={styles.title}>Verify the new address</Text>
          <Text style={styles.subtitle}>
            Enter the {CODE_LENGTH}-digit code sent to{' '}
            <Text style={styles.subtitleStrong}>{newEmail.trim().toLowerCase()}</Text>
          </Text>

          {!otpRequired && (
            <View style={styles.notice}>
              <Feather name="info" size={16} color="#92400e" />
              <Text style={styles.noticeText}>
                Code delivery isn&apos;t switched on yet, so no email has been sent and this step
                isn&apos;t checked. Tap Confirm to apply the change.
              </Text>
            </View>
          )}

          {/*
            One hidden input behind six boxes, rather than six inputs. Six real
            inputs mean manual focus juggling on every keystroke and on backspace,
            and they break paste and SMS autofill, which hand over the whole code
            at once.
          */}
          <Pressable style={styles.codeRow} onPress={() => codeInputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.codeBox,
                  i === code.length && styles.codeBoxActive,
                  !!code[i] && styles.codeBoxFilled,
                ]}
              >
                <Text style={styles.codeChar}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>

          <TextInput
            ref={codeInputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^\d]/g, '').slice(0, CODE_LENGTH))}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isBusy && styles.primaryBtnDisabled]}
            onPress={handleConfirm}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm new email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={handleStartOver} disabled={isBusy}>
            <Text style={styles.linkText}>Use a different address</Text>
          </TouchableOpacity>
        </>
      )}
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
  subtitleStrong: {
    color: '#111827',
    fontWeight: '600',
  },
  currentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginTop: 20,
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentValue: {
    fontSize: 15,
    color: '#111827',
    marginTop: 4,
    fontWeight: '500',
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
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 24,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxActive: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  codeBoxFilled: {
    borderColor: '#93c5fd',
    backgroundColor: '#ffffff',
  },
  codeChar: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  // Kept mounted and focusable but out of sight; `display: none` would stop it
  // receiving focus on Android.
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});
