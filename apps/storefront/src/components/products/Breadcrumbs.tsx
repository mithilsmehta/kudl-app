import Link from "next/link"
import { ChevronRight } from "@/components/icons"

export interface Crumb {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-kudl-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-kudl-faint" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-kudl-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-kudl-body">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
