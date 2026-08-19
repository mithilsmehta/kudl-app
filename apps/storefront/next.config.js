const path = require("path")

const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: trace files from the workspace root so standalone/serverless
  // output on Vercel picks up hoisted dependencies.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    // Pre-existing lint debt in the upstream Medusa starter; lint runs via
    // `npm run lint` rather than blocking deploys.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is clean — keep it enforced during builds.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        // Seeded KUDL Pets product imagery (see apps/backend/src/scripts/seed-kudl-pets.ts)
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
        ? [
            {
              protocol: new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL)
                .protocol.replace(":", ""),
              hostname: new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL)
                .hostname,
            },
          ]
        : []),
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
