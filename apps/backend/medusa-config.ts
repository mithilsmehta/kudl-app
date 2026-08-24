import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// With NODE_ENV=production (as in the Docker image) Medusa marks the admin session
// cookie Secure + SameSite=lax. Browsers refuse to store a Secure cookie sent over
// plain http://, so the dashboard logs in successfully and then immediately bounces
// back to /app/login because no session was ever stored.
//
// Set COOKIE_SECURE=false when the dashboard is served over http:// (local Docker, a
// LAN host). Leave it UNSET anywhere served over https:// — including Railway — so
// the cookie stays Secure.
const insecureCookies = process.env.COOKIE_SECURE === 'false'

/**
 * Redis. Without it Medusa falls back to an in-memory event bus, cache and workflow
 * engine — it logs "a fake redis instance will be used" and "Local Event Bus
 * installed. This is not recommended for production". In that state every queued
 * job, subscriber and long-running workflow is lost on restart, which on a platform
 * that restarts containers on each deploy means losing them routinely.
 *
 * Left optional so local `docker compose` (no Redis service) still boots.
 */
const REDIS_URL = process.env.REDIS_URL

/**
 * File storage. Medusa's default provider writes to ./static on the container's own
 * filesystem, which does not survive a redeploy or a container recreate — verified:
 * an uploaded file 404s immediately after `docker compose up --force-recreate`.
 *
 * Two supported deployments:
 *   - S3-compatible (AWS S3, Cloudflare R2): set the S3_* vars below. Preferred for
 *     anything real, and required if the service ever runs more than one replica.
 *   - Local provider on a mounted disk (e.g. a Railway Volume at /app/static): leave
 *     the S3_* vars unset. Single replica only.
 */
const S3_BUCKET = process.env.S3_BUCKET
const useS3 = Boolean(
  S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
)

const redisModules = REDIS_URL
  ? [
      // Standalone package names — @medusajs/medusa exposes no such subpaths in 2.19.
      { resolve: '@medusajs/cache-redis', options: { redisUrl: REDIS_URL } },
      { resolve: '@medusajs/event-bus-redis', options: { redisUrl: REDIS_URL } },
      {
        resolve: '@medusajs/workflow-engine-redis',
        options: { redis: { url: REDIS_URL } },
      },
    ]
  : []

const fileModules = useS3
  ? [
      {
        resolve: '@medusajs/file',
        options: {
          providers: [
            {
              resolve: '@medusajs/file-s3',
              id: 's3',
              options: {
                file_url: process.env.S3_FILE_URL,
                access_key_id: process.env.S3_ACCESS_KEY_ID,
                secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                region: process.env.S3_REGION,
                bucket: S3_BUCKET,
                // Required for Cloudflare R2 and other non-AWS S3 endpoints.
                ...(process.env.S3_ENDPOINT
                  ? { endpoint: process.env.S3_ENDPOINT }
                  : {}),
              },
            },
          ],
        },
      },
    ]
  : []

const modules = [...redisModules, ...fileModules]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(REDIS_URL ? { redisUrl: REDIS_URL } : {}),
    ...(insecureCookies
      ? { cookieOptions: { secure: false, sameSite: 'lax' as const } }
      : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  // Only declared when configured, so the defaults stay in place locally.
  ...(modules.length ? { modules } : {}),
})
