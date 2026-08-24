"use client"

/**
 * Web stand-in for the app's Alert.alert confirmation prompts (sign out,
 * delete address). Rendered as a real modal rather than window.confirm so it
 * can carry the destructive styling the app uses.
 */

import { useEffect, useRef } from "react"

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-kudl-card border border-kudl-border bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[17px] font-bold text-kudl-ink">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-kudl-muted">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-kudl-hairline bg-white text-[15px] font-semibold text-kudl-body"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-xl text-[15px] font-semibold text-white ${
              destructive ? "bg-kudl-danger" : "bg-kudl-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
