"use client"

/**
 * Step 1 — pet type, name, gender (all required) and an optional photo.
 *
 * The avatar uploads immediately on pick rather than on Finish. That way the
 * customer sees whether it worked while the picker is still fresh in mind, and
 * a failed upload never blocks the rest of the form — `avatarUrl` simply stays
 * null and the illustrated fallback is used.
 */

import { ChangeEvent, useRef, useState } from "react"
import { Camera, Loader2, PawPrint, X } from "@/components/icons"
import { uploadPetAvatar } from "@/lib/api"
import { GENDERS, PET_TYPES } from "@/lib/pets"
import { FieldLabel, OptionCard, PillButton, TextInput } from "./fields"
import { PetForm } from "./petForm"

/** Matches the backend's MAX_BYTES in src/api/store/pets/avatar/route.ts. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export default function StepBasicInfo({
  form,
  patch,
}: {
  form: PetForm
  patch: (changes: Partial<PetForm>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Clear the input so picking the same file twice still fires a change event.
    e.target.value = ""
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError("That image is over 2MB. Try a smaller one.")
      return
    }

    setUploadError(null)
    // Show the local file straight away; the network round trip is invisible.
    patch({ avatarPreview: URL.createObjectURL(file) })
    setUploading(true)
    try {
      const url = await uploadPetAvatar(file)
      patch({ avatarUrl: url })
    } catch (err: any) {
      patch({ avatarPreview: null })
      setUploadError(err?.message || "Could not upload that photo.")
    } finally {
      setUploading(false)
    }
  }

  const shownImage = form.avatarPreview || form.avatarUrl

  return (
    <div className="space-y-7">
      <div>
        <FieldLabel hint="This shapes the food, toys and care we suggest.">
          What kind of pet do you have?
        </FieldLabel>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {PET_TYPES.map(({ value, label, Icon, accent }) => (
            <OptionCard
              key={value}
              selected={form.type === value}
              // Changing species invalidates the breed, so clear it rather than
              // carrying "Persian" onto a dog.
              onClick={() =>
                patch(
                  form.type === value
                    ? { type: value }
                    : { type: value, breed: "", lifeStage: null }
                )
              }
              icon={<Icon className="h-5 w-5" aria-hidden="true" />}
              label={label}
              accent={accent}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>What&apos;s their name?</FieldLabel>
        <TextInput
          id="pet-name"
          value={form.name}
          onChange={(name) => patch({ name })}
          placeholder="e.g. Charlie, Milo"
          maxLength={60}
        />
      </div>

      <div>
        <FieldLabel>Gender</FieldLabel>
        <div className="flex gap-2.5">
          {GENDERS.map(({ value, label }) => (
            <PillButton
              key={value}
              selected={form.gender === value}
              onClick={() => patch({ gender: value })}
              className="flex-1"
            >
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel optional>Add a photo</FieldLabel>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={shownImage ? "Change pet photo" : "Upload a pet photo"}
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-kudl-hairline bg-kudl-surface transition-colors hover:border-kudl-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2"
          >
            {shownImage ? (
              /*
               * A plain <img> on purpose: a blob: preview URL cannot go through
               * next/image, and the uploaded URL's host varies by environment.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownImage}
                alt="Your pet"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-kudl-faint transition-colors group-hover:text-kudl-primary">
                <PawPrint className="h-7 w-7" aria-hidden="true" />
                <Camera className="h-4 w-4" aria-hidden="true" />
              </span>
            )}

            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2
                  className="h-6 w-6 animate-spin text-white"
                  aria-hidden="true"
                />
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-kudl-body">
              {shownImage ? "Looking good!" : "A face makes the profile feel like theirs."}
            </p>
            <p className="mt-0.5 text-xs text-kudl-muted">
              JPEG, PNG or WebP, up to 2MB.
            </p>
            {shownImage && (
              <button
                type="button"
                onClick={() => {
                  patch({ avatarUrl: null, avatarPreview: null })
                  setUploadError(null)
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-kudl-danger hover:underline"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Remove photo
              </button>
            )}
            {uploadError && (
              <p className="mt-1.5 text-xs font-semibold text-kudl-danger">
                {uploadError}
              </p>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPickFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
