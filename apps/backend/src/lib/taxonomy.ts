/**
 * Mega menu / filter taxonomy sourced from Supertails_MegaMenu_Taxonomy_1_1.xlsx
 * (Dogs, Cats and Pharmacy sheets). This is a deliberate copy of the
 * storefront's src/lib/taxonomy.ts: the backend cannot import across the
 * workspace boundary, and both sides need the identical tree — the seed builds
 * the Medusa product_category tree and stamps metadata slugs from it, and the
 * storefront renders the mega menu and filters from it. Keep the two in sync;
 * seed-kudl-catalog.ts validates every product against this file and throws on
 * a label it cannot find, which is what catches a drift between them.
 *
 * `slug` on every item/category is derived once here with slugify() so the
 * Medusa category handles, the metadata slugs and the storefront's mega menu
 * links can never disagree about the same label.
 */

import { slugify } from "./slugify"

export interface TaxonomyItem {
  name: string
  slug: string
  badge?: string
}

export interface TaxonomyCategory {
  category: string
  slug: string
  items: TaxonomyItem[]
}

const withSlugs = (categories: { category: string; items: { name: string; badge?: string }[] }[]): TaxonomyCategory[] =>
  categories.map((c) => ({
    category: c.category,
    slug: slugify(c.category),
    items: c.items.map((i) => ({ ...i, slug: slugify(i.name) })),
  }))

export const dogsMenu: TaxonomyCategory[] = withSlugs([
  { category: "Dog Food", items: [
    { name: "Dry Food" }, { name: "Wet Food" }, { name: "Puppy Food" },
    { name: "Grain Free Food" }, { name: "Baked Dry Food" }, { name: "Veg Dog Food" },
    { name: "Fresh Food" }, { name: "Prescription Diet" },
  ]},
  { category: "Dog Treats & Chews", items: [
    { name: "Biscuits & Cookies" }, { name: "Bones & Chews" }, { name: "Dental Treats" },
    { name: "Jerky Treats" }, { name: "Training Treats" }, { name: "Henlo Treats", badge: "#1 Treat" },
  ]},
  { category: "Pharmacy (Dogs)", items: [
    { name: "Prescription Diet" }, { name: "Dewormer" }, { name: "Tick & Flea" },
    { name: "Skin Care" }, { name: "Joint Care" }, { name: "Gut Health" },
    { name: "Cardiac Care" }, { name: "Kidney Care" }, { name: "Liver Care" },
    { name: "Eye & Ear Care" }, { name: "Vitamins & Supplements" }, { name: "Pain Medication" },
    { name: "Anti-biotics" }, { name: "Oral Care" }, { name: "Wound Care" }, { name: "Calming Aids" },
  ]},
  { category: "Walk & Travel Essentials", items: [
    { name: "Collars" }, { name: "Leashes" }, { name: "Harnesses" }, { name: "GPS Tracker" },
    { name: "Carriers & Travel Supplies" }, { name: "Cages & Crates" }, { name: "Accessories" },
  ]},
  { category: "Dog Toys", items: [
    { name: "Chew Toys" }, { name: "Smart & Interactive Toys" }, { name: "Plush & Soft Toys" },
    { name: "Rope & Tug Toys" }, { name: "Ball & Fetch Toys" }, { name: "Squeaky Toys" },
    { name: "Treat Dispensing Toys" },
  ]},
  { category: "Dog Clothing", items: [
    { name: "Ethnic Wear" }, { name: "Tshirts & Shirts" }, { name: "Jackets" }, { name: "Hoodies" },
    { name: "Sweaters" }, { name: "Ear Muffs" }, { name: "Bandanas & Bow-ties" }, { name: "Boots & Socks" },
    { name: "Caps" }, { name: "Winter Wear" }, { name: "Summer Wear" },
  ]},
  { category: "Grooming & Hygiene", items: [
    { name: "Shampoos & Conditioners" }, { name: "Tick & Flea Solutions" }, { name: "Brushes & Combs" },
    { name: "Grooming Tools" }, { name: "Trimmers & Nail Clippers" }, { name: "Paw & Nail care" },
    { name: "Oral Care" }, { name: "Deodorants & Perfumes" }, { name: "Towels & Wipes" },
    { name: "Diapers & Training Pads" }, { name: "Cleaning & Waste disposal" }, { name: "Pet Safe Cleaners" },
  ]},
  { category: "Bowls & Feeders", items: [
    { name: "Water Fountain" }, { name: "Food & Water Dispensers" }, { name: "Steel bowls" },
    { name: "Elevated bowls" }, { name: "Slow Feeders & Licky Mats" }, { name: "Printed Bowls" },
    { name: "Dual bowls" }, { name: "Plastic Bowls" },
  ]},
  { category: "Dog Beds & Mats", items: [
    { name: "Cooling Mats" }, { name: "Beds" }, { name: "Mats" }, { name: "Elevated Beds" },
    { name: "Cushions & Blankets" }, { name: "Furniture" }, { name: "Luxury Collection" },
  ]},
  { category: "Popular Brands", items: [
    { name: "Henlo", badge: "#1 Baked Food" }, { name: "Skatrs" }, { name: "Drools" },
    { name: "Royal Canin" }, { name: "Pedigree" }, { name: "Farmina N&D" }, { name: "Carniwel" },
    { name: "Petstar" }, { name: "Kennel Kitchen" }, { name: "Pro Plan", badge: "Popular" },
    { name: "Bark Out Loud" },
  ]},
])

