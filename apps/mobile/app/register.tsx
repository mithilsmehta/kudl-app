import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { requestSignupOtp } from '../src/services/api';

/**
 * Creating an account, in two steps: details, then an emailed code.
 *
 * Nothing is created until the code is accepted. The first step only asks the
 * backend to send a code — abandon the flow there and no half-made account is
 * left behind. The password is held in component state between the steps and
 * submitted with the code, so the account is created in a single server call that
 * cannot be reached without passing verification.
 */

const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState<'details' | 'code'>('details');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [code, setCode] = useState('');
  const [emailSent, setEmailSent] = useState(true);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [resendIn, setResendIn] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  // Counts the resend cooldown down to zero. The backend enforces the real limit;
  // this only stops the customer tapping a button that is going to be refused.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (isResend = false) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Check the address', 'Enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Password too short', `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!firstName.trim() && !lastName.trim()) {
      Alert.alert('Add your name', 'Enter at least a first or last name.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestSignupOtp(cleanEmail);
      setEmailSent(result.email_sent);
      setExpiresInMinutes(result.expires_in_minutes);
      setResendIn(result.resend_after_seconds);
      if (!isResend) {
        setCode('');
        setStep('code');
        // Focus after the swap, so the keyboard opens on the code field rather
        // than the email field that just unmounted.
        setTimeout(() => codeInputRef.current?.focus(), 100);
      } else {
        setCode('');
        Alert.alert('Code sent', 'We have sent you a new code.');
      }
    } catch (e: any) {
      Alert.alert('Could not send the code', e?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Enter the code', `Type the ${CODE_LENGTH}-digit code we emailed you.`);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        code,
        first_name: firstName,
        last_name: lastName,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not create your account', e?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {step === 'details' ? (
        <>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join KUDL for seamless shopping</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="john@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Text style={styles.hint}>We will email you a code to verify this address.</Text>

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={() => sendCode()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.switchText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={26} color="#2563eb" />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a {CODE_LENGTH}-digit code to{' '}
            <Text style={styles.subtitleStrong}>{email.trim().toLowerCase()}</Text>
          </Text>

          {!emailSent && (
            <View style={styles.notice}>
              <Feather name="info" size={16} color="#92400e" />
              <Text style={styles.noticeText}>
                Email sending isn&apos;t configured on this backend yet, so no email was sent.
                The code was printed in the backend terminal instead.
              </Text>
            </View>
          )}

          {/*
            One hidden input behind six boxes, rather than six inputs. Six real
            inputs mean juggling focus on every keystroke and on backspace, and
            they break paste and autofill, which hand over the whole code at once.
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
            onChangeText={(t) => setCode(t.replace(/[^\d]/g, '').slice(0, CODE_LENGTH))}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />

          <Text style={styles.expiry}>This code expires in {expiresInMinutes} minutes.</Text>

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => sendCode(true)}
            disabled={isLoading || resendIn > 0}
          >
            <Text style={[styles.switchText, resendIn > 0 && styles.switchTextMuted]}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep('details')}
            disabled={isLoading}
          >
            <Text style={styles.backText}>Use a different email</Text>
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
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    marginTop: 4,
    lineHeight: 20,
  },
  subtitleStrong: {
    color: '#111827',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: '#111827',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
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
    marginTop: 20,
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
  // Kept mounted and focusable but out of sight. `display: none` would stop it
  // receiving focus on Android.
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  expiry: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 14,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  switchTextMuted: {
    color: '#9ca3af',
  },
  backBtn: {
    marginTop: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  backText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
