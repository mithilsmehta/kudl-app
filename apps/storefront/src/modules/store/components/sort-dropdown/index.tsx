"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SORT_OPTIONS } from "../shop-filters"

/** Desktop sort control. Writes `sortBy` to the URL so the server re-sorts. */
const SortDropdown = ({ sortBy }: { sortBy: string }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sortBy", event.target.value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="hidden items-center gap-2 small:flex">
      <label
        htmlFor="kudl-sort"
        className="text-sm text-kudl-muted whitespace-nowrap"
      >
        Sort by
      </label>
      <select
        id="kudl-sort"
        value={sortBy}
        onChange={handleChange}
        className="h-10 rounded-lg border border-kudl-border bg-white px-3 text-sm text-kudl-ink focus:border-kudl-primary focus:outline-none focus:ring-1 focus:ring-kudl-primary"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SortDropdown
