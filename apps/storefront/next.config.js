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

if (process.env.MEDUSA_IMAGE_HOSTNAME) {
  remotePatterns.push({
    protocol: "https",
    hostname: process.env.MEDUSA_IMAGE_HOSTNAME,
    pathname: "/**",
  })
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

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { remotePatterns },
  // Pin the trace root to the monorepo. Without this, Next walks up past the
  // repo and picks a stray lockfile in the home directory as the workspace root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
}
