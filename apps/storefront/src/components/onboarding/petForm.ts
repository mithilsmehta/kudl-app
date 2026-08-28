"use client"

/**
 * The onboarding form's state shape, its validation rules, and the translation
 * between form state and the API payload.
 *
 * Kept apart from the components so the rules can be read in one place and
 * reused by the profile page's edit sheet. `stepIsValid` is the single source
 * of truth for whether Next is enabled — no component decides that for itself.
 */

import { Pet, PetDraft } from "@/lib/api"
import {
  ApproxAge,
  LifeStage,
  PetGender,
  PetSize,
  PetType,
} from "@/lib/pets"

/**
 * How the owner chose to express age. Held in form state rather than derived,
 * because the three storage columns cannot distinguish "picked a stage" from
 * "picked a band and then cleared it" — and the toggle must stay where the
 * person put it while they are still typing.
 */
export type AgeMode = "exact" | "stage" | "unknown"

export interface PetForm {
  type: PetType | null
  name: string
  gender: PetGender | null
  avatarUrl: string | null
  /** Local object URL for instant preview while the upload is in flight. */
  avatarPreview: string | null
  breed: string
  ageMode: AgeMode
  birthday: string
  lifeStage: LifeStage | null
  approxAge: ApproxAge | null
  size: PetSize | null
  allergies: string[]
  spayedNeutered: boolean | null
  personality: string[]
}

export const emptyPetForm = (): PetForm => ({
  type: null,
  name: "",
  gender: null,
  avatarUrl: null,
  avatarPreview: null,
  breed: "",
  ageMode: "exact",
  birthday: "",
  lifeStage: null,
  approxAge: null,
  size: null,
  allergies: [],
  spayedNeutered: null,
  personality: [],
})

/** Prefills the form from a stored pet, for the profile page's edit flow. */
export const petToForm = (pet: Pet): PetForm => ({
  type: pet.type,
  name: pet.name,
  gender: pet.gender,
  avatarUrl: pet.avatar_url ?? null,
  avatarPreview: null,
  breed: pet.breed ?? "",
  // Whichever column is set tells us which mode the owner used last.
  ageMode: pet.birthday ? "exact" : pet.life_stage ? "stage" : pet.approx_age ? "unknown" : "exact",
  // <input type="date"> needs a bare yyyy-mm-dd, not a full ISO timestamp.
  birthday: pet.birthday ? pet.birthday.slice(0, 10) : "",
  lifeStage: pet.life_stage ?? null,
  approxAge: pet.approx_age ?? null,
  size: pet.size ?? null,
  allergies: pet.allergies ?? [],
  spayedNeutered: pet.spayed_neutered ?? null,
  personality: pet.personality ?? [],
})

/**
 * Step validity. Step 3 is entirely optional, so it is always valid — the brief
 * marks every field on it as optional, and blocking Finish on a "vibe" would be
 * absurd.
 */
export const stepIsValid = (step: number, form: PetForm): boolean => {
  if (step === 0) {
    return Boolean(form.type && form.name.trim() && form.gender)
  }
  if (step === 1) {
    if (!form.breed.trim()) return false
    // Age is required, but any one of the three ways of giving it counts.
    if (form.ageMode === "exact") return Boolean(form.birthday)
    if (form.ageMode === "stage") return Boolean(form.lifeStage)
    return Boolean(form.approxAge)
  }
  return true
}

/**
 * Form state → API payload.
 *
 * Only the age field matching the chosen mode is sent; the other two are
 * explicitly null so that switching mode and saving actually clears the old
 * value rather than leaving two contradictory answers on the row.
 */
export const formToDraft = (form: PetForm): PetDraft => ({
  name: form.name.trim(),
  type: form.type!,
  gender: form.gender!,
  avatar_url: form.avatarUrl,
  breed: form.breed.trim() || null,
  birthday: form.ageMode === "exact" && form.birthday ? form.birthday : null,
  life_stage: form.ageMode === "stage" ? form.lifeStage : null,
  approx_age: form.ageMode === "unknown" ? form.approxAge : null,
  size: form.size,
  allergies: form.allergies.length ? form.allergies : null,
  spayed_neutered: form.spayedNeutered,
  personality: form.personality.length ? form.personality : null,
})

/** Adds or removes a value from a multi-select list. */
export const toggleInList = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
