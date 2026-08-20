import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      router.back();
    } catch (e: any) {
      Alert.alert('Login Failed', e?.message || 'Invalid credentials or backend unreached.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your KUDL account</Text>

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="customer@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>Sign In</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchBtn} onPress={() => router.replace('/register')}>
        <Text style={styles.switchText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#ffffff',
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
    marginBottom: 24,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: '#111827',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
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
});
