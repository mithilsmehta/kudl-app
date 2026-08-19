"use client"

import { Search } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

/**
 * Searches real Medusa products. The query is forwarded to /shop as `q`, which
 * the product list passes through to the Medusa Store API.
 */
const SearchBar = ({ className = "" }: { className?: string }) => {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const countryCode = params.countryCode as string

  const [value, setValue] = useState(searchParams.get("q") ?? "")

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const query = value.trim()
    router.push(
      query
        ? `/${countryCode}/shop?q=${encodeURIComponent(query)}`
        : `/${countryCode}/shop`
    )
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`}
    >
      <label htmlFor="kudl-search" className="sr-only">
        Search products
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kudl-muted"
        aria-hidden="true"
      />
      <input
        id="kudl-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search for dog food, cat food, toys..."
        className="h-10 w-full rounded-lg border border-kudl-border bg-kudl-soft pl-9 pr-3 text-sm text-kudl-ink placeholder:text-kudl-muted focus:border-kudl-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-kudl-primary"
      />
    </form>
  )
}

export default SearchBar
