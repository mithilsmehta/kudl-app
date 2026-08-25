/**
 * Customer-facing order reference.
 *
 * Medusa's `display_id` is a single counter shared by every order in the store, so a
 * customer sees their own orders as #1 and #4 and reasonably assumes two of their
 * orders went missing. It also leaks the store's total order volume to anyone who
 * places one.
 *
 * The reference is derived from the order id instead. Medusa ids are ULIDs whose tail
 * is the random component, so the suffix is effectively unique without being a
 * sequence — no gaps to explain, and nothing disclosed about how many orders exist.
 *
 * Derived rather than stored, so no migration is needed and the same order always
 * produces the same reference. `display_id` is untouched and still used in Medusa
 * Admin, where a running count is genuinely useful.
 */

const REFERENCE_LENGTH = 8

export const formatOrderReference = (order: {
  id: string
  display_id?: number
}): string => {
  // Strip Medusa's "order_" prefix so the reference is all signal.
  const raw = order.id.replace(/^order_/, "")
  const suffix = raw.slice(-REFERENCE_LENGTH).toUpperCase()

  // A malformed or unusually short id should still yield something usable rather
  // than an empty reference.
  if (suffix.length < 4) {
    return `KUDL-${String(order.display_id ?? raw).toUpperCase()}`
  }

  return `KUDL-${suffix}`
}
