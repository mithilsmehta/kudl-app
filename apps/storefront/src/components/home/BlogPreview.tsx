/**
 * Blog preview cards. There's no blog route in this app yet, so cards are
 * presentational only rather than linking to pages that 404.
 */

import { BLOG_POSTS } from "@/lib/homeContent"
import { Sparkles } from "@/components/icons"

export default function BlogPreview() {
  return (
    <section className="mt-5 md:mt-10">
      <h2 className="mb-3 text-[17px] font-bold text-kudl-ink md:text-2xl">
        Pet Care Tips &amp; Guides
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.title}
            className="overflow-hidden rounded-2xl border border-kudl-border bg-white"
          >
            <div className="flex aspect-video items-center justify-center bg-kudl-surface">
              <Sparkles className="h-8 w-8 text-kudl-hairline" aria-hidden="true" />
            </div>
            <div className="p-4">
              <span className="inline-block rounded-full bg-kudl-tint px-2.5 py-1 text-[11px] font-bold text-kudl-primary">
                {post.category}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-kudl-ink">
                {post.title}
              </h3>
              <p className="mt-2 text-[13px] text-kudl-faint">Coming soon</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
