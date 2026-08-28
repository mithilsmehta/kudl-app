import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * The privacy choices a customer can make about their own data, and the single
 * place that knows how they are stored and defaulted.
 *
 * These live in `customer.metadata.privacy` rather than in a table of their own.
 * A dedicated module would be the more scalable modelling, but there are three
 * booleans, they are only ever read for "the customer making this request", and
 * they are written from exactly one route — a whole module and migration would
 * buy nothing here. If this grows past a handful of flags, or ever needs to be
 * queried across customers (e.g. "who may we email?"), promote it then.
 *
 * Everything defaults to ON. That is deliberate and matches how the app behaved
 * before these settings existed: an account created earlier has no `privacy` key
 * at all, and it must keep working exactly as it did rather than silently losing
 * its recommendations the day this shipped.
 */
export type PrivacySettings = {
  /** Promotional email / push. Order updates are transactional and not covered. */
  marketing_emails: boolean
  /** Whether browsing and purchase activity is recorded at all. */
  activity_tracking: boolean
  /** Whether recorded activity may be used to rank products for this customer. */
  personalized_recommendations: boolean
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  marketing_emails: true,
  activity_tracking: true,
  personalized_recommendations: true,
}

/** The key inside `customer.metadata` that holds the object above. */
export const PRIVACY_METADATA_KEY = "privacy"

/**
 * Reads settings out of a customer's metadata, tolerating every shape a
 * hand-edited or legacy metadata blob can be in: missing, null, a non-object, or
 * an object with only some of the keys set.
 */
export const readPrivacySettings = (
  metadata: Record<string, unknown> | null | undefined
): PrivacySettings => {
  const raw = (metadata ?? {})[PRIVACY_METADATA_KEY]

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PRIVACY_SETTINGS }
  }

  const stored = raw as Record<string, unknown>
  const pick = (key: keyof PrivacySettings): boolean =>
    typeof stored[key] === "boolean"
      ? (stored[key] as boolean)
      : DEFAULT_PRIVACY_SETTINGS[key]

  return {
    marketing_emails: pick("marketing_emails"),
    activity_tracking: pick("activity_tracking"),
    personalized_recommendations: pick("personalized_recommendations"),
  }
}

/**
 * Loads one customer's settings straight from the database.
 *
 * Used by the recommendation routes, which have a customer id from the bearer
 * token but no customer record in hand. Returns the defaults for an unknown id
 * so a caller can never be broken by a missing row — the routes that consume
 * this are ranking products, not enforcing access.
 */
export const loadPrivacySettings = async (
  scope: MedusaContainer,
  customerId: string
): Promise<PrivacySettings> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  return readPrivacySettings(customers?.[0]?.metadata as Record<string, unknown>)
}
