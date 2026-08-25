import crypto from "crypto"
import Razorpay from "razorpay"
import { AbstractPaymentProvider, MedusaError, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

export type RazorpayOptions = {
  keyId: string
  keySecret: string
  /** Secret configured on the Razorpay webhook, used to verify incoming events. */
  webhookSecret?: string
}

/**
 * Session data this provider stores on the Medusa payment session. Everything the
 * client needs to open Razorpay Checkout, plus what we need to verify the result.
 */
type SessionData = {
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
  /** Public key id, so the client does not need its own copy. */
  key_id?: string
  amount_in_paise?: number
  currency?: string
}

/**
 * Razorpay works in the smallest currency unit — paise for INR. Medusa v2 stores
 * decimal major units (1899 means ₹1899), so every amount crossing this boundary
 * has to be scaled. Getting this wrong charges 100x too much or too little, so the
 * conversion lives in one place rather than inline at each call site.
 */
const toPaise = (amount: unknown): number => {
  const major = Number(amount)
  if (!Number.isFinite(major)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Cannot convert amount "${amount}" to paise.`)
  }
  return Math.round(major * 100)
}

const toMajor = (paise: unknown): number => Number(paise ?? 0) / 100

/**
 * Maps a Razorpay payment status onto Medusa's session status.
 *
 * Razorpay statuses: created, authorized, captured, refunded, failed.
 * "created" means the order exists but nobody has paid yet.
 */
const mapStatus = (razorpayStatus?: string): PaymentSessionStatus => {
  switch (razorpayStatus) {
    case "captured":
      return PaymentSessionStatus.CAPTURED
    case "authorized":
      return PaymentSessionStatus.AUTHORIZED
    case "refunded":
      // Medusa has no refunded session status; the refund is tracked separately.
      return PaymentSessionStatus.CAPTURED
    case "failed":
      return PaymentSessionStatus.ERROR
    case "created":
    default:
      return PaymentSessionStatus.PENDING
  }
}

export default class RazorpayProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay"

  protected client_: Razorpay

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.keyId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: keyId is required.")
    }
    if (!options.keySecret) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: keySecret is required.")
    }
  }

  constructor(container: Record<string, unknown>, options: RazorpayOptions) {
    super(container, options)
    this.client_ = new Razorpay({
      key_id: options.keyId,
      key_secret: options.keySecret,
    })
  }

  /**
   * Creates a Razorpay Order. Nothing is charged here — the order is the handle the
   * client-side Checkout needs, and the customer pays inside that.
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const incoming = (input.data ?? {}) as SessionData

    /*
     * Second pass. Medusa's createPaymentSessionsWorkflow deletes and recreates the
     * session rather than updating it, so when the client hands back the completed
     * Checkout handshake this method runs again. Creating another Razorpay order here
     * would abandon the one the customer actually paid and leave an unpaid order in
     * its place — so the existing order is carried through untouched instead.
     *
     * The handshake is NOT trusted here; authorizePayment verifies the signature
     * before anything is treated as paid.
     */
    if (incoming.razorpay_order_id && incoming.razorpay_payment_id && incoming.razorpay_signature) {
      return {
        id: incoming.razorpay_order_id,
        data: incoming as Record<string, unknown>,
        status: PaymentSessionStatus.PENDING,
      }
    }

    const amountInPaise = toPaise(input.amount)
    const currency = input.currency_code.toUpperCase()

    try {
      const order = await this.client_.orders.create({
        amount: amountInPaise,
        currency,
        // Razorpay captures automatically on a successful payment, so the money is
        // settled the moment the customer pays rather than being left authorized.
        payment_capture: true,
        notes: {
          // Useful when reconciling a Razorpay dashboard entry against Medusa.
          medusa_session_id: String((input.context as any)?.idempotency_key ?? ""),
          customer_email: String((input.context as any)?.customer?.email ?? ""),
        },
      } as any)

      const data: SessionData = {
        razorpay_order_id: order.id,
        key_id: this.config.keyId,
        amount_in_paise: amountInPaise,
        currency,
      }

      return { id: order.id, data: data as Record<string, unknown>, status: PaymentSessionStatus.PENDING }
    } catch (e: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Razorpay: could not create an order — ${e?.error?.description ?? e?.message ?? "unknown error"}`
      )
    }
  }

  /**
   * Verifies the handshake the client returns from Checkout, then reports the real
   * status read back from Razorpay.
   *
   * The signature check is the security boundary: without it a modified client could
   * claim any order was paid. It is an HMAC of "<order_id>|<payment_id>" keyed with
   * the account secret, so only Razorpay and this server can produce it.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    const orderId = data.razorpay_order_id
    const paymentId = data.razorpay_payment_id
    const signature = data.razorpay_signature

    if (!orderId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: missing razorpay_order_id on the session.")
    }
    if (!paymentId || !signature) {
      // The customer has not completed Checkout yet.
      return { status: PaymentSessionStatus.PENDING, data: data as Record<string, unknown> }
    }

    const expected = crypto
      .createHmac("sha256", this.config.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    // timingSafeEqual needs equal lengths, so compare digests of equal size only.
    const provided = Buffer.from(signature, "utf8")
    const computed = Buffer.from(expected, "utf8")
    const valid = provided.length === computed.length && crypto.timingSafeEqual(provided, computed)

    if (!valid) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Razorpay: payment signature verification failed.")
    }

    // Trust Razorpay's own record of the payment rather than the client's claim.
    const payment = await this.client_.payments.fetch(paymentId)

    return {
      status: mapStatus(payment.status),
      data: { ...data, razorpay_payment_id: paymentId } as Record<string, unknown>,
    }
  }

  /**
   * With auto-capture the funds are already taken by the time we get here, so this
   * confirms rather than performs the capture. If a payment somehow arrives merely
   * authorized, it is captured explicitly.
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    const paymentId = data.razorpay_payment_id

    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: cannot capture without razorpay_payment_id.")
    }

    const payment = await this.client_.payments.fetch(paymentId)

    if (payment.status === "captured") {
      return { data: data as Record<string, unknown> }
    }

    if (payment.status === "authorized") {
      const captured = await this.client_.payments.capture(
        paymentId,
        Number(payment.amount),
        String(payment.currency)
      )
      return { data: { ...data, status: captured.status } as Record<string, unknown> }
    }

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Razorpay: payment ${paymentId} cannot be captured from status "${payment.status}".`
    )
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    const paymentId = data.razorpay_payment_id

    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: cannot refund without razorpay_payment_id.")
    }

    try {
      const refund = await this.client_.payments.refund(paymentId, {
        amount: toPaise(input.amount),
        speed: "normal",
      })
      return { data: { ...data, razorpay_refund_id: refund.id } as Record<string, unknown> }
    } catch (e: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Razorpay: refund failed — ${e?.error?.description ?? e?.message ?? "unknown error"}`
      )
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as SessionData

    if (data.razorpay_payment_id) {
      const payment = await this.client_.payments.fetch(data.razorpay_payment_id)
      return { status: mapStatus(payment.status), data: data as Record<string, unknown> }
    }

    // No payment yet — the order exists but Checkout has not been completed.
    return { status: PaymentSessionStatus.PENDING, data: data as Record<string, unknown> }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as SessionData

    if (data.razorpay_payment_id) {
      const payment = await this.client_.payments.fetch(data.razorpay_payment_id)
      return { data: payment as unknown as Record<string, unknown> }
    }
    if (data.razorpay_order_id) {
      const order = await this.client_.orders.fetch(data.razorpay_order_id)
      return { data: order as unknown as Record<string, unknown> }
    }
    return { data: {} }
  }

  /**
   * A Razorpay order's amount is immutable, so a changed cart total means a new
   * order. The old one is simply abandoned — it was never charged.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment({
      amount: input.amount,
      currency_code: input.currency_code,
      data: input.data,
      context: input.context,
    } as InitiatePaymentInput)
  }

  /**
   * Razorpay has no "cancel order" call — an unpaid order simply expires. Nothing to
   * undo, so this succeeds without a remote call.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  /**
   * Handles Razorpay webhooks so a payment still lands in Medusa when the customer
   * closes the tab before the client-side callback runs. Without this, money can be
   * taken while the order is never completed.
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const secret = this.config.webhookSecret
    if (!secret) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const signature = (payload.headers?.["x-razorpay-signature"] ?? "") as string
    const raw = payload.rawData

    const expected = crypto
      .createHmac("sha256", secret)
      .update(typeof raw === "string" ? raw : Buffer.from(raw as any))
      .digest("hex")

    const provided = Buffer.from(String(signature), "utf8")
    const computed = Buffer.from(expected, "utf8")
    if (provided.length !== computed.length || !crypto.timingSafeEqual(provided, computed)) {
      // An unverifiable event must never move money, so it is rejected outright.
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const body = payload.data as any
    const event = body?.event as string | undefined
    const entity = body?.payload?.payment?.entity

    if (!entity) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const actionData = {
      // Medusa matches the session by the provider id we returned from initiatePayment.
      session_id: String(entity.order_id ?? ""),
      amount: toMajor(entity.amount),
    }

    switch (event) {
      case "payment.captured":
        return { action: PaymentActions.SUCCESSFUL, data: actionData }
      case "payment.authorized":
        return { action: PaymentActions.AUTHORIZED, data: actionData }
      case "payment.failed":
        return { action: PaymentActions.FAILED, data: actionData }
      default:
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}
