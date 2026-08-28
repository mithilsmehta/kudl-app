import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Uploads a pet avatar and returns its public URL, for the onboarding flow's
 * photo dropzone to store on `pet.avatar_url`.
 *
 * Medusa ships no store-facing upload route — only an admin one — because
 * letting the public write files is an obvious abuse vector. This route is the
 * narrow exception, and every one of those risks is closed deliberately:
 *
 *   - it requires a signed-in customer, so uploads are attributable;
 *   - it accepts images only, checked against the decoded bytes' magic number
 *     rather than the client-supplied mime type, which is trivially forged;
 *   - it caps the decoded size, so the request body cannot be used as storage;
 *   - the filename is discarded and regenerated, so a client cannot choose a
 *     path or an extension.
 *
 * The body is base64 JSON rather than multipart. That avoids registering multer
 * middleware for a single route, and the client already has the bytes in hand
 * from a FileReader.
 *
 * Where the file lands depends on the configured file provider — see the
 * fileModules block in medusa-config.ts. On a deployed backend with no bucket
 * this writes to ./static, which must be a mounted disk or the avatar will
 * 404 after the next redeploy.
 */

/** 2MB decoded. A pet photo needs nothing like this much once resized. */
const MAX_BYTES = 2 * 1024 * 1024

const ALLOWED: { mime: string; ext: string; magic: number[][] }[] = [
  { mime: "image/jpeg", ext: "jpg", magic: [[0xff, 0xd8, 0xff]] },
  { mime: "image/png", ext: "png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  {
    mime: "image/webp",
    // WEBP is "RIFF....WEBP"; the first four bytes are enough to distinguish it
    // from the formats above, and the container check below confirms "WEBP".
    ext: "webp",
    magic: [[0x52, 0x49, 0x46, 0x46]],
  },
]

const startsWith = (buf: Buffer, bytes: number[]) =>
  bytes.every((b, i) => buf[i] === b)

export async function POST(
  req: AuthenticatedMedusaRequest<{ content?: string }>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Sign in to upload a pet photo."
    )
  }

  const raw = req.body?.content
  if (!raw || typeof raw !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No image was provided."
    )
  }

  // Accept either a bare base64 string or a full data URL.
  const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, "base64")
  } catch {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Image is not valid base64.")
  }

  if (!buffer.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Image is empty.")
  }
  if (buffer.length > MAX_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Image must be under ${Math.floor(MAX_BYTES / (1024 * 1024))}MB.`
    )
  }

  /*
   * Sniff the real format. A client claiming image/png while sending a script
   * would otherwise get that script stored under a .png served from our origin.
   */
  const match = ALLOWED.find((a) => a.magic.some((m) => startsWith(buffer, m)))
  const isWebp =
    match?.ext === "webp" && buffer.subarray(8, 12).toString("ascii") === "WEBP"

  if (!match || (match.ext === "webp" && !isWebp)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Image must be a JPEG, PNG or WebP file."
    )
  }

  /*
   * The filename is ours, not the client's. The file provider appends its own
   * unique suffix, so this only needs to be collision-tolerant and to carry the
   * right extension.
   */
  const filename = `pet-avatars/${customerId}.${match.ext}`

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename,
          mimeType: match.mime,
          content: buffer.toString("base64"),
          access: "public",
        },
      ],
    },
  })

  const file = (result as { url: string }[])?.[0]
  if (!file?.url) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The image was uploaded but no URL was returned."
    )
  }

  res.status(201).json({ url: file.url })
}
