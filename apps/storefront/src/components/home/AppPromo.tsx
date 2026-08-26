/**
 * Cross-promotes the real KUDL mobile app (apps/mobile in this monorepo).
 * It isn't published to either store yet (no bundle identifiers configured
 * in app.json), so the badges below are styled as "coming soon" rather than
 * linking to store listings that don't exist.
 */

import { Apple, Smartphone } from "@/components/icons"
import { PetDuoIllustration } from "@/components/home/decor"

export default function AppPromo() {
  return (
    <section className="-mx-4 mt-5 overflow-hidden bg-kudl-teal px-4 py-10 md:mx-0 md:mt-10 md:rounded-kudl-hero md:px-10">
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="text-center text-white md:text-left">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide">
            KUDL MOBILE APP
          </span>
          <h2 className="mt-3 text-xl font-extrabold md:text-2xl">
            Shop faster with the KUDL app
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-teal-50 md:mx-0">
            Order tracking, reorder-in-one-tap and app-only offers — coming
            soon to iOS &amp; Android.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-white">
              <Apple className="h-5 w-5" aria-hidden="true" />
              <span className="text-left leading-tight">
                <span className="block text-[9px] uppercase text-teal-100">
                  Coming soon on
                </span>
                <span className="block text-sm font-bold">App Store</span>
              </span>
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-white">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
              <span className="text-left leading-tight">
                <span className="block text-[9px] uppercase text-teal-100">
                  Coming soon on
                </span>
                <span className="block text-sm font-bold">Google Play</span>
              </span>
            </span>
          </div>
        </div>
        <PetDuoIllustration className="h-24 w-auto shrink-0 text-white/90 md:h-32" />
      </div>
    </section>
  )
}
