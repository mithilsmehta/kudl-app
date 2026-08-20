import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#ffffff',
              },
              headerTintColor: '#111827',
              headerTitleStyle: {
                fontWeight: '600',
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: 'Product Details', headerBackTitle: 'Back' }} />
            <Stack.Screen name="orders" options={{ title: 'My Orders', headerBackTitle: 'Back' }} />
            <Stack.Screen name="order/[id]" options={{ title: 'Order Details', headerBackTitle: 'Back' }} />
            <Stack.Screen name="checkout" options={{ title: 'Checkout', headerBackTitle: 'Back' }} />
            <Stack.Screen name="addresses" options={{ title: 'My Addresses', headerBackTitle: 'Back' }} />
            <Stack.Screen name="login" options={{ title: 'Sign In', presentation: 'modal' }} />
            <Stack.Screen name="register" options={{ title: 'Create Account', presentation: 'modal' }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
