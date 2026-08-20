import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { MEDUSA_BACKEND_URL } from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Feather name="user" size={36} color="#2563eb" />
        </View>

        {user ? (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : 'KUDL Customer'}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        ) : (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Welcome Guest</Text>
            <Text style={styles.userEmail}>Sign in to save orders & checkout faster</Text>
          </View>
        )}
      </View>

      {/* Guest Auth Buttons */}
      {!user && (
        <View style={styles.authBtnRow}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/login')}
          >
            <Feather name="log-in" size={18} color="#ffffff" />
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/register')}
          >
            <Feather name="user-plus" size={18} color="#2563eb" />
            <Text style={styles.registerBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu List */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push(user ? '/orders' : '/login')}
        >
          <Feather name="package" size={20} color="#374151" />
          <Text style={styles.menuText}>My Orders</Text>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push(user ? '/addresses' : '/login')}
        >
          <Feather name="map-pin" size={20} color="#374151" />
          <Text style={styles.menuText}>My Addresses</Text>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Feather name="settings" size={20} color="#374151" />
          <Text style={styles.menuText}>Account Settings</Text>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Feather name="shield" size={20} color="#374151" />
          <Text style={styles.menuText}>Privacy & Security</Text>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Backend connection info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Medusa Backend URL</Text>
        <Text style={styles.infoText}>{MEDUSA_BACKEND_URL}</Text>
      </View>

      {/* Logout button */}
      {user && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      )}
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
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  authBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  loginBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  registerBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  registerBtnText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 13,
    color: '#1e3a8a',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    height: 48,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
