import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ShoppingCart } from "lucide-react"

const EmptyCartMessage = () => {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-dashed border-kudl-border bg-kudl-soft px-6 py-20 text-center"
      data-testid="empty-cart-message"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-kudl-light text-kudl-primary">
        <ShoppingCart className="h-6 w-6" aria-hidden="true" />
      </span>

      <h2 className="mt-5 text-lg font-semibold text-kudl-ink">
        Your cart is empty
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kudl-muted">
        Nothing here yet. Browse food, treats and toys for your dogs and cats.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LocalizedClientLink
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-kudl-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
        >
          Explore products
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/categories/dogs"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-kudl-primary bg-white px-6 text-sm font-semibold text-kudl-primary transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
        >
          Shop Dogs
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
