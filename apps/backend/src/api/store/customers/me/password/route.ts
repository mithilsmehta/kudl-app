import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Lets a signed-in customer change their password by re-entering the current one.
 *
 * Medusa ships no such route. Its only password-change path is
 * `POST /auth/customer/emailpass/reset-password` -> emailed link ->
 * `POST /auth/customer/emailpass/update`, and that update route is guarded by
 * `validateToken()`, which rejects anything that is not a single-use token
 * carrying `purpose: "reset"` — a normal session bearer token will not do. So a
 * logged-in "change my password" needs its own route, and this is it.
 *
 * Knowledge of the current password is what stands in for that emailed link: it
 * proves the person at the keyboard is the account holder and not someone who
 * picked up an unlocked phone. Do not drop that check — `updateProvider` below
 * happily sets a new password with no proof of the old one.
 */

const MIN_PASSWORD_LENGTH = 8

type ChangePasswordBody = {
  current_password?: unknown
  new_password?: unknown
}

export async function POST(
  req: AuthenticatedMedusaRequest<ChangePasswordBody>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to change your password."
    )
  }

  const currentPassword =
    typeof req.body?.current_password === "string"
      ? req.body.current_password
      : ""
  const newPassword =
    typeof req.body?.new_password === "string" ? req.body.new_password : ""

  if (!currentPassword || !newPassword) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Enter your current password and a new password."
    )
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    )
  }

  if (newPassword === currentPassword) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Your new password must be different from your current one."
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  if (!customer?.email) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found.")
  }

  const authModule = req.scope.resolve(Modules.AUTH)

  /*
   * The emailpass provider keys its identities by email — that is the
   * `entity_id`, not the customer id — so the email is read from the customer
   * record rather than taken from the request. A client-supplied email here
   * would be an "update anyone's password" hole.
   */
  const { success } = await authModule.authenticate("emailpass", {
    body: { email: customer.email, password: currentPassword },
  })

  if (!success) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Your current password is incorrect."
    )
  }

  const { success: updated, error } = await authModule.updateProvider(
    "emailpass",
    {
      entity_id: customer.email,
      password: newPassword,
    }
  )

  if (!updated) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      error || "Your password could not be updated."
    )
  }

  /*
   * Tokens already issued stay valid: Medusa's customer bearer tokens are
   * stateless JWTs with no server-side session to revoke, so a password change
   * cannot sign other devices out. Worth knowing before promising otherwise in
   * the UI — the app tells the customer only that the password changed.
   */
  res.json({ success: true })
}
