import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="py-10">
      <div className="content-container" data-testid="cart-container">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-kudl-ink small:text-3xl">
          Your Cart
        </h1>

        {cart?.items?.length ? (
          <div className="grid grid-cols-1 gap-8 small:grid-cols-[1fr_360px] small:gap-10">
            <div className="flex flex-col gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>

            <div className="relative">
              <div className="sticky top-40 flex flex-col gap-y-6">
                {cart && cart.region && <Summary cart={cart} />}
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
