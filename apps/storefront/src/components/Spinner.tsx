import { Loader2 } from "@/components/icons"

/** Equivalent of the app's <ActivityIndicator />. */
export default function Spinner({
  className = "h-6 w-6 text-kudl-primary",
  label = "Loading",
}: {
  className?: string
  label?: string
}) {
  return (
    <Loader2
      className={`animate-spin ${className}`}
      role="status"
      aria-label={label}
    />
  )
}
