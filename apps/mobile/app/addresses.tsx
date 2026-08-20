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
import {
  Address,
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
} from '../src/services/api';

export default function AddressesScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const list = await getCustomerAddresses();
      setAddresses(list);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setAddress1('');
    setCity('');
    setPostalCode('');
    setPhone('');
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (addr: Address) => {
    setFirstName(addr.first_name);
    setLastName(addr.last_name);
    setAddress1(addr.address_1);
    setCity(addr.city);
    setPostalCode(addr.postal_code);
    setPhone(addr.phone.replace('+91', ''));
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !address1 || !city || !postalCode || phone.length !== 10) {
      Alert.alert('Missing Fields', 'Please fill in all fields — phone number must be 10 digits.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        address_1: address1,
        city,
        postal_code: postalCode,
        phone: `+91${phone}`,
      };
      const updated = editingId
        ? await updateCustomerAddress(editingId, payload)
        : await createCustomerAddress({ ...payload, is_default_shipping: addresses.length === 0 });
      setAddresses(updated);
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', `Remove "${addr.address_1}, ${addr.city}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomerAddress(addr.id);
            await loadAddresses();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete address.');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (addr: Address) => {
    try {
      const updated = await updateCustomerAddress(addr.id, { is_default_shipping: true });
      setAddresses(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to set default address.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!showForm ? (
        <>
          {addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="map-pin" size={56} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptySubtitle}>Add an address to speed up checkout.</Text>
            </View>
          ) : (
            addresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressNameRow}>
                    <Text style={styles.addressName}>{addr.first_name} {addr.last_name}</Text>
                    {addr.is_default_shipping && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.addressText}>{addr.address_1}</Text>
                <Text style={styles.addressText}>{addr.city} - {addr.postal_code}</Text>
                <Text style={styles.addressText}>{addr.phone}</Text>

                <View style={styles.addressActions}>
                  {!addr.is_default_shipping && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(addr)}>
                      <Feather name="check-circle" size={14} color="#2563eb" />
                      <Text style={styles.actionBtnText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(addr)}>
                    <Feather name="edit-2" size={14} color="#374151" />
                    <Text style={[styles.actionBtnText, { color: '#374151' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(addr)}>
                    <Feather name="trash-2" size={14} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addAddressBtn} onPress={startAdd}>
            <Feather name="plus" size={18} color="#2563eb" />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Address' : 'Add New Address'}</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>First Name</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
            </View>
          </View>

          <Text style={styles.label}>Street Address</Text>
          <TextInput style={styles.input} value={address1} onChangeText={setAddress1} placeholder="House no., street, area" />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>City</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" maxLength={6} placeholder="110001" />
            </View>
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="98765 43210"
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#ffffff" /> : (
              <Text style={styles.primaryBtnText}>{editingId ? 'Save Changes' : 'Save Address'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm} disabled={isSaving}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  addressHeader: {
    marginBottom: 6,
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  addressText: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 48,
    marginTop: 4,
  },
  addAddressText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
