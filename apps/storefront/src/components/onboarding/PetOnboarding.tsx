"use client"

/**
 * Multi-step pet onboarding.
 *
 * Holds all three steps' state in one `PetForm` object and saves once, on
 * Finish — not per step. Saving incrementally would leave half-built pet rows
 * behind every time someone abandoned the flow, and there is no partial pet
 * worth keeping.
 *
 * Validation lives in petForm.ts's `stepIsValid`, which is what disables Next.
 * The pattern to notice: Next is disabled but the fields are never
 * error-highlighted while untouched — nagging someone about a field they have
 * not reached yet is the fastest way to make a form feel hostile.
 */

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  PartyPopper,
  PawPrint,
  Plus,
} from "@/components/icons"
import { createPet, Pet } from "@/lib/api"
import ErrorBanner from "@/components/ErrorBanner"
import StepBasicInfo from "./StepBasicInfo"
import StepBreedAge from "./StepBreedAge"
import StepDietLifestyle from "./StepDietLifestyle"
import {
  emptyPetForm,
  formToDraft,
  PetForm,
  stepIsValid,
} from "./petForm"

const STEPS = [
  { title: "Basic Info", short: "Basics" },
  { title: "Breed & Age", short: "Breed" },
  { title: "Diet & Lifestyle", short: "Lifestyle" },
] as const

/**
 * Slide direction is driven by which way the customer moved, so going back
 * animates backwards. A single fixed direction reads as a glitch on Back.
 */
const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
}

export interface PetOnboardingProps {
  /** Called after each successful save, with the created pet. */
  onPetSaved?: (pet: Pet) => void
  /** "Skip for now" and the final "Start Exploring" both land here. */
  onDone?: () => void
  /** Label for the final CTA — "Go to Dashboard" in an app shell. */
  doneLabel?: string
}

export default function PetOnboarding({
  onPetSaved,
  onDone,
  doneLabel = "Start Exploring",
}: PetOnboardingProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<PetForm>(emptyPetForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedPets, setSavedPets] = useState<Pet[]>([])
  const [complete, setComplete] = useState(false)

  const patch = (changes: Partial<PetForm>) =>
    setForm((prev) => ({ ...prev, ...changes }))

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const canAdvance = stepIsValid(step, form)

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      const pet = await createPet(formToDraft(form))
      setSavedPets((prev) => [...prev, pet])
      onPetSaved?.(pet)
      setComplete(true)
    } catch (e: any) {
      setError(e?.message || "Could not save your pet. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const addAnother = () => {
    setForm(emptyPetForm())
    setDirection(1)
    setStep(0)
    setComplete(false)
    setError(null)
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (complete) {
    const latest = savedPets[savedPets.length - 1]
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-kudl-hero border border-kudl-border bg-white p-8 text-center shadow-sm"
      >
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-kudl-tint"
        >
          <PartyPopper className="h-9 w-9 text-kudl-primary" aria-hidden="true" />
        </motion.div>

        <h2 className="mt-5 text-2xl font-extrabold text-kudl-ink">
          {latest?.name} is all set! 🎉
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-kudl-muted">
          We&apos;ll use {latest?.name}&apos;s profile to suggest the right food, treats
          and care. You can edit it any time from your profile.
        </p>

        {savedPets.length > 1 && (
          <p className="mt-3 text-xs font-semibold text-kudl-primary">
            {savedPets.length} pets added
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={addAnother}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-kudl-border bg-white px-5 text-[15px] font-bold text-kudl-body transition-colors hover:border-kudl-primary hover:text-kudl-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another pet
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-kudl-primary px-6 text-[15px] font-bold text-white transition-colors hover:bg-kudl-dark"
          >
            {doneLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-kudl-hero border border-kudl-border bg-white shadow-sm">
      <div className="border-b border-kudl-divider p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-kudl-tint">
              <PawPrint className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-kudl-ink sm:text-xl">
                Tell us about your pet
              </h1>
              <p className="text-xs text-kudl-muted">
                Takes about a minute — and makes everything we show you better.
              </p>
            </div>
          </div>

          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-kudl-muted transition-colors hover:bg-kudl-surface hover:text-kudl-body"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Progress: numbered, and clickable backwards only — jumping forward
            would skip the validation the Next button exists to enforce. */}
        <ol className="flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={s.title} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => i < step && go(i)}
                  disabled={i >= step}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors ${
                    i < step ? "cursor-pointer hover:bg-kudl-surface" : "cursor-default"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      done
                        ? "bg-kudl-success text-white"
                        : active
                        ? "bg-kudl-primary text-white"
                        : "bg-kudl-surface text-kudl-faint"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <span
                    className={`hidden truncate text-xs font-bold sm:block ${
                      active ? "text-kudl-ink" : done ? "text-kudl-body" : "text-kudl-faint"
                    }`}
                  >
                    {s.title}
                  </span>
                  <span
                    className={`truncate text-xs font-bold sm:hidden ${
                      active ? "text-kudl-ink" : "text-kudl-faint"
                    }`}
                  >
                    {active ? s.short : ""}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-0.5 w-4 shrink-0 rounded-full transition-colors ${
                      i < step ? "bg-kudl-success" : "bg-kudl-border"
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="mb-5">
            <ErrorBanner message={error} />
          </div>
        )}

        {/*
          mode="wait" so the outgoing step is gone before the incoming one
          arrives — overlapping them makes the taller step jump the layout.
        */}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 0 && <StepBasicInfo form={form} patch={patch} />}
            {step === 1 && <StepBreedAge form={form} patch={patch} />}
            {step === 2 && <StepDietLifestyle form={form} patch={patch} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-kudl-divider p-5 sm:p-6">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="inline-flex h-12 items-center gap-1.5 rounded-2xl px-4 text-[15px] font-bold text-kudl-body transition-colors hover:bg-kudl-surface"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            disabled={!canAdvance}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-kudl-primary px-6 text-[15px] font-bold text-white transition-all hover:bg-kudl-dark disabled:cursor-not-allowed disabled:bg-kudl-hairline sm:flex-none"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-kudl-success px-6 text-[15px] font-bold text-white transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Save {form.name.trim() || "pet"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
