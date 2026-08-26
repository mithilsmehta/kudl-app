"use client"

/**
 * The actual filter body — all seven groups (Pet Type, Category, Breed,
 * Price, Brand, Rating, Availability) — rendered once and reused by both
 * FilterSidebar (desktop chrome) and FilterDrawer (mobile chrome) so the
 * groups themselves never get duplicated.
 *
 * Counts are computed against the full unfiltered product list, not the
 * currently-filtered set — a deliberate simplification (matches how most
 * listing UIs show static facet counts) that avoids a selected option's own
 * count changing to reflect itself.
 */

import { Product } from "@/lib/api"
import {
  getBrand,
  getBreeds,
  getCategory,
  getInStock,
  getPetType,
  getPharmacyCategory,
  getSubcategory,
} from "@/lib/productFacets"
import { BREEDS } from "@/lib/homeContent"
import { allBrands, catsMenu, dogsMenu, pharmacyMenu } from "@/lib/taxonomy"
import FilterGroup from "@/components/products/FilterGroup"
import {
  CATEGORY_OPTIONS,
  Filters,
  PET_TYPE_OPTIONS,
  PRICE_RANGES,
  RATING_OPTIONS,
  toggleValue,
} from "@/components/products/filterTypes"

function CheckboxRow({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string
  label: string
  count: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-2 text-sm text-kudl-body"
    >
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-kudl-hairline text-kudl-primary focus-visible:ring-2 focus-visible:ring-kudl-primary"
        />
        {label}
      </span>
      <span className="text-xs text-kudl-faint">({count})</span>
    </label>
  )
}

function RadioRow({
  id,
  name,
  label,
  checked,
  onChange,
}: {
  id: string
  name: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 text-sm text-kudl-body"
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-kudl-hairline text-kudl-primary focus-visible:ring-2 focus-visible:ring-kudl-primary"
      />
      {label}
    </label>
  )
}

