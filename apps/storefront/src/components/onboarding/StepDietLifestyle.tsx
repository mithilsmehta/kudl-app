"use client"

/**
 * Step 3 — diet, neuter status and personality. Every field here is optional,
 * so this step never blocks Finish.
 */

import { Salad, Scissors, Smile } from "@/components/icons"
import { ALLERGIES, NO_ALLERGIES, PERSONALITIES } from "@/lib/pets"
import { Chip, FieldLabel, PillButton } from "./fields"
import { PetForm, toggleInList } from "./petForm"

export default function StepDietLifestyle({
  form,
  patch,
}: {
  form: PetForm
  patch: (changes: Partial<PetForm>) => void
}) {
  /*
   * "No known allergies" is mutually exclusive with the rest: selecting it
   * clears everything else, and selecting anything else clears it. Without
   * that, a pet can end up tagged both "Chicken Allergy" and "No known
   * allergies", which is not a preference we could ever act on.
   */
  const toggleAllergy = (value: string) => {
    if (value === NO_ALLERGIES) {
      patch({
        allergies: form.allergies.includes(NO_ALLERGIES) ? [] : [NO_ALLERGIES],
      })
      return
    }
    const next = toggleInList(
      form.allergies.filter((a) => a !== NO_ALLERGIES),
      value
    )
    patch({ allergies: next })
  }

  return (
    <div className="space-y-7">
      <div>
        <FieldLabel
          optional
          hint="We use this to hide food that wouldn't suit them."
        >
          <span className="inline-flex items-center gap-1.5">
            <Salad className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            Dietary needs & allergies
          </span>
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map(({ value, label }) => (
            <Chip
              key={value}
              selected={form.allergies.includes(value)}
              onClick={() => toggleAllergy(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel optional>
          <span className="inline-flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            Spayed / Neutered
          </span>
        </FieldLabel>
        <div className="flex gap-2.5">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map(({ label, value }) => (
            <PillButton
              key={label}
              // Tapping the chosen answer again clears it back to "not
              // answered", which is a different thing from "No".
              selected={form.spayedNeutered === value}
              onClick={() =>
                patch({
                  spayedNeutered: form.spayedNeutered === value ? null : value,
                })
              }
              className="flex-1"
            >
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel optional hint="Pick as many as fit. This one's just for fun.">
          <span className="inline-flex items-center gap-1.5">
            <Smile className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
            What&apos;s their vibe?
          </span>
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {PERSONALITIES.map(({ value, label }) => (
            <Chip
              key={value}
              selected={form.personality.includes(value)}
              onClick={() =>
                patch({ personality: toggleInList(form.personality, value) })
              }
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
