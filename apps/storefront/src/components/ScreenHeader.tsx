"use client"

/**
 * Header for the app's stack screens (Product Details, My Orders, Checkout…).
 * The app gets this from expo-router's <Stack>; on the web each page renders it
 * directly.
 *
 * The back control shows at every width. It was originally desktop-hidden on the
 * assumption that the browser's own Back button covers it, but on pages reached
 * mid-flow — checkout in particular — that leaves no visible way back to the
 * cart, so the screen reads as a dead end.
 */

import { useRouter } from "next/navigation"
import { ChevronLeft } from "@/components/icons"

export default function ScreenHeader({
  title,
  fallbackHref = "/",
}: {
  title: string
  /** Used when the page was opened directly and there is no history to go back to. */
  fallbackHref?: string
}) {
  const router = useRouter()

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <div className="sticky top-0 z-30 border-b border-transparent bg-white md:static md:border-none md:bg-transparent">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 md:h-auto md:px-6 md:pt-8">
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex shrink-0 items-center gap-0.5 rounded p-2 text-kudl-ink transition-colors hover:text-kudl-primary md:mr-1 md:text-kudl-muted"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          <span className="text-[15px] md:text-sm md:font-semibold">Back</span>
        </button>
        <h1 className="flex-1 truncate text-center text-[17px] font-semibold text-kudl-ink md:text-left md:text-2xl md:font-bold">
          {title}
        </h1>
        {/* Balances the back button so the title stays optically centred on mobile. */}
        <span className="w-[68px] md:hidden" aria-hidden="true" />
      </div>
    </div>
  )
}
