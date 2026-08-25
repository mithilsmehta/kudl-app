import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

/**
 * Razorpay Checkout for the mobile app, rendered inside a WebView.
 *
 * Razorpay's own React Native package is a native module, which cannot run in Expo Go
 * — it would require leaving the managed workflow and building with EAS. Razorpay's web
 * Checkout is fully supported inside a WebView and needs no native code, so the app
 * keeps working in Expo Go.
 *
 * The page is built from a local HTML string rather than a hosted page, so no extra
 * server or route has to exist and nothing about the payment is stored off-device. The
 * key id and order id both come from the payment session the backend created.
 */

export type RazorpayHandshake = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type Props = {
  visible: boolean;
  keyId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  customer?: { name?: string; email?: string; contact?: string };
  onSuccess: (handshake: RazorpayHandshake) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

const buildHtml = (p: {
  keyId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  customer?: { name?: string; email?: string; contact?: string };
}) => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      html, body { margin:0; height:100%; background:#f9fafb;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
      .wrap { display:flex; height:100%; align-items:center; justify-content:center;
        color:#6b7280; font-size:14px; }
    </style>
  </head>
  <body>
    <div class="wrap">Opening secure payment…</div>
    <script>
      // Every outcome is reported to React Native through postMessage. The bridge is
      // the only channel: nothing is trusted from this page beyond the signed
      // handshake, which the backend verifies.
      var send = function (payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      };
      try {
        var rzp = new Razorpay({
          key: ${JSON.stringify(p.keyId)},
          order_id: ${JSON.stringify(p.orderId)},
          amount: ${JSON.stringify(p.amountInPaise)},
          currency: ${JSON.stringify(p.currency)},
          name: 'KUDL Pet Store',
          theme: { color: '#2563eb' },
          prefill: ${JSON.stringify({
            name: p.customer?.name || '',
            email: p.customer?.email || '',
            contact: p.customer?.contact || '',
          })},
          handler: function (res) { send({ type: 'success', payload: res }); },
          modal: { ondismiss: function () { send({ type: 'cancel' }); } }
        });
        rzp.on('payment.failed', function (e) {
          send({ type: 'error', message: (e && e.error && e.error.description) || 'Payment failed.' });
        });
        rzp.open();
      } catch (e) {
        send({ type: 'error', message: String((e && e.message) || e) });
      }
    </script>
  </body>
</html>`;

export default function RazorpayCheckout({
  visible,
  keyId,
  orderId,
  amountInPaise,
  currency,
  customer,
  onSuccess,
  onCancel,
  onError,
}: Props) {
  const [loading, setLoading] = useState(true);

  // Rebuilt only when the order changes, so re-renders never restart Checkout.
  const html = useMemo(
    () => buildHtml({ keyId, orderId, amountInPaise, currency, customer }),
    [keyId, orderId, amountInPaise, currency, customer]
  );

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      onError('Could not read the payment result.');
      return;
    }
    if (msg?.type === 'success' && msg.payload?.razorpay_payment_id) {
      onSuccess(msg.payload as RazorpayHandshake);
    } else if (msg?.type === 'cancel') {
      onCancel();
    } else {
      onError(msg?.message || 'The payment could not be completed.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={10} style={styles.close}>
            <Feather name="x" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Secure Payment</Text>
          <View style={styles.spacer} />
        </View>

        <WebView
          originWhitelist={['*']}
          source={{
            html,
            // Razorpay rejects requests from an opaque origin, so the WebView is given
            // a real https base URL for the document.
            baseUrl: 'https://checkout.razorpay.com',
          }}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          // UPI and netbanking hand off to bank pages and apps, so these must be allowed.
          setSupportMultipleWindows={false}
          startInLoadingState
          onError={() => onError('Could not load the payment page.')}
        />

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Opening secure payment…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  close: { padding: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  spacer: { width: 36 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    top: 56,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 13, color: '#6b7280' },
});
