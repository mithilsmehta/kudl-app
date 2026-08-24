import Link from "next/link"
import { ShoppingBag } from "@/components/icons"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-8 py-24 text-center">
      <ShoppingBag className="h-16 w-16 text-kudl-hairline" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold text-kudl-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-kudl-muted">
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-kudl-primary px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-kudl-dark"
      >
        Back to Home
      </Link>
    </div>
  )
}
