/**
 * Placeholder testimonials — initials avatars, not stock photos of strangers
 * standing in as fake customers.
 */

import { TESTIMONIALS } from "@/lib/homeContent"
import { Star } from "@/components/icons"

const AVATAR_COLORS = [
  "bg-kudl-tint text-kudl-primary",
  "bg-amber-50 text-kudl-amber-icon",
  "bg-emerald-50 text-emerald-600",
]

export default function Testimonials() {
  return (
    <section className="mt-5 md:mt-10">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        Loved By Pet Parents
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={t.name}
            className="rounded-2xl border border-kudl-border bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                aria-hidden="true"
              >
                {t.name.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-bold text-kudl-ink">{t.name}</p>
                <p className="text-xs text-kudl-faint">Pet parent to {t.petName}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, starIdx) => (
                <Star
                  key={starIdx}
                  className={`h-4 w-4 ${
                    starIdx < t.rating
                      ? "fill-kudl-amber-icon text-kudl-amber-icon"
                      : "text-kudl-border"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="mt-3 text-sm italic text-kudl-body">&ldquo;{t.quote}&rdquo;</p>
          </div>
        ))}
      </div>
    </section>
  )
}
