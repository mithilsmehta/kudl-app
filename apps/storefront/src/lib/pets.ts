/**
 * Pet vocabulary — the single source of truth for every label, option list and
 * icon the onboarding flow and the profile page render.
 *
 * The stored values are snake_case codes, never the display labels. That
 * matters for two reasons: the backend's src/api/store/pets/validation.ts
 * rejects anything outside these sets, and a label can be reworded later
 * ("Couch Potato" → "Loves a nap") without a data migration.
 *
 * Keep the codes here in step with APPROX_AGES / LIFE_STAGES / SIZES /
 * PET_TYPES in that validation file — it is the server-side half of this list.
 */

import {
  Bird,
  Cat,
  Dog,
  HelpCircle,
  Rabbit,
  Turtle,
} from "@/components/icons"

export type PetType = "dog" | "cat" | "bird" | "small_pet" | "reptile" | "other"
export type PetGender = "male" | "female"
export type LifeStage = "baby" | "young" | "adult" | "senior"
export type ApproxAge =
  | "under_six_months"
  | "six_to_twelve_months"
  | "one_to_two_years"
  | "three_to_five_years"
  | "five_to_seven_years"
  | "over_seven_years"
export type PetSize = "toy" | "small" | "medium" | "large"

type Option<T extends string> = { value: T; label: string }

export const PET_TYPES: {
  value: PetType
  label: string
  Icon: typeof Dog
  /** Tailwind classes for the card's selected state — one accent per species. */
  accent: string
}[] = [
  { value: "dog", label: "Dog", Icon: Dog, accent: "bg-kudl-tint text-kudl-primary" },
  { value: "cat", label: "Cat", Icon: Cat, accent: "bg-kudl-amber-from text-kudl-amber-body" },
  { value: "bird", label: "Bird", Icon: Bird, accent: "bg-kudl-teal-light text-kudl-teal" },
  { value: "small_pet", label: "Small Pet", Icon: Rabbit, accent: "bg-kudl-coral-light text-kudl-coral" },
  { value: "reptile", label: "Reptile", Icon: Turtle, accent: "bg-kudl-violet-light text-kudl-violet" },
  { value: "other", label: "Other", Icon: HelpCircle, accent: "bg-kudl-surface text-kudl-subtle" },
]

export const GENDERS: Option<PetGender>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

/**
 * Life-stage labels depend on the species — "Puppy" is wrong for a cat and
 * meaningless for a tortoise — so the baby stage is looked up per type while
 * the rest stay constant.
 */
const BABY_LABEL: Record<PetType, string> = {
  dog: "Puppy",
  cat: "Kitten",
  bird: "Chick",
  small_pet: "Baby",
  reptile: "Hatchling",
  other: "Baby",
}

