/**
 * Product images come from whatever Medusa serves — the local backend in dev,
 * an S3/CDN host in production. Remote patterns are declared from env so the
 * same config works in both without listing hostnames here.
 */
const remotePatterns = []

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
if (backendUrl) {
  try {
    const { protocol, hostname, port } = new URL(backendUrl)
    remotePatterns.push({
      protocol: protocol.replace(":", ""),
      hostname,
      port: port || "",
      pathname: "/**",
    })
  } catch {
    // A malformed URL shouldn't break the build; images just fall back to <img>.
  }
}

/*
 * Hosts that serve uploaded product images. next/image refuses any host that is
 * not listed here, so an image uploaded through Medusa Admin renders as a broken
 * placeholder until its host is allowed — which looks identical to a storage
 * misconfiguration.
 *
 * Comma-separated so a bucket host and a CDN/custom domain in front of it can
 * both be allowed, e.g.
 *   MEDUSA_IMAGE_HOSTNAME=kudl-media.s3.ap-south-1.amazonaws.com,cdn.kudl.com
 */
for (const raw of (process.env.MEDUSA_IMAGE_HOSTNAME || "").split(",")) {
  const hostname = raw.trim()
  if (!hostname) continue
  remotePatterns.push({ protocol: "https", hostname, pathname: "/**" })
}

/*
 * Hosts the Medusa seed points product thumbnails at. Without these, next/image
 * refuses the URL and every product renders as a placeholder — so this list has
 * to track whatever the backend seed actually uses.
 */
for (const hostname of ["images.unsplash.com", "placehold.co"]) {
  remotePatterns.push({ protocol: "https", hostname, pathname: "/**" })
}

const path = require("path")

/*
 * Same-origin proxy for the Medusa Store API.
 *
 * The browser used to call the backend host directly
 * (https://<project>.up.railway.app/store/...), which quietly made every
 * visitor's own DNS a dependency of the site working. A resolver that refuses
 * or blocks that hostname — some mobile hotspots, corporate DNS, public Wi-Fi
 * portals, ad-blocking resolvers, a few ISPs — produced a page that loaded
 * perfectly and then showed zero products, because only the API calls failed.
 * DNS_PROBE_FINISHED_BAD_CONFIG on the backend URL with the storefront itself
 * loading fine is exactly that failure.
 *
 * Routing the API through this origin fixes it at the root: the only hostname
 * the visitor has to resolve is the one that already served them the page, and
 * Next resolves the backend host server-side, from Vercel, on a network we
 * control. It also removes the cross-origin request entirely, so CORS and
 * third-party-cookie policy stop being able to break the site.
 *
 * lib/api.ts sends browser traffic to /api/medusa and keeps the absolute URL
 * for server-side calls, where a relative path cannot be fetched.
 */
const rewrites = async () => {
  if (!backendUrl) {
    // No backend configured (a bare `next build` in CI, say). Returning no
    // rewrite is better than one pointing at undefined.
    return []
  }
  return [
    {
      source: "/api/medusa/:path*",
      destination: `${backendUrl.replace(/\/+$/, "")}/:path*`,
    },
  ]
}

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { remotePatterns },
  rewrites,
  // Pin the trace root to the monorepo. Without this, Next walks up past the
  // repo and picks a stray lockfile in the home directory as the workspace root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
}
