/**
 * Label + input pairing matching the app's form styling: a 50px-tall grey
 * filled input with a 12px radius and a semibold label above it.
 */

import React from "react"

export const fieldClass =
  "h-[50px] w-full rounded-xl bg-kudl-surface px-4 text-[15px] text-kudl-ink outline-none placeholder:text-kudl-faint focus:ring-2 focus:ring-kudl-primary"

export default function FormField({
  label,
  className = "",
  ...inputProps
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-kudl-body">
        {label}
      </span>
      <input {...inputProps} className={fieldClass} />
    </label>
  )
}