export const lifeStages = (type: PetType | null): Option<LifeStage>[] => [
  { value: "baby", label: type ? BABY_LABEL[type] : "Baby" },
  { value: "young", label: "Young" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
]

export const APPROX_AGES: Option<ApproxAge>[] = [
  { value: "under_six_months", label: "Under 6 months" },
  { value: "six_to_twelve_months", label: "6–12 months" },
  { value: "one_to_two_years", label: "1–2 years" },
  { value: "three_to_five_years", label: "3–5 years" },
  { value: "five_to_seven_years", label: "5–7 years" },
  { value: "over_seven_years", label: "7+ years" },
]

export const SIZES: (Option<PetSize> & { detail: string })[] = [
  { value: "toy", label: "Toy", detail: "Under 5kg" },
  { value: "small", label: "Small", detail: "5–10kg" },
  { value: "medium", label: "Medium", detail: "10–25kg" },
  { value: "large", label: "Large / Giant", detail: "25kg+" },
]

/**
 * "None" is a real answer, not the absence of one — an owner who has actively
 * confirmed no known allergies is different from one who skipped the question,
 * and only the first is safe to act on in a recommendation. So it is a stored
 * value, and picking it clears every other tag (see the onboarding step).
 */
export const NO_ALLERGIES = "none"

export const ALLERGIES: Option<string>[] = [
  { value: "grain_free", label: "Grain-Free" },
  { value: "chicken_allergy", label: "Chicken Allergy" },
  { value: "beef_allergy", label: "Beef Allergy" },
  { value: "dairy_intolerance", label: "Dairy Intolerance" },
  { value: "sensitive_stomach", label: "Sensitive Stomach" },
  { value: "skin_allergies", label: "Skin Allergies" },
  { value: NO_ALLERGIES, label: "No known allergies" },
]

export const PERSONALITIES: Option<string>[] = [
  { value: "couch_potato", label: "Couch Potato 🛋️" },
  { value: "zoomies_specialist", label: "Zoomies Specialist 💨" },
  { value: "foodie", label: "Foodie 🍗" },
  { value: "cuddle_bug", label: "Cuddle Bug 🤗" },
  { value: "adventurer", label: "Adventurer 🥾" },
  { value: "shy_gentle", label: "Shy & Gentle 🌸" },
  { value: "chatterbox", label: "Chatterbox 🗣️" },
  { value: "escape_artist", label: "Escape Artist 🪄" },
]

/**
 * Breed suggestions per species. Intentionally short — this is a convenience
 * list for a searchable input that also accepts free text, not an attempt at a
 * complete registry. "Mixed / Indie / Rescue" and "Don't know" come first
 * because for a great many pets in India they are the honest answer, and
 * burying them under pedigree names quietly pressures people to guess.
 */
export const MIXED_BREED = "Mixed / Indie / Rescue"
export const UNKNOWN_BREED = "Don't know"

const COMMON_FIRST = [MIXED_BREED, UNKNOWN_BREED]

const BREEDS_BY_TYPE: Record<PetType, string[]> = {
  dog: [
    "Labrador Retriever", "Golden Retriever", "German Shepherd", "Beagle",
    "Shih Tzu", "Pug", "Rottweiler", "Boxer", "Dachshund", "Cocker Spaniel",
    "Doberman", "Great Dane", "Husky", "Pomeranian", "Chihuahua",
    "Border Collie", "Dalmatian", "Saint Bernard", "Indie / Desi",
  ],
  cat: [
    "Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair",
    "Ragdoll", "Sphynx", "Himalayan", "Russian Blue", "Bombay",
    "Indian Billi / Desi", "Domestic Shorthair", "Domestic Longhair",
  ],
  bird: [
    "Budgerigar", "Cockatiel", "Lovebird", "African Grey", "Macaw",
    "Cockatoo", "Canary", "Finch", "Conure", "Parakeet",
  ],
  small_pet: [
    "Rabbit", "Guinea Pig", "Hamster", "Gerbil", "Ferret",
    "Chinchilla", "Mouse", "Rat",
  ],
  reptile: [
    "Bearded Dragon", "Leopard Gecko", "Ball Python", "Corn Snake",
    "Turtle", "Tortoise", "Iguana", "Chameleon",
  ],
  other: [],
}

export const breedsFor = (type: PetType | null): string[] =>
  type ? [...COMMON_FIRST, ...BREEDS_BY_TYPE[type]] : COMMON_FIRST

// ─── Display helpers, shared by the profile page ────────────────────────────

const labelFrom = <T extends string>(
  options: Option<T>[],
  value: string | null | undefined
): string | null => options.find((o) => o.value === value)?.label ?? null

export const petTypeLabel = (value: string | null | undefined): string =>
  PET_TYPES.find((t) => t.value === value)?.label ?? "Pet"

export const petTypeIcon = (value: string | null | undefined): typeof Dog =>
  PET_TYPES.find((t) => t.value === value)?.Icon ?? HelpCircle

export const genderLabel = (value: string | null | undefined) =>
  labelFrom(GENDERS, value)

export const sizeLabel = (value: string | null | undefined) =>
  SIZES.find((s) => s.value === value)?.label ?? null

export const approxAgeLabel = (value: string | null | undefined) =>
  labelFrom(APPROX_AGES, value)

export const lifeStageLabel = (
  value: string | null | undefined,
  type: PetType | null | undefined
) => labelFrom(lifeStages((type as PetType) ?? null), value)

export const allergyLabel = (value: string) =>
  labelFrom(ALLERGIES, value) ?? value

export const personalityLabel = (value: string) =>
  labelFrom(PERSONALITIES, value) ?? value

/**
 * Human age from a birthday, e.g. "3 yrs 2 mos" or "5 mos".
 *
 * Months matter for young animals — the difference between a 2-month and an
 * 8-month puppy is a different food, so "0 years" would be useless — and stop
 * mattering once an animal is grown, hence the switch at one year.
 */
export const ageFromBirthday = (birthday: string | null | undefined): string | null => {
  if (!birthday) return null
  const born = new Date(birthday)
  if (Number.isNaN(born.getTime())) return null

  const now = new Date()
  let months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (now.getDate() < born.getDate()) months -= 1
  if (months < 0) return null

  if (months < 12) return `${months} mo${months === 1 ? "" : "s"}`

  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = `${years} yr${years === 1 ? "" : "s"}`
  return rest ? `${y} ${rest} mo${rest === 1 ? "" : "s"}` : y
}

/** The one-line age summary shown on a pet card, from whichever field is set. */
export const ageSummary = (pet: {
  birthday?: string | null
  life_stage?: string | null
  approx_age?: string | null
  type?: string | null
}): string | null =>
  ageFromBirthday(pet.birthday) ??
  approxAgeLabel(pet.approx_age) ??
  lifeStageLabel(pet.life_stage, pet.type as PetType) ??
  null
