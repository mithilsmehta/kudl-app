export const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }

  // Vercel exposes this automatically for preview + production deployments,
  // so metadataBase resolves correctly without hardcoding a domain.
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  return "https://localhost:8000"
}
