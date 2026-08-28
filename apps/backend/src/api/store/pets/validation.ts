import { MedusaError } from "@medusajs/framework/utils"

/**
 * Hand-rolled validation for the pet routes.
 *
 * Deliberately not trusting the client: the storefront disables its Next button
 * until the required fields are filled, but that is a convenience for the
 * person using it, not a constraint on what reaches the API. Anything that
 * would produce a row the storefront cannot render — an unknown pet type, a
 * blank name, a personality array containing objects — is rejected here.
 */

export const PET_TYPES = ["dog", "cat", "bird", "small_pet", "reptile", "other"] as const
export const GENDERS = ["male", "female"] as const
export const LIFE_STAGES = ["baby", "young", "adult", "senior"] as const
/*
 * Word-based values, not digit-leading ones: GraphQL enum values cannot start
 * with a digit and Medusa builds a schema from the pet model, so "6_12_months"
 * would stop the backend booting.
 */
export const APPROX_AGES = [
  "under_six_months",
  "six_to_twelve_months",
  "one_to_two_years",
  "three_to_five_years",
  "five_to_seven_years",
  "over_seven_years",
] as const
export const SIZES = ["toy", "small", "medium", "large"] as const

/** Guards against a single pet row carrying an unbounded blob of tags. */
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 40
const MAX_NAME_LENGTH = 60
const MAX_BREED_LENGTH = 80
const MAX_URL_LENGTH = 2048

export type PetInput = {
  name: string
  type: (typeof PET_TYPES)[number]
  gender: (typeof GENDERS)[number]
  avatar_url?: string | null
  breed?: string | null
  birthday?: string | null
  life_stage?: (typeof LIFE_STAGES)[number] | null
  approx_age?: (typeof APPROX_AGES)[number] | null
  size?: (typeof SIZES)[number] | null
  allergies?: string[] | null
  spayed_neutered?: boolean | null
  personality?: string[] | null
}

const bad = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const cleanString = (
  value: unknown,
  field: string,
  maxLength: number
): string | null => {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") bad(`"${field}" must be a string.`)
  const trimmed = (value as string).trim()
  if (!trimmed) return null
  if (trimmed.length > maxLength) {
    bad(`"${field}" must be ${maxLength} characters or fewer.`)
  }
  return trimmed
}

const cleanEnum = <T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T
): T[number] | null => {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string" || !allowed.includes(value)) {
    bad(`"${field}" must be one of: ${allowed.join(", ")}.`)
  }
  return value as T[number]
}

const cleanTags = (value: unknown, field: string): string[] | null => {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value)) bad(`"${field}" must be an array of strings.`)
  const tags = (value as unknown[]).map((tag) => {
    if (typeof tag !== "string" || !tag.trim()) {
      bad(`"${field}" must contain only non-empty strings.`)
    }
    const trimmed = (tag as string).trim()
    if (trimmed.length > MAX_TAG_LENGTH) {
      bad(`Each "${field}" entry must be ${MAX_TAG_LENGTH} characters or fewer.`)
    }
    return trimmed
  })
  if (tags.length > MAX_TAGS) {
    bad(`"${field}" cannot have more than ${MAX_TAGS} entries.`)
  }
  // Deduplicate rather than reject: two identical chips is a client bug, not
  // something worth failing a customer's save over.
  return Array.from(new Set(tags))
}

const cleanBirthday = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") bad('"birthday" must be an ISO date string.')
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    bad('"birthday" is not a valid date.')
  }
  // A birthday in the future is always a typo, and it would make every
  // age calculation in the UI negative.
  if (date.getTime() > Date.now()) {
    bad('"birthday" cannot be in the future.')
  }
  return date
}

const cleanBoolean = (value: unknown, field: string): boolean | null => {
  if (value === undefined || value === null) return null
  if (typeof value !== "boolean") bad(`"${field}" must be true or false.`)
  return value as boolean
}

/**
 * Validates and normalises a create payload. Required fields are the same three
 * the onboarding form makes mandatory in step 1, plus nothing else — step 2's
 * "required" breed and age are enforced in the UI only, because a pet added
 * later from the profile page should not be blocked on them.
 */
export const parseCreate = (body: any) => {
  const name = cleanString(body?.name, "name", MAX_NAME_LENGTH)
  if (!name) bad('"name" is required.')

  const type = cleanEnum(body?.type, "type", PET_TYPES)
  if (!type) bad('"type" is required.')

  const gender = cleanEnum(body?.gender, "gender", GENDERS)
  if (!gender) bad('"gender" is required.')

  return {
    name: name!,
    type: type!,
    gender: gender!,
    avatar_url: cleanString(body?.avatar_url, "avatar_url", MAX_URL_LENGTH),
    breed: cleanString(body?.breed, "breed", MAX_BREED_LENGTH),
    birthday: cleanBirthday(body?.birthday),
    life_stage: cleanEnum(body?.life_stage, "life_stage", LIFE_STAGES),
    approx_age: cleanEnum(body?.approx_age, "approx_age", APPROX_AGES),
    size: cleanEnum(body?.size, "size", SIZES),
    allergies: cleanTags(body?.allergies, "allergies"),
    spayed_neutered: cleanBoolean(body?.spayed_neutered, "spayed_neutered"),
    personality: cleanTags(body?.personality, "personality"),
  }
}

/**
 * Validates a partial update. Only keys actually present in the body are
 * returned, so a PATCH-style save from the profile page cannot blank a field
 * the form did not include.
 */
export const parseUpdate = (body: any) => {
  const update: Record<string, unknown> = {}
  const has = (key: string) =>
    body && Object.prototype.hasOwnProperty.call(body, key)

  if (has("name")) {
    const name = cleanString(body.name, "name", MAX_NAME_LENGTH)
    if (!name) bad('"name" cannot be empty.')
    update.name = name
  }
  if (has("type")) {
    const type = cleanEnum(body.type, "type", PET_TYPES)
    if (!type) bad('"type" cannot be empty.')
    update.type = type
  }
  if (has("gender")) {
    const gender = cleanEnum(body.gender, "gender", GENDERS)
    if (!gender) bad('"gender" cannot be empty.')
    update.gender = gender
  }
  if (has("avatar_url")) {
    update.avatar_url = cleanString(body.avatar_url, "avatar_url", MAX_URL_LENGTH)
  }
  if (has("breed")) {
    update.breed = cleanString(body.breed, "breed", MAX_BREED_LENGTH)
  }
  if (has("birthday")) update.birthday = cleanBirthday(body.birthday)
  if (has("life_stage")) {
    update.life_stage = cleanEnum(body.life_stage, "life_stage", LIFE_STAGES)
  }
  if (has("approx_age")) {
    update.approx_age = cleanEnum(body.approx_age, "approx_age", APPROX_AGES)
  }
  if (has("size")) update.size = cleanEnum(body.size, "size", SIZES)
  if (has("allergies")) update.allergies = cleanTags(body.allergies, "allergies")
  if (has("spayed_neutered")) {
    update.spayed_neutered = cleanBoolean(body.spayed_neutered, "spayed_neutered")
  }
  if (has("personality")) {
    update.personality = cleanTags(body.personality, "personality")
  }

  if (!Object.keys(update).length) {
    bad("No fields to update.")
  }
  return update
}
