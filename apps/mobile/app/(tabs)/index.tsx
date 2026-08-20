import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product, getProducts, getCategories } from '../../src/services/api';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { formatCurrency } from '../../src/utils/currency';

const { width } = Dimensions.get('window');
const PET_CARD_WIDTH = (width - 44) / 2;
const FEATURED_CARD_WIDTH = 160;

// Visual treatment per pet category — keyed by the category name from Medusa.
const PET_THEMES: Record<string, { colors: [string, string]; icon: keyof typeof Feather.glyphMap; tagline: string }> = {
  Dogs: { colors: ['#2563eb', '#1e40af'], icon: 'github', tagline: 'Food, toys & care' },
  Cats: { colors: ['#f59e0b', '#d97706'], icon: 'heart', tagline: 'Treats & essentials' },
};

const TRUST_BADGES = [
  { icon: 'truck' as const, label: 'Free Delivery', sub: 'Above ₹499' },
  { icon: 'shield' as const, label: '100% Genuine', sub: 'Vet approved' },
  { icon: 'refresh-cw' as const, label: 'Easy Returns', sub: '7 day policy' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.log('Error loading home data:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatPrice = (product: Product) => {
    const calc = product.variants?.[0]?.calculated_price;
    if (calc?.calculated_amount) {
      return formatCurrency(calc.calculated_amount, calc.currency_code);
    }
    return 'Price unavailable';
  };

  // Use a real product image from the category as the pet-card artwork.
  const imageForCategory = (categoryId: string) =>
    products.find((p) => p.categories?.some((c) => c.id === categoryId) && p.thumbnail)?.thumbnail;

  const featured = products.slice(0, 6);
  const firstName = user?.first_name;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ---- Header ---- */}
        <LinearGradient
          colors={['#1e3a8a', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                {firstName ? `Hello, ${firstName}` : 'Welcome to'}
              </Text>
              <Text style={styles.brand}>KUDL Pet Store</Text>
            </View>

            <TouchableOpacity style={styles.cartIconBtn} onPress={() => router.push('/(tabs)/cart')}>
              <Feather name="shopping-cart" size={20} color="#ffffff" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search — tapping jumps to the full catalogue */}
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/products')}
          >
            <Feather name="search" size={18} color="#9ca3af" />
            <Text style={styles.searchPlaceholder}>Search for food, toys, treats...</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ---- Hero promo ---- */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#fef3c7', '#fde68a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>NEW ARRIVALS</Text>
              </View>
              <Text style={styles.heroTitle}>Everything your{'\n'}pet needs</Text>
              <Text style={styles.heroSub}>Curated food, toys & care essentials</Text>
              <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/products')}>
                <Text style={styles.heroBtnText}>Shop Now</Text>
                <Feather name="arrow-right" size={15} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroIconWrap}>
              <Feather name="heart" size={72} color="#f59e0b" style={{ opacity: 0.35 }} />
            </View>
          </LinearGradient>
        </View>

        {/* ---- Shop by pet ---- */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Pet</Text>
            </View>

            <View style={styles.petRow}>
              {categories.map((cat) => {
                const theme = PET_THEMES[cat.name] || {
                  colors: ['#6b7280', '#4b5563'] as [string, string],
                  icon: 'shopping-bag' as const,
                  tagline: 'Explore range',
                };
                const image = imageForCategory(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.petCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/(tabs)/products?category=${cat.id}`)}
                  >
                    {image ? (
                      <Image source={{ uri: image }} style={styles.petImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.petImage, styles.petImageFallback]} />
                    )}
                    <LinearGradient
                      colors={['transparent', theme.colors[1]]}
                      style={styles.petOverlay}
                    />
                    <View style={styles.petContent}>
                      <Text style={styles.petName}>{cat.name}</Text>
                      <Text style={styles.petTagline}>{theme.tagline}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ---- Trust badges ---- */}
        <View style={styles.trustRow}>
          {TRUST_BADGES.map((badge) => (
            <View key={badge.label} style={styles.trustItem}>
              <View style={styles.trustIconWrap}>
                <Feather name={badge.icon} size={17} color="#2563eb" />
              </View>
              <Text style={styles.trustLabel}>{badge.label}</Text>
              <Text style={styles.trustSub}>{badge.sub}</Text>
            </View>
          ))}
        </View>

        {/* ---- Featured products ---- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/(tabs)/products')}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={15} color="#2563eb" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} />
          ) : featured.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="shopping-bag" size={36} color="#d1d5db" />
              <Text style={styles.emptyText}>No products available yet</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            >
              {featured.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featuredCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/product/${item.id}`)}
                >
                  <View style={styles.featuredImageWrap}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={styles.featuredImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.featuredImagePlaceholder}>
                        <Feather name="shopping-bag" size={26} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredCategory} numberOfLines={1}>
                      {item.categories?.[0]?.name || 'Collection'}
                    </Text>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.featuredPrice}>{formatPrice(item)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ---- Full catalogue CTA ---- */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.catalogueCard}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/products')}
          >
            <View style={styles.catalogueIconWrap}>
              <Feather name="grid" size={20} color="#ffffff" />
            </View>
            <View style={styles.catalogueText}>
              <Text style={styles.catalogueTitle}>Browse full catalogue</Text>
              <Text style={styles.catalogueSub}>
                {products.length} {products.length === 1 ? 'product' : 'products'} across all categories
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 13,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  cartIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1e40af',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },

  /* Sections */
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },

  /* Hero */
  heroCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(180,83,9,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#78350f',
    lineHeight: 27,
  },
  heroSub: {
    fontSize: 12.5,
    color: '#92400e',
    marginTop: 5,
    marginBottom: 14,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  heroIconWrap: {
    marginLeft: 8,
  },

  /* Shop by pet */
  petRow: {
    flexDirection: 'row',
    gap: 12,
  },
  petCard: {
    width: PET_CARD_WIDTH,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  petImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  petImageFallback: {
    backgroundColor: '#d1d5db',
  },
  petOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
  },
  petContent: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  petName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  petTagline: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },

  /* Trust */
  trustRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  trustLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  trustSub: {
    fontSize: 10.5,
    color: '#9ca3af',
    marginTop: 1,
  },

  /* Featured */
  featuredList: {
    paddingRight: 8,
    gap: 12,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  featuredImageWrap: {
    width: '100%',
    height: FEATURED_CARD_WIDTH * 0.95,
    backgroundColor: '#f3f4f6',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredContent: {
    padding: 10,
  },
  featuredCategory: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 3,
    minHeight: 34,
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
    marginTop: 4,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },

  /* Catalogue CTA */
  catalogueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 12,
  },
  catalogueIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogueText: {
    flex: 1,
  },
  catalogueTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
  },
  catalogueSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
