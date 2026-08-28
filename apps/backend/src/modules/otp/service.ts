import { MedusaService } from "@medusajs/framework/utils"
import OtpCode from "./models/otp-code"

/**
 * MedusaService generates the CRUD surface (listOtpCodes, createOtpCodes,
 * updateOtpCodes, deleteOtpCodes, ...) from the model.
 *
 * The rules that make a code safe — hashing, expiry, attempt ceilings, resend
 * throttling — live in src/lib/otp.ts rather than here, so both the signup routes
 * and the email-change route enforce exactly the same ones. A service method that
 * merely writes a row cannot enforce a policy the caller forgot to apply.
 */
class OtpModuleService extends MedusaService({
  OtpCode,
}) {}

export default OtpModuleService
