import { Metadata } from "next"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "404 | KUDL Pets",
  description: "The page you tried to access does not exist.",
}

export default async function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-kudl-primary">
        Error 404
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-kudl-ink">
        Page not found
      </h1>
      <p className="max-w-sm text-sm leading-6 text-kudl-muted">
        The page you tried to access does not exist or may have moved.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <LocalizedClientLink
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-kudl-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
        >
          Go to homepage
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-kudl-primary bg-white px-6 text-sm font-semibold text-kudl-primary transition-colors hover:bg-kudl-light focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
        >
          Browse products
        </LocalizedClientLink>
      </div>
    </div>
  )
}
