import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// With NODE_ENV=production (as in the Docker image) Medusa marks the admin session
// cookie Secure + SameSite=lax. Browsers refuse to store a Secure cookie sent over
// plain http://, so the dashboard logs in successfully and then immediately bounces
// back to /app/login because no session was ever stored.
//
// Set COOKIE_SECURE=false when the dashboard is served over http:// (local Docker, a
// LAN host). Leave it unset anywhere served over https:// so the cookie stays Secure.
const insecureCookies = process.env.COOKIE_SECURE === 'false'

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(insecureCookies
      ? { cookieOptions: { secure: false, sameSite: 'lax' as const } }
      : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  }
})