export const catsMenu: TaxonomyCategory[] = withSlugs([
  { category: "Cat Food", items: [
    { name: "Dry Food" }, { name: "Wet Food" }, { name: "Kitten Food" }, { name: "Premium Food" },
  ]},
  { category: "Cat Treats", items: [
    { name: "Creamy Treats" }, { name: "Jerky Treats" }, { name: "Crunchy Treats" },
    { name: "Healthy Treats" }, { name: "Training Treats" },
  ]},
  { category: "Cat Litter Supplies", items: [
    { name: "Litter" }, { name: "Litter Boxes & Toilets" }, { name: "Cleaning & Deodorizers" },
    { name: "Scooper & Waste Disposal" }, { name: "Scented Litter" }, { name: "Unscented Litter" },
    { name: "Flushable Litter" }, { name: "Scoopy", badge: "#1 Cat Litter" },
  ]},
  { category: "Cat Toys", items: [
    { name: "Cat Teasers" }, { name: "Ball & Chaser Toys" }, { name: "Catnip Toys" },
    { name: "Plush Toys" }, { name: "Cat Trees & Scratchers" }, { name: "Smart & Interactive Toys" },
  ]},
  { category: "Pharmacy (Cats)", items: [
    { name: "Dewormer" }, { name: "Tick & Fleas" }, { name: "Skin Care" }, { name: "Joint Care" },
    { name: "Gut Health" }, { name: "Cardiac Care" }, { name: "Kidney Care" }, { name: "Liver Care" },
    { name: "Eye & Ear" }, { name: "Respiratory" }, { name: "Supplements" }, { name: "Prescription Diet" },
    { name: "Calming And Anxiety" }, { name: "Oral Care" },
  ]},
  { category: "Cat Walk & Travel Supplies", items: [
    { name: "GPS Tracker" }, { name: "Collars" }, { name: "Leashes" }, { name: "Harnesses" },
    { name: "Bells & Tags" }, { name: "Carriers & Travel Supplies" }, { name: "Cages & Crates" },
  ]},
  { category: "Cat Clothing", items: [
    { name: "Ethnic Wear" }, { name: "Dresses" }, { name: "Tshirts & Shirts" }, { name: "Kurtas" },
    { name: "Lehangas" }, { name: "Jackets & Sweaters" }, { name: "Hoodies" }, { name: "Bells & Tags" },
    { name: "Bandanas & Bowties" }, { name: "Raincoats" },
  ]},
  { category: "Bowls & Feeders", items: [
    { name: "Water Fountain" }, { name: "Food & Water Dispenser" }, { name: "Steel Bowls" },
    { name: "Printed Bowls" }, { name: "Plastic Bowls" }, { name: "Slow Feeders & Licky mats" },
  ]},
  { category: "Cat Grooming", items: [
    { name: "Shampoos & Conditioners" }, { name: "Brushes & Combs" }, { name: "Paw & Nail Care" },
    { name: "Ear & eye care" }, { name: "Trimmers & Nail Clippers" }, { name: "Grooming Tools" },
    { name: "Towels & Wipes" }, { name: "Deodorants & Perfumes" }, { name: "Anti tick & flea" },
  ]},
  { category: "Beds, Mats & Tents", items: [
    { name: "Beds" }, { name: "Mats" }, { name: "Cooling Mats" }, { name: "Blankets & Cushions" },
    { name: "Furniture" }, { name: "Cat Houses" }, { name: "Cat Trees, Condos & Scratchers" },
  ]},
  { category: "Health & Wellness", items: [
    { name: "Supplements" }, { name: "Anti Tick & Fleas" }, { name: "Calming Aids" },
    { name: "Health Care Aids" }, { name: "Deworming" }, { name: "Prescription Diet" },
  ]},
  { category: "Popular Brands", items: [
    { name: "Felix", badge: "Popular" }, { name: "Drools" }, { name: "Farmina N&D" },
    { name: "Scoopy", badge: "#1 Cat Litter" }, { name: "Sheba" }, { name: "Whiskas" },
    { name: "Royal Canin" }, { name: "Skatrs" }, { name: "Carniwel" },
  ]},
])

