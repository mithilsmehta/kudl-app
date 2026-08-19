import { clx } from "@modules/common/components/ui"
import { resolveProductImage } from "@lib/kudl/config"
import Image from "next/image"
import React from "react"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  /** Product handle, used to pick local artwork when Medusa has no image. */
  handle?: string | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  handle,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  // Prefer a real Medusa image, then local artwork, then the paw placeholder.
  const initialImage = resolveProductImage({
    handle,
    thumbnail: thumbnail || images?.[0]?.url,
  })

  return (
    <div
      className={clx(
        "relative w-full overflow-hidden rounded-xl border border-kudl-border bg-kudl-soft",
        className,
        {
          "aspect-[11/14]": isFeatured,
          "aspect-square": !isFeatured,
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <Image
        src={initialImage}
        alt="Product thumbnail"
        className="object-contain p-2"
        draggable={false}
        sizes="(max-width: 576px) 160px, (max-width: 992px) 240px, 320px"
        fill
      />
    </div>
  )
}

export default Thumbnail
