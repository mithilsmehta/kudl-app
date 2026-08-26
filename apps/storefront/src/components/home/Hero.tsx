"use client"

/**
 * Rotating hero banner. Slide 1 reuses the mobile app's amber promo gradient
 * (kudl-hero) verbatim; slides 2-3 are web-only additions using the same
 * "pastel-to-pastel diagonal" recipe so they read as siblings, not tacked on.
 */

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, Heart, ShoppingBag, Tag } from "@/components/icons"
import { Blob, PawPatternBackground } from "@/components/home/decor"

interface Slide {
  badge: string
  heading: [string, string]
  subtext: string
  ctaLabel: string
  ctaHref: string
  background: string
  badgeClassName: string
  headingClassName: string
  subtextClassName: string
  Icon: typeof Heart
  iconColor: string
  blobColor: string
}

const SLIDES: Slide[] = [
  {
    badge: "NEW ARRIVALS",
    heading: ["Everything your", "pet needs"],
    subtext: "Curated food, toys & care essentials",
    ctaLabel: "Shop Now",
    ctaHref: "/products",
    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    badgeClassName: "bg-amber-700/15 text-kudl-amber-body",
    headingClassName: "text-kudl-amber-ink",
    subtextClassName: "text-kudl-amber-body",
    Icon: Heart,
    iconColor: "#f59e0b",
    blobColor: "#fbbf24",
  },
  {
    badge: "TRENDING",
    heading: ["Premium nutrition,", "happier pets"],
    subtext: "Vet-recommended food & supplements",
    ctaLabel: "Shop Nutrition",
    ctaHref: "/products?q=food",
    background: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)",
    badgeClassName: "bg-blue-900/15 text-kudl-darker",
    headingClassName: "text-kudl-darker",
    subtextClassName: "text-kudl-dark",
    Icon: ShoppingBag,
    iconColor: "#2563eb",
    blobColor: "#60a5fa",
  },
  {
    badge: "SALE",
    heading: ["Toys & treats", "they'll love"],
    subtext: "Save on best-selling chews and toys",
    ctaLabel: "Shop Deals",
    ctaHref: "/products?q=treat",
    background: "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)",
    badgeClassName: "bg-emerald-900/15 text-emerald-900",
    headingClassName: "text-emerald-950",
    subtextClassName: "text-emerald-800",
    Icon: Tag,
    iconColor: "#059669",
    blobColor: "#34d399",
  },
]

const AUTO_ROTATE_MS = 5000

export default function Hero() {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, AUTO_ROTATE_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, prefersReducedMotion])

  const goTo = (next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length)
  }

  const slide = SLIDES[index]

  return (
    <section
      className="group relative mt-5 overflow-hidden rounded-kudl-hero md:mt-8"
      style={{ background: slide.background }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      {/* Decorative depth layer — blurred blobs + a faint paw texture, both clipped to the rounded banner */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Blob
          className="absolute -right-6 -top-10 h-40 w-40 opacity-40 blur-sm animate-blob md:h-64 md:w-64"
          color={slide.blobColor}
        />
        <Blob
          className="absolute -bottom-16 left-10 h-32 w-32 opacity-25 blur-sm animate-blob md:h-48 md:w-48"
          color={slide.blobColor}
          style={{ animationDelay: "-3s" }}
        />
        <PawPatternBackground className="absolute inset-0 h-full w-full opacity-[0.06] text-kudl-ink" />
      </div>

      <div className="relative flex items-center p-5 md:p-10">
        <div className="flex-1">
          <span
            className={`inline-block rounded-md px-2 py-1 text-[10px] font-extrabold tracking-wider ${slide.badgeClassName}`}
          >
            {slide.badge}
          </span>
          <h1
            className={`mt-2 text-[21px] font-extrabold leading-[27px] md:text-4xl md:leading-tight ${slide.headingClassName}`}
          >
            {slide.heading[0]}
            <br />
            {slide.heading[1]}
          </h1>
          <p className={`mt-1.5 text-[12.5px] md:text-base ${slide.subtextClassName}`}>
            {slide.subtext}
          </p>
          <Link
            href={slide.ctaHref}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-[10px] bg-kudl-ink px-4 py-2.5 text-[13.5px] font-bold text-white transition-opacity hover:opacity-90"
          >
            {slide.ctaLabel}
            <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </Link>
        </div>
        <div className="ml-2 shrink-0">
          <slide.Icon
            className="h-[72px] w-[72px] opacity-35 md:h-40 md:w-40"
            style={{ color: slide.iconColor }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Arrows — desktop hover only */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-kudl-ink opacity-0 transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 md:flex"
      >
        <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-kudl-ink opacity-0 transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 md:flex"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.badge}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}: ${s.badge}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary ${
              i === index ? "w-5 bg-kudl-ink/70" : "w-1.5 bg-kudl-ink/30"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
