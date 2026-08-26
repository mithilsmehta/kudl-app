/**
 * Trust-stats band. Figures are rounded marketing placeholders, not a feed
 * from analytics — swap for real numbers (order count, review average) once
 * that data exists and is worth surfacing.
 */

import { PawPrint, Star, Truck, Users } from "@/components/icons"

const STATS = [
  { Icon: Users, value: "10,000+", label: "Happy pet parents" },
  { Icon: PawPrint, value: "500+", label: "Products across brands" },
  { Icon: Star, value: "4.8", label: "Average customer rating" },
  { Icon: Truck, value: "24 hr", label: "Dispatch on in-stock items" },
]

export default function StatsStrip() {
  return (
    <section className="-mx-4 mt-5 bg-kudl-violet px-4 py-10 md:mx-0 md:mt-10 md:rounded-kudl-hero md:px-10">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {STATS.map(({ Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center text-center text-white">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-xl font-extrabold md:text-2xl">{value}</p>
            <p className="mt-0.5 text-[11.5px] text-violet-100 md:text-xs">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
