"use client"

/**
 * One collapsible filter section (label + chevron + body). Used by both
 * FilterSidebar and FilterDrawer so the seven filter groups aren't laid out
 * twice — see FilterPanel, which renders the actual checkbox/radio lists
 * inside one of these per group.
 */

import { useState } from "react"
import { ChevronDown } from "@/components/icons"

export default function FilterGroup({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-kudl-divider py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-bold text-kudl-ink">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-kudl-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-3 space-y-2.5">{children}</div>}
    </div>
  )
}
