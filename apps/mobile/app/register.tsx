import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.message || 'Could not register customer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join KUDL for seamless shopping</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="John"
      />

      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Doe"
      />

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="john@example.com"
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

      <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>Register</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchBtn} onPress={() => router.replace('/login')}>
        <Text style={styles.switchText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
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
    marginBottom: 30,
  },
  switchText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});
