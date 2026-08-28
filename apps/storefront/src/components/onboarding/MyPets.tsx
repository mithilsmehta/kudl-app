"use client"

/**
 * The "My Pets" panel on the profile page: lists the customer's saved pets,
 * and edits or removes them in place.
 *
 * Editing reuses the onboarding step components rather than duplicating the
 * fields. That is the whole reason those steps take `{ form, patch }` instead
 * of owning their state — the same three panels serve both the wizard and this
 * sheet, so a new field added to onboarding shows up here for free and the two
 * can never disagree about, say, which breeds a cat may have.
 *
 * Renders nothing for a signed-out visitor: every pet route is scoped to the
 * auth token, so there is nothing to show and no useful prompt to give beyond
 * the sign-in buttons the page already has.
 */

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import {
  Check,
  ChevronRight,
  Edit2,
  Loader2,
  PawPrint,
  Plus,
  Salad,
  Trash2,
  X,
} from "@/components/icons"
import { deletePet, getPets, Pet, updatePet } from "@/lib/api"
import {
  ageSummary,
  allergyLabel,
  genderLabel,
  personalityLabel,
  petTypeIcon,
  petTypeLabel,
  sizeLabel,
} from "@/lib/pets"
import ConfirmDialog from "@/components/ConfirmDialog"
import ErrorBanner from "@/components/ErrorBanner"
import Spinner from "@/components/Spinner"
import StepBasicInfo from "./StepBasicInfo"
import StepBreedAge from "./StepBreedAge"
import StepDietLifestyle from "./StepDietLifestyle"
import { formToDraft, PetForm, petToForm, stepIsValid } from "./petForm"

function PetCard({
  pet,
  onEdit,
  onDelete,
}: {
  pet: Pet
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = petTypeIcon(pet.type)
  const age = ageSummary(pet)

  // The facts worth showing on a collapsed card, in the order an owner would
  // say them. Nulls are dropped rather than rendered as "—", which would make
  // an optional field look like missing data.
  const facts = [
    pet.breed,
    age,
    genderLabel(pet.gender),
    sizeLabel(pet.size),
  ].filter(Boolean)

  return (
    <li className="rounded-2xl border border-kudl-border bg-white p-4">
      <div className="flex items-start gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-kudl-tint">
          {pet.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.avatar_url}
              alt={pet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className="h-7 w-7 text-kudl-primary" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-kudl-ink">
                {pet.name}
              </p>
              <p className="mt-0.5 text-xs text-kudl-muted">
                {petTypeLabel(pet.type)}
                {facts.length ? ` · ${facts.join(" · ")}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${pet.name}`}
                className="rounded-lg p-2 text-kudl-muted transition-colors hover:bg-kudl-surface hover:text-kudl-primary"
              >
                <Edit2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Remove ${pet.name}`}
                className="rounded-lg p-2 text-kudl-muted transition-colors hover:bg-red-50 hover:text-kudl-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {(pet.allergies?.length || pet.personality?.length) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {pet.allergies?.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-kudl-amber-from px-2 py-0.5 text-[11px] font-semibold text-kudl-amber-body"
                >
                  <Salad className="h-3 w-3" aria-hidden="true" />
                  {allergyLabel(a)}
                </span>
              ))}
              {pet.personality?.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-kudl-surface px-2 py-0.5 text-[11px] font-semibold text-kudl-subtle"
                >
                  {personalityLabel(p)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/** The edit sheet: all three onboarding panels stacked, saved in one go. */
function EditPet({
  pet,
  onCancel,
  onSaved,
}: {
  pet: Pet
  onCancel: () => void
  onSaved: (pet: Pet) => void
}) {
  const [form, setForm] = useState<PetForm>(() => petToForm(pet))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (changes: Partial<PetForm>) =>
    setForm((prev) => ({ ...prev, ...changes }))

  // Step 1's rules are the only hard requirement: the backend enforces
  // name/type/gender and nothing else, so an older pet saved without a breed
  // must remain saveable here.
  const canSave = stepIsValid(0, form)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePet(pet.id, formToDraft(form))
      onSaved(updated)
    } catch (e: any) {
      setError(e?.message || "Could not save those changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border-2 border-kudl-primary bg-white p-4 sm:p-5"
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[15px] font-bold text-kudl-ink">
          Editing {pet.name}
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel editing"
          className="rounded-lg p-1.5 text-kudl-muted transition-colors hover:bg-kudl-surface hover:text-kudl-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="space-y-8">
        <StepBasicInfo form={form} patch={patch} />
        <div className="border-t border-kudl-divider pt-7">
          <StepBreedAge form={form} patch={patch} />
        </div>
        <div className="border-t border-kudl-divider pt-7">
          <StepDietLifestyle form={form} patch={patch} />
        </div>
      </div>

      <div className="mt-6 flex gap-2.5 border-t border-kudl-divider pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-2xl border-2 border-kudl-border bg-white text-[15px] font-bold text-kudl-body transition-colors hover:border-kudl-hairline"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !canSave}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-kudl-primary text-[15px] font-bold text-white transition-colors hover:bg-kudl-dark disabled:cursor-not-allowed disabled:bg-kudl-hairline"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default function MyPets({ signedIn }: { signedIn: boolean }) {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Pet | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signedIn) {
      setLoading(false)
      return
    }
    let cancelled = false
    getPets()
      .then((list) => {
        if (!cancelled) setPets(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  if (!signedIn) return null

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    // Optimistic: the row disappears immediately and comes back if the call
    // fails, which is the honest way round — a spinner on a delete makes the
    // list feel stuck.
    setPets((prev) => prev.filter((p) => p.id !== target.id))
    try {
      await deletePet(target.id)
    } catch (e: any) {
      setPets((prev) =>
        [...prev, target].sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? "")
        )
      )
      setError(e?.message || `Could not remove ${target.name}.`)
    }
  }

  const editing = pets.find((p) => p.id === editingId) ?? null

  return (
    <section className="mb-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold text-kudl-ink">
          <PawPrint className="h-4 w-4 text-kudl-primary" aria-hidden="true" />
          My Pets
        </h2>
        {!editing && pets.length > 0 && (
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1 text-xs font-bold text-kudl-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add a pet
          </a>
        )}
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-kudl-border bg-white py-10">
          <Spinner className="h-6 w-6 text-kudl-primary" label="Loading pets" />
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <EditPet
              key={editing.id}
              pet={editing}
              onCancel={() => setEditingId(null)}
              onSaved={(updated) => {
                setPets((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                )
                setEditingId(null)
              }}
            />
          ) : pets.length ? (
            <motion.ul
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2.5"
            >
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onEdit={() => setEditingId(pet.id)}
                  onDelete={() => setPendingDelete(pet)}
                />
              ))}
            </motion.ul>
          ) : (
            <motion.a
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              href="/onboarding"
              className="flex items-center gap-3.5 rounded-2xl border-2 border-dashed border-kudl-hairline bg-white p-4 transition-colors hover:border-kudl-primary"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kudl-tint">
                <Plus className="h-5 w-5 text-kudl-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-kudl-ink">
                  Add your first pet
                </span>
                <span className="mt-0.5 block text-xs text-kudl-muted">
                  Takes a minute, and we&apos;ll tailor food and care to them.
                </span>
              </span>
              <ChevronRight
                className="h-[18px] w-[18px] shrink-0 text-kudl-faint"
                aria-hidden="true"
              />
            </motion.a>
          )}
        </AnimatePresence>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Remove ${pendingDelete?.name ?? "this pet"}?`}
        message="Their profile and preferences will be deleted. This can't be undone."
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
