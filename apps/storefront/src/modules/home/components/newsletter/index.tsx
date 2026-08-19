import { Mail } from "lucide-react"

/**
 * Newsletter CTA. This POC has no mailing-list integration, so the form is
 * disabled and clearly labelled as demo UI instead of silently discarding an
 * email address the shopper believes was submitted.
 */
const Newsletter = () => {
  return (
    <section className="content-container py-14 small:py-16">
      <div className="rounded-2xl border border-kudl-border bg-kudl-light px-7 py-10 text-center small:px-12 small:py-14">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-kudl-primary">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </span>

        <h2 className="mt-5 text-2xl font-bold tracking-tight text-kudl-ink small:text-3xl">
          Pet care tips, straight to your inbox
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-kudl-muted">
          Feeding guides, new arrivals and seasonal care reminders. No spam.
        </p>

        {/* No mailing-list provider is wired up, so the fields are disabled. */}
        <form
          aria-label="Newsletter signup (demo)"
          className="mx-auto mt-7 flex max-w-md flex-col gap-3 xsmall:flex-row"
        >
          <label htmlFor="kudl-newsletter" className="sr-only">
            Email address
          </label>
          <input
            id="kudl-newsletter"
            type="email"
            disabled
            placeholder="you@example.com"
            className="h-12 flex-1 rounded-lg border border-kudl-border bg-white px-4 text-sm text-kudl-ink placeholder:text-kudl-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="button"
            disabled
            title="Newsletter signup is not wired up in this demo"
            className="h-12 shrink-0 rounded-lg bg-kudl-primary px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Subscribe
          </button>
        </form>

        <p className="mt-3 text-xs text-kudl-muted">
          Demo only — signup is not connected to a mailing list.
        </p>
      </div>
    </section>
  )
}

export default Newsletter
