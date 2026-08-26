"use client"

/**
 * Product artwork with the app's grey placeholder fallback. Uses next/image for
 * the responsive srcset, but falls back to a plain <img> if the host isn't in
 * next.config.js remotePatterns — a misconfigured image host should degrade to
 * a working picture, not a broken build.
 */

import Image from "next/image"
import { useState } from "react"
import { ShoppingBag } from "@/components/icons"

export default function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  iconClassName = "h-8 w-8",
  imageClassName = "",
}: {
  src?: string | null
  alt: string
  sizes: string
  priority?: boolean
  iconClassName?: string
  imageClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-kudl-surface">
        <ShoppingBag className={`${iconClassName} text-kudl-faint`} aria-hidden="true" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      // Guards against next/image's "missing alt" console error if a caller
      // ever gets a falsy title/alt from incomplete product data — an empty
      // (decorative) alt is a safe fallback, not a broken build.
      alt={typeof alt === "string" ? alt : ""}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-cover ${imageClassName}`}
    />
  )
}
