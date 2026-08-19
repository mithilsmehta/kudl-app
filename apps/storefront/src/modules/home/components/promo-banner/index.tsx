import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Demo promotional banner. No Medusa promotion/discount is configured in this
 * POC, so this is presentational only and links to the shop rather than
 * claiming a specific offer amount.
 */
const PromoBanner = () => {
  return (
    <section className="content-container py-6">
      <div className="overflow-hidden rounded-2xl bg-kudl-dark">
        <div className="flex flex-col items-start gap-6 px-7 py-10 small:flex-row small:items-center small:justify-between small:px-12 small:py-14">
          <div>
            <h2 className="max-w-md text-2xl font-bold leading-tight tracking-tight text-white small:text-3xl">
              More for Your Pet. Less on Your Wallet.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
              Save on selected pet essentials across dog and cat ranges.
            </p>
          </div>

          <LocalizedClientLink
            href="/shop?sortBy=price_asc"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-kudl-dark transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kudl-dark"
          >
            Explore Offers
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default PromoBanner
