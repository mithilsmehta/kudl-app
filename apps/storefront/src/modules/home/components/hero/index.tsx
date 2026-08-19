import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BadgeCheck, ShieldCheck, Truck } from "lucide-react"
import Image from "next/image"

const TRUST_INLINE = [
  { label: "Genuine Products", icon: BadgeCheck },
  { label: "Secure Payments", icon: ShieldCheck },
  { label: "Delivery Across India", icon: Truck },
]

const Hero = () => {
  return (
    <section className="border-b border-kudl-border bg-kudl-light">
      <div className="content-container">
        <div className="grid items-center gap-10 py-12 small:min-h-[560px] small:grid-cols-2 small:gap-12 small:py-16">
          {/* Copy */}
          <div className="order-1">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-kudl-primary">
              India&apos;s pet essentials store
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-kudl-ink small:text-5xl">
              Everything Your Pet Needs
            </h1>

            <p className="mt-4 max-w-lg text-base leading-7 text-kudl-muted small:text-lg">
              Food, treats, toys and everyday essentials for your dogs and cats
              — delivered across India.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <LocalizedClientLink
                href="/categories/dogs"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-kudl-primary px-7 text-sm font-semibold text-white transition-colors hover:bg-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
              >
                Shop Dogs
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/categories/cats"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-kudl-primary bg-white px-7 text-sm font-semibold text-kudl-primary transition-colors hover:bg-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
              >
                Shop Cats
              </LocalizedClientLink>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {TRUST_INLINE.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-sm font-medium text-kudl-dark"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Illustration */}
          <div className="order-2">
            <div className="relative mx-auto aspect-[6/5] w-full max-w-xl overflow-hidden rounded-2xl bg-white">
              <Image
                src="/images/hero-pets.svg"
                alt="Illustration of a dog and a cat side by side"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
