/**
 * Turns a taxonomy label into the URL/metadata-safe slug used to link mega
 * menu items and filter checkboxes to the same value. Kept as a single
 * shared helper so a category name never gets slugged two different ways in
 * two different components.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
