import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RazorpayProviderService from "./service"

/**
 * Registers the Razorpay provider with Medusa's payment module. The provider is
 * addressed as `pp_razorpay_<id>` where `<id>` is the `id` given in medusa-config.ts.
 */
export default ModuleProvider(Modules.PAYMENT, {
  services: [RazorpayProviderService],
})
