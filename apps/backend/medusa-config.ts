import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

// With NODE_ENV=production (as in the Docker image) Medusa marks the admin session
// cookie Secure + SameSite=lax. Browsers refuse to store a Secure cookie sent over
// plain http://, so the dashboard logs in successfully and then immediately bounces
// back to /app/login because no session was ever stored.
//
// Set COOKIE_SECURE=false when the dashboard is served over http:// (local Docker, a
// LAN host). Leave it UNSET anywhere served over https:// — including Railway — so
// the cookie stays Secure.
const insecureCookies = process.env.COOKIE_SECURE === 'false';

/**
 * Redis. Without it Medusa falls back to an in-memory event bus, cache and workflow
 * engine — it logs "a fake redis instance will be used" and "Local Event Bus
 * installed. This is not recommended for production". In that state every queued
 * job, subscriber and long-running workflow is lost on restart, which on a platform
 * that restarts containers on each deploy means losing them routinely.
 *
 * Left optional so local `docker compose` (no Redis service) still boots.
 */
const REDIS_URL = process.env.REDIS_URL;

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
const S3_BUCKET = process.env.S3_BUCKET;

/*
 * S3_FILE_URL is in this guard on purpose. The provider builds every public
 * image URL as `${file_url}/${key}` — so with the bucket and keys set but
 * S3_FILE_URL missing, uploads succeed and Medusa stores URLs that literally
 * begin "undefined/". That renders as a broken image in both the admin and the
 * storefront and looks exactly like a storage misconfiguration, which is a
 * miserable thing to debug. Better to fall back to local storage, which at
 * least fails honestly and loudly on the next redeploy.
 */
const useS3 = Boolean(
  S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_FILE_URL
);

/*
 * Object ACLs. The provider defaults to sending ACL: "public-read" on every
 * public upload, and that default is wrong for most buckets you would create
 * today:
 *
 *   - AWS S3 buckets created since April 2023 default to Object Ownership =
 *     "Bucket owner enforced", which REJECTS any PutObject carrying an ACL with
 *     AccessControlListNotSupported. The upload fails outright.
 *   - Cloudflare R2 does not implement object ACLs at all.
 *
 * So the default here is to send no ACL header, and to make objects readable
 * through a bucket policy (S3) or public bucket access / a custom domain (R2)
 * instead. Set S3_ACL=public-read only for a legacy bucket that genuinely uses
 * object ACLs.
 */
const S3_ACL = process.env.S3_ACL;

/*
 * Every entry needs an explicit `key`. Medusa resolves a module's registration name
 * from its joiner config, and these Redis packages do not expose one — without `key`
 * defineConfig throws "Module @medusajs/cache-redis doesn't have a serviceName" at
 * startup, so the process dies before it ever listens on a port.
 *
 * Note Modules.WORKFLOW_ENGINE is the string "workflows", not "workflow_engine".
 *
 * Package names are the standalone ones: @medusajs/medusa exposes no such subpaths
 * in 2.19.
 */
const redisModules = REDIS_URL
  ? [
      {
        key: Modules.CACHE,
        resolve: '@medusajs/cache-redis',
        options: { redisUrl: REDIS_URL },
      },
      {
        key: Modules.EVENT_BUS,
        resolve: '@medusajs/event-bus-redis',
        options: { redisUrl: REDIS_URL },
      },
      {
        key: Modules.WORKFLOW_ENGINE,
        resolve: '@medusajs/workflow-engine-redis',
        // `redisUrl`, not `redis: { url }` — the latter still works but the module
        // logs "The `url` option is deprecated" on every boot.
        options: { redisUrl: REDIS_URL },
      },
    ]
  : [];

/**
 * Public origin of this backend, e.g. https://kudl-app-production.up.railway.app
 *
 * Required by the local file provider, and the reason uploaded images break on a
 * deployed backend even before you hit the ephemeral-disk problem: the provider
 * defaults `backend_url` to "http://localhost:9000/static", so every uploaded
 * file is stored in the database with a localhost URL. The admin and the
 * storefront then both render it as a broken image, on every machine, forever —
 * the file is on disk and fine, the URL pointing at it is not.
 */
const MEDUSA_BACKEND_URL = (process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000').replace(/\/+$/, '');

const fileModules = useS3
  ? [
      {
        key: Modules.FILE,
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
                ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
                // `false` makes the provider omit the ACL header entirely. See
                // the S3_ACL note above — this is the safe default for modern
                // AWS buckets and for R2.
                acl: S3_ACL ? S3_ACL : false,
              },
            },
          ],
        },
      },
    ]
  : [
      /*
       * No bucket configured: use the local provider, but point it at this
       * backend's real public origin instead of the localhost default.
       *
       * This is a legitimate setup for a small single-replica store, but only
       * when ./static is a MOUNTED DISK — a Railway Volume mounted at
       * /app/static. Without the volume the container's filesystem is
       * ephemeral and every uploaded image 404s at the next deploy, which is
       * exactly the failure this whole module exists to avoid.
       */
      {
        key: Modules.FILE,
        resolve: '@medusajs/file',
        options: {
          providers: [
            {
              resolve: '@medusajs/file-local',
              id: 'local',
              options: {
                // upload_dir is left at its default (<cwd>/static, i.e.
                // /app/static in the Docker image) so a Railway Volume mounted
                // there is picked up with no further configuration.
                backend_url: `${MEDUSA_BACKEND_URL}/static`,
              },
            },
          ],
        },
      },
    ];

/*
 * Razorpay. Registered only when credentials are present, so a developer without
 * them still gets a bootable backend with Medusa's default provider.
 *
 * Test and live are the same code path — Razorpay distinguishes them purely by which
 * key pair you supply, so there is no mode flag here and none is wanted.
 */
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const useRazorpay = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const paymentModules = useRazorpay
  ? [
      {
        key: Modules.PAYMENT,
        resolve: '@medusajs/payment',
        options: {
          providers: [
            {
              // Path is relative to the built server bundle, which is why it points at
              // ./src rather than a package name.
              resolve: './src/modules/razorpay',
              id: 'razorpay',
              options: {
                keyId: RAZORPAY_KEY_ID,
                keySecret: RAZORPAY_KEY_SECRET,
                webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
              },
            },
          ],
        },
      },
    ]
  : [];

// The recommendation engine's own module — activity events, related-products
// scoring config, etc. Registered unconditionally (unlike the Redis/S3
// modules above, it has no optional external dependency).
const customModules = [{ resolve: './src/modules/recommendation' }];

const modules = [...redisModules, ...fileModules, ...paymentModules, ...customModules];

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(REDIS_URL ? { redisUrl: REDIS_URL } : {}),
    ...(insecureCookies ? { cookieOptions: { secure: false, sameSite: 'lax' as const } } : {}),
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
});
