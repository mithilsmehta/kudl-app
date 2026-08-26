"use client"

import { ChevronDown } from "@/components/icons"
import { SORT_OPTIONS, SortKey } from "@/components/products/filterTypes"

export default function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (value: SortKey) => void
}) {
  return (
    <label className="relative flex h-10 items-center gap-2 rounded-full border border-kudl-hairline px-4 text-sm font-semibold text-kudl-body">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="appearance-none bg-transparent pr-5 outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 h-4 w-4 text-kudl-muted"
        aria-hidden="true"
      />
    </label>
  )
}
