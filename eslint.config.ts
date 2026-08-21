import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

export default defineConfig([
  {
    // The Medusa plugin encodes backend framework requirements — MedusaError mapping to
    // HTTP statuses, route/workflow/module shapes. apps/mobile is a React Native client
    // (no MedusaError, no HTTP responses) and apps/storefront is a Next.js app with its
    // own `next lint`. Applying backend rules there produces false positives, so scope
    // the plugin to the backend where its rules are actually meaningful.
    ignores: ["apps/mobile/**", "apps/storefront/**"],
  },
  ...medusa.configs.recommended,
])