export default function FilterPanel({
  products,
  filters,
  onChange,
}: {
  products: Product[]
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const petTypeCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const breedCounts: Record<string, number> = {}
  const brandCounts: Record<string, number> = {}
  const subcategoryCounts: Record<string, number> = {}
  const pharmacyCounts: Record<string, number> = {}

  for (const p of products) {
    const petType = getPetType(p)
    if (petType) petTypeCounts[petType] = (petTypeCounts[petType] ?? 0) + 1

    const category = getCategory(p)
    if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1

    for (const breed of getBreeds(p)) {
      breedCounts[breed] = (breedCounts[breed] ?? 0) + 1
    }

    const brand = getBrand(p)
    if (brand) brandCounts[brand] = (brandCounts[brand] ?? 0) + 1

    const subcategory = getSubcategory(p)
    if (subcategory) subcategoryCounts[subcategory] = (subcategoryCounts[subcategory] ?? 0) + 1

    const pharmacyCategory = getPharmacyCategory(p)
    if (pharmacyCategory) pharmacyCounts[pharmacyCategory] = (pharmacyCounts[pharmacyCategory] ?? 0) + 1
  }

  // Union with the taxonomy's brand directory so the full catalogue shows,
  // not just brands the (smaller) seeded catalog happens to carry — same gap
  // already accepted by ShopByBrand's brand strip.
  const brandOptions = Array.from(new Set([...Object.keys(brandCounts), ...allBrands])).sort(
    (a, b) => a.localeCompare(b)
  )
  const inStockCount = products.filter(getInStock).length

  // Only render the species-specific taxonomy drill-down when exactly one
  // pet type is selected — with none or several selected, showing both
  // Dogs' 10 categories and Cats' 12 would overwhelm the sidebar.
  const taxonomyMenu =
    filters.petType.length === 1
      ? filters.petType[0] === "dogs"
        ? dogsMenu
        : filters.petType[0] === "cats"
          ? catsMenu
          : null
      : null

  return (
    <div>
      <FilterGroup title="Pet Type">
        {PET_TYPE_OPTIONS.map((opt) => (
          <CheckboxRow
            key={opt.value}
            id={`filter-pet-${opt.value}`}
            label={opt.label}
            count={petTypeCounts[opt.value] ?? 0}
            checked={filters.petType.includes(opt.value)}
            onChange={() =>
              onChange({ ...filters, petType: toggleValue(filters.petType, opt.value) })
            }
          />
        ))}
        {/* Pharmacy is cross-species (see lib/taxonomy.ts), not a PetType, so
            it toggles the separate pharmacyOnly flag rather than joining
            filters.petType — but sits alongside Dogs/Cats here since that's
            how shoppers think of the three departments. */}
        <CheckboxRow
          id="filter-pet-pharmacy"
          label="Pharmacy"
          count={products.filter((p) => getPharmacyCategory(p) !== null).length}
          checked={filters.pharmacyOnly}
          onChange={() => onChange({ ...filters, pharmacyOnly: !filters.pharmacyOnly })}
        />
      </FilterGroup>

      <FilterGroup title="Category">
        {CATEGORY_OPTIONS.map((opt) => (
          <CheckboxRow
            key={opt.value}
            id={`filter-cat-${opt.value}`}
            label={opt.label}
            count={categoryCounts[opt.value] ?? 0}
            checked={filters.category.includes(opt.value)}
            onChange={() =>
              onChange({ ...filters, category: toggleValue(filters.category, opt.value) })
            }
          />
        ))}
      </FilterGroup>

      {taxonomyMenu && (
        <FilterGroup
          title={filters.petType[0] === "dogs" ? "Dog Categories" : "Cat Categories"}
        >
          <div className="space-y-4">
            {taxonomyMenu
              .filter((cat) => cat.category !== "Popular Brands")
              .map((cat) => (
                <div key={cat.slug}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-kudl-faint">
                    {cat.category}
                  </p>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <CheckboxRow
                        key={item.slug}
                        id={`filter-sub-${item.slug}`}
                        label={item.name}
                        count={subcategoryCounts[item.slug] ?? 0}
                        checked={filters.subcategory.includes(item.slug)}
                        onChange={() =>
                          onChange({
                            ...filters,
                            subcategory: toggleValue(filters.subcategory, item.slug),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Pharmacy Categories" defaultOpen={false}>
        <div className="space-y-4">
          {pharmacyMenu.map((cat) => (
            <div key={cat.slug}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-kudl-faint">
                {cat.category}
              </p>
              <div className="space-y-2">
                {cat.items.map((item) => (
                  <CheckboxRow
                    key={item.slug}
                    id={`filter-pharmacy-${item.slug}`}
                    label={item.name}
                    count={pharmacyCounts[item.slug] ?? 0}
                    checked={filters.pharmacyCategory.includes(item.slug)}
                    onChange={() =>
                      onChange({
                        ...filters,
                        pharmacyCategory: toggleValue(filters.pharmacyCategory, item.slug),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Shop By Breed" defaultOpen={false}>
        {BREEDS.map((breed) => (
          <CheckboxRow
            key={breed.slug}
            id={`filter-breed-${breed.slug}`}
            label={breed.name}
            count={breedCounts[breed.slug] ?? 0}
            checked={filters.breed.includes(breed.slug)}
            onChange={() =>
              onChange({ ...filters, breed: toggleValue(filters.breed, breed.slug) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price Range">
        {PRICE_RANGES.map((range) => (
          <RadioRow
            key={range.id}
            id={`filter-price-${range.id}`}
            name="price-range"
            label={range.label}
            checked={filters.priceRange === range.id}
            onChange={() =>
              onChange({
                ...filters,
                priceRange: filters.priceRange === range.id ? null : range.id,
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Brand">
        {brandOptions.map((brand) => (
          <CheckboxRow
            key={brand}
            id={`filter-brand-${brand}`}
            label={brand}
            count={brandCounts[brand] ?? 0}
            checked={filters.brand.includes(brand)}
            onChange={() => onChange({ ...filters, brand: toggleValue(filters.brand, brand) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Customer Rating" defaultOpen={false}>
        <RadioRow
          id="filter-rating-all"
          name="rating"
          label="All"
          checked={filters.minRating === null}
          onChange={() => onChange({ ...filters, minRating: null })}
        />
        {RATING_OPTIONS.map((rating) => (
          <RadioRow
            key={rating}
            id={`filter-rating-${rating}`}
            name="rating"
            label={`${rating}★ & up`}
            checked={filters.minRating === rating}
            onChange={() => onChange({ ...filters, minRating: rating })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Availability" defaultOpen={false}>
        <CheckboxRow
          id="filter-in-stock"
          label="In Stock Only"
          count={inStockCount}
          checked={filters.inStockOnly}
          onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
        />
      </FilterGroup>
    </div>
  )
}
