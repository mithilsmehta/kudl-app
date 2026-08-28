import { model } from "@medusajs/framework/utils"

/**
 * A pet belonging to a customer, collected by the storefront's onboarding flow
 * and editable afterwards from the profile page.
 *
 * `customer_id` is a plain indexed column rather than a module link. A link
 * would be the more orthodox Medusa modelling, but a pet is only ever read in
 * the context of "this signed-in customer's pets" — never joined from the
 * customer side, never queried across customers — so the extra indirection
 * would buy nothing and every route would still filter on the same value.
 *
 * Nullability mirrors the onboarding form exactly: `name`, `type` and `gender`
 * are required in step 1, `breed` is required in step 2, and everything else is
 * optional. Age is deliberately three mutually-forgiving columns rather than
 * one — see the comment on `birthday` below.
 */
const Pet = model
  .define("pet", {
    id: model.id({ prefix: "pet" }).primaryKey(),

    /** Owner. Every store route filters on this, so it is never nullable. */
    customer_id: model.text(),

    name: model.text(),
    type: model.enum(["dog", "cat", "bird", "small_pet", "reptile", "other"]),
    gender: model.enum(["male", "female"]),

    /** Uploaded avatar URL, or null for the illustrated fallback. */
    avatar_url: model.text().nullable(),

    /**
     * Breed label. Free text rather than an enum because the storefront's list
     * is a convenience, not a constraint: "Mixed / Indie / Rescue" and
     * "Don't know" are real answers people give, and a breed list can never be
     * complete enough to reject what someone types.
     */
    breed: model.text().nullable(),

    /*
     * Age, in three columns, exactly one of which is usually set.
     *
     * Most owners of a rescue do not know a birthday, and forcing a date would
     * make them invent one — which is worse than no data, because it looks
     * precise. So the form offers an exact date, a life stage, or an
     * approximate age band, and whichever they picked is the column that gets
     * filled. All three are nullable so none of the paths is privileged.
     */
    birthday: model.dateTime().nullable(),
    life_stage: model.enum(["baby", "young", "adult", "senior"]).nullable(),
    /*
     * Values are words, not digits. Medusa derives a GraphQL schema from this
     * model and GraphQL enum values may not begin with a digit, so "6_12_months"
     * makes the whole backend fail to boot with
     * `Syntax Error: Invalid number, expected digit but got: "_"`.
     */
    approx_age: model.enum(["under_six_months", "six_to_twelve_months", "one_to_two_years", "three_to_five_years", "five_to_seven_years", "over_seven_years"]).nullable(),

    size: model.enum(["toy", "small", "medium", "large"]).nullable(),

    /** Free-form tags from the allergy multi-select, e.g. ["grain_free"]. */
    allergies: model.json<string[]>().nullable(),

    /** Tri-state on purpose: true / false / "not answered". */
    spayed_neutered: model.boolean().nullable(),

    /** Personality chips, e.g. ["couch_potato", "foodie"]. */
    personality: model.json<string[]>().nullable(),
  })
  .indexes([
    // The only access pattern: list one customer's pets, newest last.
    { on: ["customer_id", "created_at"] },
  ])

export default Pet
