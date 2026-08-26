"use client"

import { LayoutGrid, List } from "@/components/icons"
import { ViewMode } from "@/components/products/filterTypes"

export default function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-kudl-hairline p-1">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={value === "grid"}
        className={`rounded-md p-1.5 ${value === "grid" ? "bg-kudl-primary text-white" : "text-kudl-muted hover:bg-kudl-surface"}`}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
        className={`rounded-md p-1.5 ${value === "list" ? "bg-kudl-primary text-white" : "text-kudl-muted hover:bg-kudl-surface"}`}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
