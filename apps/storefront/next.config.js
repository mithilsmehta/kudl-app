/**
 * Product images come from whatever Medusa serves — the local backend in dev,
 * an S3/CDN host in production. Remote patterns are declared from env so the
 * same config works in both without listing hostnames here.
 */
const remotePatterns = []

/** Public origin of the backend — what a browser would use, and the image host. */
const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

/*
 * Where THIS server reaches the backend. Inside the compose network that is
 * http://backend:9000, a request that never leaves the host — so server-rendered
 * pages and the /api/medusa proxy below do not hairpin out through the public
 * address and back in. Falls back to the public URL outside containers.
 *
 * Read at BUILD time here, not at runtime: Next evaluates rewrites() during the
 * build and bakes the destination into the routes manifest. It must therefore be
 * passed as a Docker build arg — see apps/storefront/Dockerfile.
 */
const internalBackendUrl =
  process.env.MEDUSA_BACKEND_INTERNAL_URL || backendUrl

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
 * The browser calls /api/medusa/... on this origin and Next forwards it to the
 * backend server-side. That is deliberate and load-bearing: calling the backend
 * host directly from the browser made the site depend on every visitor's own DNS
 * resolving that host, and a resolver that refuses it — some mobile hotspots,
 * corporate DNS, captive-portal Wi-Fi, ad-blocking resolvers, a few ISPs —
 * produced a page that loaded perfectly and then showed zero products, because
 * only the API calls failed. That looks like a broken deployment rather than a
 * network problem, and is miserable to diagnose.
 *
 * Through this origin, the only hostname a visitor resolves is the one that
 * already served them the page. It also removes the cross-origin request
 * entirely, so CORS and third-party-cookie policy stop being able to break the
 * site.
 *
 * lib/api.ts sends browser traffic to /api/medusa and keeps the absolute URL
 * for server-side calls, where a relative path cannot be fetched.
 */
const rewrites = async () => {
  if (!internalBackendUrl) {
    // No backend configured (a bare `next build` in CI, say). Returning no
    // rewrite is better than one pointing at undefined.
    return []
  }
  return [
    {
      source: "/api/medusa/:path*",
      destination: `${internalBackendUrl.replace(/\/+$/, "")}/:path*`,
    },
  ]
}

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  /*
   * Emits .next/standalone: the server plus only the node_modules it actually
   * imports. The Docker image copies that instead of installing dependencies
   * again, which is what keeps the storefront image small.
   */
  output: "standalone",
  images: { remotePatterns },
  rewrites,
  // Pin the trace root to the monorepo. Without this, Next walks up past the
  // repo and picks a stray lockfile in the home directory as the workspace root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
}
