import { PET_CARE_TIPS } from "@lib/kudl/config"
import SectionHeading from "@modules/home/components/section-heading"
import { BookOpen } from "lucide-react"

/**
 * Pet care tips. Static demo cards -- there is no blog or CMS in this POC, so
 * these deliberately do not link anywhere yet.
 */
const PetCareSection = () => {
  return (
    <section id="pet-care" className="bg-kudl-soft py-14 scroll-mt-32 small:py-16">
      <div className="content-container">
        <SectionHeading
          title="Pet Care Tips"
          subtitle="Short, practical reads for new and seasoned pet parents."
        />

        <ul className="grid gap-5 small:grid-cols-3 small:gap-6">
          {PET_CARE_TIPS.map((tip) => (
            <li
              key={tip.title}
              className="flex flex-col rounded-xl border border-kudl-border bg-white p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-kudl-light text-kudl-primary">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold leading-snug text-kudl-ink">
                {tip.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-kudl-muted">
                {tip.excerpt}
              </p>
              <span className="mt-4 text-xs font-medium uppercase tracking-wide text-kudl-muted">
                {tip.readTime}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default PetCareSection
