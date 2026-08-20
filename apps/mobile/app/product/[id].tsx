import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Product, ProductVariant, getProductById } from '../../src/services/api';
import { useCart } from '../../src/context/CartContext';
import { formatCurrency } from '../../src/utils/currency';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const data = await getProductById(id as string);
      setProduct(data);
      if (data?.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
    } catch (e) {
      console.log('Error loading product detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setIsAdding(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const formatPrice = () => {
    if (!selectedVariant) return 'Price unavailable';
    const calc = selectedVariant.calculated_price;
    if (calc?.calculated_amount) {
      return formatCurrency(calc.calculated_amount, calc.currency_code);
    }
    const price = selectedVariant.prices?.[0];
    if (price?.amount) {
      return formatCurrency(price.amount, price.currency_code);
    }
    return 'Price unavailable';
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Product not found.</Text>
      </View>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images.map((i) => i.url)
    : product.thumbnail
    ? [product.thumbnail]
    : [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Images Carousel */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
          {images.length > 0 ? (
            images.map((url, idx) => (
              <Image key={idx} source={{ uri: url }} style={styles.image} resizeMode="cover" />
            ))
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="shopping-bag" size={48} color="#9ca3af" />
            </View>
          )}
        </ScrollView>

        <View style={styles.detailsContainer}>
          <Text style={styles.categoryTag}>{product.categories?.[0]?.name || 'Apparel'}</Text>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>{formatPrice()}</Text>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {/* Variants Selection */}
          {product.variants && product.variants.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Option</Text>
              <View style={styles.variantGrid}>
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <TouchableOpacity
                      key={variant.id}
                      style={[styles.variantChip, isSelected && styles.variantChipSelected]}
                      onPress={() => setSelectedVariant(variant)}
                    >
                      <Text style={[styles.variantText, isSelected && styles.variantTextSelected]}>
                        {variant.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Feather name="minus" size={16} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Feather name="plus" size={16} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Add to Cart Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, addedSuccess && styles.addBtnSuccess]}
          onPress={handleAddToCart}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color="#ffffff" />
          ) : addedSuccess ? (
            <View style={styles.btnContent}>
              <Feather name="check" size={20} color="#ffffff" />
              <Text style={styles.btnText}>Added to Cart!</Text>
            </View>
          ) : (
            <View style={styles.btnContent}>
              <Feather name="shopping-bag" size={20} color="#ffffff" />
              <Text style={styles.btnText}>Add to Cart</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6b7280',
  },
  carousel: {
    width: width,
    height: width * 1.1,
    backgroundColor: '#f3f4f6',
  },
  image: {
    width: width,
    height: width * 1.1,
  },
  imagePlaceholder: {
    width: width,
    height: width * 1.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 20,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  variantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  variantChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  variantText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  variantTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  qtyBtn: {
    padding: 10,
  },
  qtyText: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnSuccess: {
    backgroundColor: '#059669',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
