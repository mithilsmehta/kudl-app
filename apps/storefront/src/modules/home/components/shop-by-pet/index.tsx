import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SectionHeading from "@modules/home/components/section-heading"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

const PETS = [
  {
    title: "Dogs",
    handle: "dogs",
    blurb: "Food, treats, toys & everyday essentials",
    cta: "Shop Dogs",
    image: "/images/pets/dogs.svg",
    alt: "Illustration of a dog",
  },
  {
    title: "Cats",
    handle: "cats",
    blurb: "Food, treats, litter & everyday essentials",
    cta: "Shop Cats",
    image: "/images/pets/cats.svg",
    alt: "Illustration of a cat",
  },
]

const ShopByPet = () => {
  return (
    <section className="content-container py-14 small:py-16">
      <SectionHeading
        title="Shop for Your Pet"
        subtitle="Pick your companion and we'll narrow things down."
      />

      <div className="grid gap-5 small:grid-cols-2 small:gap-6">
        {PETS.map((pet) => (
          <LocalizedClientLink
            key={pet.handle}
            href={`/categories/${pet.handle}`}
            className="group relative flex overflow-hidden rounded-2xl border border-kudl-border bg-kudl-light transition-shadow hover:shadow-[0_10px_30px_rgba(23,23,23,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
          >
            <div className="flex flex-1 flex-col justify-center p-6 small:p-8">
              <h3 className="text-2xl font-semibold tracking-tight text-kudl-ink">
                {pet.title}
              </h3>
              <p className="mt-2 max-w-[16rem] text-sm leading-6 text-kudl-muted">
                {pet.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-kudl-primary">
                {pet.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>

            <div className="relative w-32 shrink-0 self-stretch xsmall:w-44 small:w-52">
              <Image
                src={pet.image}
                alt={pet.alt}
                fill
                sizes="(max-width: 1024px) 40vw, 220px"
                className="object-contain object-right p-3 transition-transform duration-300 group-hover:scale-[1.05]"
              />
            </div>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}

export default ShopByPet
