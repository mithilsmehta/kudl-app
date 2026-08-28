"use client"

/**
 * Form primitives shared by the three onboarding steps and the profile page's
 * edit sheet. Kept here so a selected card looks identical wherever it appears
 * and there is one place to change the selected-state treatment.
 *
 * Every control is a real <button> or <input> rather than a styled <div>: that
 * is what makes them keyboard-reachable and announces their pressed state to a
 * screen reader, which a div with an onClick cannot do.
 */

import { ReactNode } from "react"
import { Check } from "@/components/icons"

/** Section heading with an optional "Optional" hint, so required is the default. */
export function FieldLabel({
  children,
  optional = false,
  hint,
}: {
  children: ReactNode
  optional?: boolean
  hint?: string
}) {
  return (
    <div className="mb-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-kudl-ink">{children}</span>
        {optional && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-kudl-faint">
            Optional
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-kudl-muted">{hint}</p>}
    </div>
  )
}

/** Big tappable icon card — pet type, size. */
export function OptionCard({
  selected,
  onClick,
  icon,
  label,
  detail,
  accent = "bg-kudl-tint text-kudl-primary",
}: {
  selected: boolean
  onClick: () => void
  icon?: ReactNode
  label: string
  detail?: string
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2 active:scale-[0.97] ${
        selected
          ? "border-kudl-primary bg-kudl-tint shadow-sm"
          : "border-kudl-border bg-white hover:border-kudl-hairline hover:shadow-sm"
      }`}
    >
      {icon && (
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            selected ? accent : "bg-kudl-surface text-kudl-muted"
          }`}
        >
          {icon}
        </span>
      )}
      <span
        className={`text-[13px] font-bold leading-tight ${
          selected ? "text-kudl-primary" : "text-kudl-ink"
        }`}
      >
        {label}
      </span>
      {detail && (
        <span className="text-[11px] leading-tight text-kudl-muted">{detail}</span>
      )}
    </button>
  )
}

/** Pill toggle — gender, spayed/neutered, the date-mode switch. */
export function PillButton({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2 active:scale-[0.97] ${
        selected
          ? "border-kudl-primary bg-kudl-primary text-white shadow-sm"
          : "border-kudl-border bg-white text-kudl-body hover:border-kudl-hairline"
      } ${className}`}
    >
      {children}
    </button>
  )
}

/** Multi-select chip — allergies, personality. Shows a tick when on. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2 active:scale-[0.97] ${
        selected
          ? "border-kudl-primary bg-kudl-tint text-kudl-primary"
          : "border-kudl-border bg-white text-kudl-body hover:border-kudl-hairline"
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Text input matching the rest of the storefront's form styling. */
export function TextInput({
  value,
  onChange,
  placeholder,
  id,
  maxLength,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  maxLength?: number
  autoFocus?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      className="w-full rounded-2xl border-2 border-kudl-border bg-white px-4 py-3 text-[15px] text-kudl-ink placeholder:text-kudl-faint focus:border-kudl-primary focus:outline-none"
    />
  )
}
