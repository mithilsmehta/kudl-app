"use client"

/**
 * Step 2 — breed and age (required), size (optional).
 *
 * The age control is the interesting part. A single date picker would be wrong
 * for most rescues, whose owners genuinely do not know a birthday, so there are
 * three ways to answer and each writes a different column:
 *
 *   Exact date      → birthday
 *   Life stage      → life_stage
 *   "I don't know"  → approx_age
 *
 * Switching mode does not silently keep the old answer: formToDraft sends null
 * for the two columns that do not match the chosen mode.
 */

import { useMemo, useRef, useState } from "react"
import { Cake, Check, ChevronDown, Ruler, Search, X } from "@/components/icons"
import {
  APPROX_AGES,
  breedsFor,
  lifeStages,
  MIXED_BREED,
  SIZES,
  UNKNOWN_BREED,
} from "@/lib/pets"
import { FieldLabel, OptionCard, PillButton, TextInput } from "./fields"
import { AgeMode, PetForm } from "./petForm"

/** Today, as yyyy-mm-dd, so the date input cannot offer a future birthday. */
const today = () => new Date().toISOString().slice(0, 10)

const AGE_MODES: { value: AgeMode; label: string }[] = [
  { value: "exact", label: "Exact date" },
  { value: "stage", label: "Life stage" },
  { value: "unknown", label: "I don't know" },
]

function BreedPicker({
  form,
  patch,
}: {
  form: PetForm
  patch: (changes: Partial<PetForm>) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  const all = useMemo(() => breedsFor(form.type), [form.type])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((b) => b.toLowerCase().includes(q))
  }, [all, query])

  const choose = (breed: string) => {
    patch({ breed })
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      {/*
        Two presentations of the same value: once chosen, the breed shows as a
        settled row rather than leaving a search box that looks unfinished.
      */}
      {form.breed && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border-2 border-kudl-border bg-white px-4 py-3 text-left transition-colors hover:border-kudl-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary"
        >
          <span className="truncate text-[15px] font-semibold text-kudl-ink">
            {form.breed}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />
        </button>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kudl-faint"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              form.type ? "Search breeds, or type your own" : "Pick a pet type first"
            }
            disabled={!form.type}
            className="w-full rounded-2xl border-2 border-kudl-border bg-white pl-11 pr-10 py-3 text-[15px] text-kudl-ink placeholder:text-kudl-faint focus:border-kudl-primary focus:outline-none disabled:bg-kudl-surface disabled:text-kudl-faint"
          />
          {open && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setQuery("")
              }}
              aria-label="Close breed list"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-kudl-muted hover:text-kudl-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {open && form.type && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-kudl-border bg-white py-1 shadow-lg">
          {matches.map((breed) => {
            const isFallback = breed === MIXED_BREED || breed === UNKNOWN_BREED
            return (
              <button
                key={breed}
                type="button"
                onClick={() => choose(breed)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-kudl-tint ${
                  isFallback
                    ? "font-bold text-kudl-primary"
                    : "font-medium text-kudl-body"
                }`}
              >
                {breed}
                {form.breed === breed && (
                  <Check className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
                )}
              </button>
            )
          })}

          {/*
            Free text is a first-class answer. A breed list can never be
            complete, and refusing what someone types would push them onto
            "Don't know" — losing real information.
          */}
          {query.trim() && !matches.some((m) => m.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => choose(query.trim())}
              className="flex w-full items-center gap-2 border-t border-kudl-divider px-4 py-2.5 text-left text-sm font-semibold text-kudl-primary hover:bg-kudl-tint"
            >
              Use &ldquo;{query.trim()}&rdquo;
            </button>
          )}

          {!matches.length && !query.trim() && (
            <p className="px-4 py-3 text-sm text-kudl-muted">
              No suggestions for this pet type — just type the breed.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function StepBreedAge({
  form,
  patch,
}: {
  form: PetForm
  patch: (changes: Partial<PetForm>) => void
}) {
  const stages = lifeStages(form.type)

  return (
    <div className="space-y-7">
      <div>
        <FieldLabel hint="Mixed, Indie and rescue are right at the top — no guessing needed.">
          Breed
        </FieldLabel>
        <BreedPicker form={form} patch={patch} />
      </div>

      <div>
        <FieldLabel hint="However you know it. All three ways work.">
          <span className="inline-flex items-center gap-1.5">
            <Cake className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            Birthday or Gotcha Day
          </span>
        </FieldLabel>

        <div className="mb-3.5 flex flex-wrap gap-2">
          {AGE_MODES.map(({ value, label }) => (
            <PillButton
              key={value}
              selected={form.ageMode === value}
              onClick={() => patch({ ageMode: value })}
            >
              {label}
            </PillButton>
          ))}
        </div>

        {form.ageMode === "exact" && (
          <div>
            <input
              type="date"
              value={form.birthday}
              max={today()}
              onChange={(e) => patch({ birthday: e.target.value })}
              className="w-full rounded-2xl border-2 border-kudl-border bg-white px-4 py-3 text-[15px] text-kudl-ink focus:border-kudl-primary focus:outline-none"
            />
            <p className="mt-2 text-xs text-kudl-muted">
              Not sure of the exact day? Switch to{" "}
              <button
                type="button"
                onClick={() => patch({ ageMode: "unknown" })}
                className="font-semibold text-kudl-primary hover:underline"
              >
                I don&apos;t know
              </button>{" "}
              — an approximate age works just as well.
            </p>
          </div>
        )}

        {form.ageMode === "stage" && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stages.map(({ value, label }) => (
              <OptionCard
                key={value}
                selected={form.lifeStage === value}
                onClick={() => patch({ lifeStage: value })}
                label={label}
              />
            ))}
          </div>
        )}

        {form.ageMode === "unknown" && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {APPROX_AGES.map(({ value, label }) => (
              <OptionCard
                key={value}
                selected={form.approxAge === value}
                onClick={() => patch({ approxAge: value })}
                label={label}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <FieldLabel optional>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            Size
          </span>
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {SIZES.map(({ value, label, detail }) => (
            <OptionCard
              key={value}
              // Tapping the selected card clears it — this field is optional and
              // there is otherwise no way back to "not answered".
              selected={form.size === value}
              onClick={() => patch({ size: form.size === value ? null : value })}
              label={label}
              detail={detail}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
