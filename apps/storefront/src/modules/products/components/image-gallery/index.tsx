import { resolveProductImage } from "@lib/kudl/config"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Product handle, used to fall back to local artwork. */
  handle?: string | null
  title?: string | null
}

const ImageGallery = ({ images, handle, title }: ImageGalleryProps) => {
  // Drop the seed's throwaway placeholder URLs so local artwork is used.
  const usable = images.filter(
    (image) => !!image.url && !image.url.includes("placehold.co")
  )

  const gallery = usable.length
    ? usable.map((image) => ({ id: image.id, url: image.url as string }))
    : [{ id: "fallback", url: resolveProductImage({ handle, thumbnail: null }) }]

  const [main, ...rest] = gallery

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-kudl-border bg-kudl-soft">
        <Image
          src={main.url}
          priority
          alt={title ? `${title} - main image` : "Product image"}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-8"
        />
      </div>

      {rest.length > 0 && (
        <ul className="grid grid-cols-4 gap-3">
          {rest.slice(0, 4).map((image, index) => (
            <li key={image.id}>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-kudl-border bg-kudl-soft">
                <Image
                  src={image.url}
                  alt={
                    title
                      ? `${title} - image ${index + 2}`
                      : `Product image ${index + 2}`
                  }
                  fill
                  sizes="120px"
                  className="object-contain p-3"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImageGallery
