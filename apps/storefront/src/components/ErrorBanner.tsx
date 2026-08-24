import { AlertCircle } from "@/components/icons"

/**
 * Inline error surface. The app shows these as Alert.alert modals; on the web an
 * inline banner next to the failing control is clearer and doesn't interrupt.
 */
export default function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0 text-kudl-danger" aria-hidden="true" />
      <p className="text-[13px] font-medium text-kudl-danger">{message}</p>
    </div>
  )
}