export const pharmacyMenu: TaxonomyCategory[] = withSlugs([
  { category: "Supplements", items: [
    { name: "Multivitamins" }, { name: "Calcium supplements" }, { name: "Skin & coat supplements" },
    { name: "Weaning Supplement" }, { name: "Calming & Anxiety" }, { name: "Immunity Boosters" },
    { name: "Appetite Stimulants" }, { name: "Hematinic & Platelet boosters" }, { name: "Weight Management" },
  ]},
  { category: "Antibiotics", items: [{ name: "Antibiotics" }] },
  { category: "Prescription Diet", items: [
    { name: "Gastro Intestinal" }, { name: "Cardiac" }, { name: "Weight Management" },
    { name: "Joint & Mobility" }, { name: "Skin & Coat" }, { name: "Urinary" }, { name: "Recovery" },
    { name: "Hypoallergenic" },
  ]},
  { category: "Pain Medication", items: [{ name: "Pain Medication" }] },
  { category: "System Wise", items: [
    { name: "Skin care" }, { name: "Eye & ear care" }, { name: "Joint care" }, { name: "Liver care" },
    { name: "Cardiac care" }, { name: "Kidney care" }, { name: "Digestive care" },
    { name: "Respiratory care" }, { name: "Endocrine care" },
  ]},
  { category: "Preventive Care", items: [{ name: "Tick and flea" }, { name: "Dewormers" }] },
  { category: "Dogs (Pharmacy)", items: [
    { name: "Dewormer" }, { name: "Tick & Flea" }, { name: "Skin Care" }, { name: "Joint Care" },
    { name: "Digestive Care" }, { name: "Cardiac Care" }, { name: "Kidney Care" }, { name: "Liver Care" },
    { name: "Eye & Ear" }, { name: "Food Supplement" }, { name: "Pain Medication" },
    { name: "Prescription Diet" }, { name: "Anti-biotics" }, { name: "Oral Care" }, { name: "Wound Care" },
  ]},
  { category: "Cats (Pharmacy)", items: [
    { name: "Dewormer" }, { name: "Tick & Flea" }, { name: "Skin Care" }, { name: "Joint Care" },
    { name: "Digestive Care" }, { name: "Cardiac Care" }, { name: "Kidney Care" }, { name: "Liver Care" },
    { name: "Ear & Eye Care" }, { name: "Respiratory" }, { name: "Supplement" },
    { name: "Prescription Diet" }, { name: "Calming & Anxiety" }, { name: "Oral Care" },
  ]},
])
