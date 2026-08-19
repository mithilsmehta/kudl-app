import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  /**
   * Values this product's variants actually use. Medusa product options can be
   * shared across products, so the option itself may carry values that this
   * product has no variant for -- those must not be offered.
   */
  allowedValues?: string[]
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  allowedValues,
  "data-testid": dataTestId,
  disabled,
}) => {
  const allowed = allowedValues ? new Set(allowedValues) : undefined

  const filteredOptions = (option.values ?? [])
    .map((v) => v.value)
    .filter((value) => !allowed || allowed.has(value))

  return (
    <fieldset className="flex flex-col gap-y-3">
      <legend className="text-sm font-medium text-kudl-ink">
        Select {title}
      </legend>
      <div className="flex flex-wrap gap-2" data-testid={dataTestId}>
        {filteredOptions.map((v) => {
          const isSelected = v === current

          return (
            <button
              type="button"
              onClick={() => updateOption(option.id, v)}
              key={v}
              aria-pressed={isSelected}
              className={clx(
                "h-11 min-w-[72px] rounded-lg border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kudl-primary focus-visible:ring-offset-2",
                {
                  "border-kudl-primary bg-kudl-light text-kudl-dark":
                    isSelected,
                  "border-kudl-border bg-white text-kudl-ink hover:border-kudl-primary":
                    !isSelected,
                  "cursor-not-allowed opacity-60": disabled,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {v}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default OptionSelect
