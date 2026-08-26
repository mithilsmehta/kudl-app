/**
 * Static content for homepage sections that have no Medusa-backed data model
 * yet (dog breeds, testimonials, blog posts, brand directory). Unlike
 * lib/config.ts, none of this describes real store state — it's placeholder
 * copy for sections a future CMS or backend feature could replace.
 */

export interface Breed {
  name: string
  slug: string
}

// Order matches the requested "Shop By Breed" lineup.
export const BREEDS: Breed[] = [
  { name: "Golden Retriever", slug: "golden-retriever" },
  { name: "German Shepherd", slug: "german-shepherd" },
  { name: "Labrador", slug: "labrador" },
  { name: "Rottweiler", slug: "rottweiler" },
  { name: "Beagle", slug: "beagle" },
  { name: "Shih Tzu", slug: "shih-tzu" },
  { name: "Boxer", slug: "boxer" },
]

export interface Testimonial {
  name: string
  petName: string
  quote: string
  rating: number
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ananya R.",
    petName: "Bruno",
    quote:
      "Bruno is a fussy eater but he genuinely loves the food from KUDL. Delivery to Bengaluru was quicker than I expected too.",
    rating: 5,
  },
  {
    name: "Vikram S.",
    petName: "Mimi",
    quote:
      "Great range for cats, which is usually the hard part in India. The toys held up well against Mimi's claws.",
    rating: 5,
  },
  {
    name: "Priya M.",
    petName: "Coco",
    quote:
      "Easy returns saved me when I ordered the wrong size harness. Support replied within the hour.",
    rating: 4,
  },
]

export interface BlogPost {
  title: string
  category: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    title: "How much should you really be feeding your dog?",
    category: "Nutrition",
  },
  {
    title: "5 signs your cat's litter box setup needs a change",
    category: "Cat Care",
  },
  {
    title: "Monsoon grooming: keeping your pet's coat healthy",
    category: "Grooming",
  },
]
