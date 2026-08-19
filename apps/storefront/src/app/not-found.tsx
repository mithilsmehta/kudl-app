import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404 | KUDL Pets",
  description: "The page you tried to access does not exist.",
}

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-kudl-primary">
        Error 404
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-kudl-ink">
        Page not found
      </h1>
      <p className="max-w-sm text-sm leading-6 text-kudl-muted">
        The page you tried to access does not exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-kudl-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-kudl-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
      >
        Go to homepage
      </Link>
    </div>
  )
}
