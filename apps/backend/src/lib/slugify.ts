/**
 * Mirror of the storefront's src/lib/slugify.ts. The seed stamps
 * `metadata.subcategory` / `metadata.pharmacyCategory` with slugs the
 * storefront's mega menu and filter checkboxes compare against, so both sides
 * have to slug a label exactly the same way — a divergence here silently
 * produces filters that match nothing.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
