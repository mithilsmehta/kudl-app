import { FOOTER_COLUMNS } from "@lib/kudl/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import { Camera, MessageCircle, Video } from "lucide-react"

// lucide-react no longer ships brand marks, so these are generic stand-ins.
const SOCIALS = [
  { label: "Instagram", icon: Camera },
  { label: "Facebook", icon: MessageCircle },
  { label: "YouTube", icon: Video },
]

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-kudl-border bg-kudl-soft">
      <div className="content-container py-14">
        <div className="grid grid-cols-2 gap-8 small:grid-cols-5 small:gap-10">
          {/* Brand blurb */}
          <div className="col-span-2 small:col-span-2">
            <LocalizedClientLink
              href="/"
              className="text-xl font-bold tracking-tight text-kudl-primary"
            >
              KUDL PETS
            </LocalizedClientLink>
            <p className="mt-3 max-w-xs text-sm leading-6 text-kudl-muted">
              Food, treats, toys and everyday essentials for your dogs and cats
              — delivered across India.
            </p>
            <p className="mt-4 text-xs text-kudl-muted">
              Prices in INR (₹). COD available across India.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-kudl-ink">
                {column.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <LocalizedClientLink
                      href={link.href}
                      className="rounded text-sm text-kudl-muted transition-colors hover:text-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
                    >
                      {link.label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Social links are placeholders: no external profiles exist yet. */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-kudl-ink">
              Social
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <span className="flex items-center gap-2 text-sm text-kudl-muted">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-kudl-border pt-6 xsmall:flex-row xsmall:items-center">
          <p className="text-xs text-kudl-muted">
            © {new Date().getFullYear()} KUDL PETS. Demo store — not a real
            business.
          </p>
          <MedusaCTA />
        </div>
      </div>
    </footer>
  )
}
