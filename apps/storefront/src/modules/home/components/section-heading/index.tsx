import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"

/** Shared section header so every homepage rail has identical typography. */
const SectionHeading = ({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string
  subtitle?: string
  href?: string
  linkLabel?: string
}) => {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 small:mb-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-kudl-ink small:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-kudl-muted">{subtitle}</p>
        )}
      </div>

      {href && (
        <LocalizedClientLink
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium text-kudl-primary transition-colors hover:text-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
        >
          {linkLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </LocalizedClientLink>
      )}
    </div>
  )
}

export default SectionHeading
