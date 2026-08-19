import { TRUST_POINTS } from "@lib/kudl/config"
import SectionHeading from "@modules/home/components/section-heading"
import { Heart, LockKeyhole, ShieldCheck, Truck } from "lucide-react"

const ICONS = {
  shield: ShieldCheck,
  lock: LockKeyhole,
  truck: Truck,
  heart: Heart,
}

const TrustSection = () => {
  return (
    <section className="bg-kudl-soft py-14 small:py-16">
      <div className="content-container">
        <SectionHeading
          title="Why Choose KUDL"
          subtitle="The basics, done properly."
        />

        <ul className="grid grid-cols-1 gap-4 xsmall:grid-cols-2 small:grid-cols-4 small:gap-6">
          {TRUST_POINTS.map((point) => {
            const Icon = ICONS[point.icon]

            return (
              <li
                key={point.title}
                className="rounded-xl border border-kudl-border bg-white p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-kudl-light text-kudl-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-kudl-ink">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-kudl-muted">
                  {point.description}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default TrustSection
