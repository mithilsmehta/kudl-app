"use client"

/**
 * Home — port of apps/mobile/app/(tabs)/index.tsx.
 *
 * Section order, copy and colours follow the app. The layout adapts: the
 * gradient header collapses into the desktop TopNav on md+, the two pet tiles
 * spread wider, and the horizontally-scrolling featured rail becomes a grid.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Search,
  ShoppingCart,
  ShoppingBag,
  Heart,
  ArrowRight,
  ChevronRight,
  Truck,
  Shield,
  RefreshCw,
  Grid,
} from "@/components/icons"
import { Product, getProducts, getCategories } from "@/lib/api"
import {
  PET_THEMES,
  PET_THEME_FALLBACK,
  FREE_DELIVERY_SHORT,
  FREE_DELIVERY_SUB,
  FREE_DELIVERY_COUPON,
  FREE_DELIVERY_MIN_SUBTOTAL,
} from "@/lib/config"
import { useAuth } from "@/context/AuthContext"
import { useCart } from "@/context/CartContext"
import ProductImage from "@/components/ProductImage"
import Spinner from "@/components/Spinner"
import { formatProductPrice } from "@/components/ProductCard"
import PersonalizedRecommendations from "@/components/recommendations/PersonalizedRecommendations"

const TRUST_BADGES = [
  { Icon: Truck, label: "Free Delivery", sub: FREE_DELIVERY_SUB },
  { Icon: Shield, label: "100% Genuine", sub: "Vet approved" },
  { Icon: RefreshCw, label: "Easy Returns", sub: "7 day policy" },
]

export default function HomePage() {
  const { itemCount } = useCart()
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prods, cats] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
        if (cancelled) return
        setProducts(prods)
        setCategories(cats)
      } catch (e) {
        console.log("Error loading home data:", e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Use a real product image from the category as the pet-card artwork.
  const imageForCategory = (categoryId: string) =>
    products.find(
      (p) => p.categories?.some((c) => c.id === categoryId) && p.thumbnail
    )?.thumbnail

  const featured = products.slice(0, 6)
  const firstName = user?.first_name

  return (
    <div>
      {/* ---- Mobile gradient header (desktop uses TopNav) ---- */}
      <div className="rounded-b-kudl-header bg-kudl-header px-4 pb-5 pt-4 md:hidden">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-blue-200">
              {firstName ? `Hello, ${firstName}` : "Welcome to"}
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold text-white">
              KUDL Pet Store
            </p>
          </div>

          <Link
            href="/cart"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.18] text-white"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-kudl-dark bg-kudl-danger px-1 text-[10px] font-extrabold leading-none text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Search — tapping jumps to the full catalogue, as in the app */}
        <Link
          href="/products"
          className="flex h-12 items-center gap-2.5 rounded-[14px] bg-white px-3.5"
        >
          <Search className="h-[18px] w-[18px] text-kudl-faint" aria-hidden="true" />
          <span className="text-sm text-kudl-faint">
            Search for food, toys, treats...
          </span>
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---- Hero promo ---- */}
        <section className="mt-5 md:mt-8">
          <div className="flex items-center overflow-hidden rounded-kudl-hero bg-kudl-hero p-5 md:p-10">
            <div className="flex-1">
              <span className="inline-block rounded-md bg-amber-700/15 px-2 py-1 text-[10px] font-extrabold tracking-wider text-kudl-amber-body">
                NEW ARRIVALS
              </span>
              <h1 className="mt-2 text-[21px] font-extrabold leading-[27px] text-kudl-amber-ink md:text-4xl md:leading-tight">
                Everything your
                <br />
                pet needs
              </h1>
              <p className="mt-1.5 text-[12.5px] text-kudl-amber-body md:text-base">
                Curated food, toys &amp; care essentials
              </p>
              <Link
                href="/products"
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-kudl-ink px-4 py-2.5 text-[13.5px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Shop Now
                <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
              </Link>
            </div>
            <div className="ml-2 shrink-0">
              <Heart
                className="h-[72px] w-[72px] opacity-35 md:h-40 md:w-40"
                style={{ color: "#f59e0b" }}
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* ---- Shop by pet ---- */}
        {categories.length > 0 && (
          <section className="mt-5 md:mt-10">
            <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
              Shop by Pet
            </h2>
            {/*
              Two columns on phones, three from md up. Previously hard-coded to
              two, which left a third category sitting alone at half width.
              auto-rows-fr keeps every tile the same height regardless of count.
            */}
            <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
              {categories.map((cat) => {
                const theme = PET_THEMES[cat.name] || PET_THEME_FALLBACK
                const image = imageForCategory(cat.id)
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="relative block h-[150px] overflow-hidden rounded-kudl-tile bg-kudl-border md:h-[260px]"
                  >
                    <ProductImage
                      src={image}
                      alt={`${cat.name} products`}
                      sizes="(max-width: 767px) 50vw, 560px"
                      iconClassName="h-10 w-10"
                    />
                    {/* Gradient scrim so the white label stays readable over any photo */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-[72%]"
                      style={{
                        backgroundImage: `linear-gradient(to bottom, transparent, ${theme.to})`,
                      }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-x-3.5 bottom-3">
                      <p className="text-lg font-extrabold text-white md:text-2xl">
                        {cat.name}
                      </p>
                      <p className="mt-px text-[11.5px] text-white/90 md:text-sm">
                        {theme.tagline}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ---- Trust badges ---- */}
        <section className="mt-5 grid grid-cols-3 rounded-2xl border border-kudl-border bg-white py-3.5 md:mt-10 md:py-6">
          {TRUST_BADGES.map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center px-1 text-center">
              <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-kudl-tint">
                <Icon className="h-[17px] w-[17px] text-kudl-primary" aria-hidden="true" />
              </span>
              <p className="text-xs font-bold text-kudl-ink md:text-sm">{label}</p>
              <p className="mt-px text-[10.5px] text-kudl-faint md:text-xs">{sub}</p>
            </div>
          ))}
        </section>

        {/*
          Free delivery is coupon-gated, not automatic — the backend seeds flat
          ₹99/₹199 shipping. Spelling out the code here keeps the badge above
          honest about what actually happens at checkout.
        */}
        <p className="mt-2 text-center text-[11px] text-kudl-faint">
          Free delivery applies with code{" "}
          <span className="font-semibold text-kudl-muted">{FREE_DELIVERY_COUPON}</span>{" "}
          on orders above ₹{FREE_DELIVERY_MIN_SUBTOTAL}. {FREE_DELIVERY_SHORT} is
          entered at checkout.
        </p>

        {/* ---- Personalized recommendations ---- */}
        <PersonalizedRecommendations />

        {/* ---- Featured products ---- */}
        <section className="mt-5 md:mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-kudl-ink md:text-2xl">
              Featured Products
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-0.5 text-[13px] font-semibold text-kudl-primary"
            >
              View All
              <ChevronRight className="h-[15px] w-[15px]" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-7 w-7 text-kudl-primary" label="Loading products" />
            </div>
          ) : featured.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-kudl-border bg-white py-8">
              <ShoppingBag className="h-9 w-9 text-kudl-hairline" aria-hidden="true" />
              <p className="mt-2 text-[13px] text-kudl-muted">
                No products available yet
              </p>
            </div>
          ) : (
            /*
              The app scrolls this rail horizontally. That's kept on mobile, but
              on md+ there's room to show every card at once, so it becomes a grid.
            */
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 xl:grid-cols-6">
              {featured.map((item) => (
                <li
                  key={item.id}
                  className="w-40 shrink-0 snap-start md:w-auto"
                >
                  <Link
                    href={`/product/${item.id}`}
                    className="block h-full overflow-hidden rounded-2xl border border-kudl-border bg-white transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[1/0.95] w-full bg-kudl-surface">
                      <ProductImage
                        src={item.thumbnail}
                        alt={item.title}
                        sizes="(max-width: 767px) 160px, 200px"
                        iconClassName="h-7 w-7"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-kudl-faint">
                        {item.categories?.[0]?.name || "Collection"}
                      </p>
                      <p className="mt-1 line-clamp-2 min-h-[34px] text-[13px] font-semibold text-kudl-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-kudl-primary">
                        {formatProductPrice(item)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Full catalogue CTA ---- */}
        <section className="mt-5 md:mt-10">
          <Link
            href="/products"
            className="flex items-center gap-3 rounded-2xl border border-kudl-border bg-white p-3.5 transition-shadow hover:shadow-md"
          >
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-kudl-primary">
              <Grid className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-bold text-kudl-ink">
                Browse full catalogue
              </span>
              <span className="mt-0.5 block text-xs text-kudl-muted">
                {products.length} {products.length === 1 ? "product" : "products"}{" "}
                across all categories
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-kudl-faint" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  )
}
