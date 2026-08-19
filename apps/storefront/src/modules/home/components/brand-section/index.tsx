import { DEMO_BRANDS } from "@lib/kudl/config"
import SectionHeading from "@modules/home/components/section-heading"

/**
 * Popular brands strip. These are illustrative placeholder names for a demo
 * storefront -- KUDL Pets is not affiliated with, endorsed by, or an authorised
 * retailer for any of them. Swap for CMS-managed brand content later.
 */
const BrandSection = () => {
  return (
    <section className="content-container py-14 small:py-16">
      <SectionHeading
        title="Popular Brands"
        subtitle="Brand names shown are placeholders for this demo."
      />

      <ul className="grid grid-cols-2 gap-4 xsmall:grid-cols-3 small:grid-cols-5">
        {DEMO_BRANDS.map((brand) => (
          <li
            key={brand}
            className="grid h-20 place-items-center rounded-xl border border-kudl-border bg-white px-4 text-center"
          >
            <span className="text-sm font-semibold tracking-tight text-kudl-muted">
              {brand}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default BrandSection
