/**
 * Hand-authored decorative SVGs for the homepage. No external image
 * dependency — these are the "art direction" layer for sections that would
 * otherwise be flat color blocks (hero, breed band, app promo).
 */

/** Scattered paw-print texture, tiled as a background via CSS. Opacity is set by the caller. */
export function PawPatternBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="kudl-paw-pattern"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(12)"
        >
          <g fill="currentColor">
            <ellipse cx="20" cy="26" rx="5.5" ry="7" />
            <ellipse cx="10" cy="18" rx="2.6" ry="3.4" />
            <ellipse cx="18" cy="14" rx="2.8" ry="3.6" />
            <ellipse cx="27" cy="14" rx="2.8" ry="3.6" />
            <ellipse cx="34" cy="19" rx="2.6" ry="3.4" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kudl-paw-pattern)" />
    </svg>
  )
}

/** Soft blurred blob, positioned and colored by the caller. Purely decorative depth for hero-style banners. */
export function Blob({
  className = "",
  color,
  style,
}: {
  className?: string
  color: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill={color}
        d="M45.3,-59.5C57.9,-51.2,66.4,-35.9,70.6,-19.5C74.9,-3.1,74.9,14.4,68.1,29.1C61.3,43.8,47.7,55.7,32.5,63.1C17.3,70.6,0.5,73.6,-16.6,72C-33.6,70.3,-51,64,-61.8,51.5C-72.6,39.1,-76.9,20.5,-76.1,2.5C-75.3,-15.6,-69.5,-33.1,-58.2,-42.1C-46.9,-51.1,-30.1,-51.6,-14.9,-56.4C0.3,-61.2,32.6,-67.8,45.3,-59.5Z"
        transform="translate(100 100)"
      />
    </svg>
  )
}

/** Simple dog + cat duo outline used on the app-promo banner. */
export function PetDuoIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 160"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Dog */}
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M55 130c0-28 18-46 40-46s40 18 40 46" />
        <path d="M70 90c-6-14-4-28 4-30 6-1 10 6 10 6" />
        <path d="M120 90c6-14 4-28-4-30-6-1-10 6-10 6" />
        <circle cx="85" cy="100" r="3" fill="currentColor" />
        <circle cx="105" cy="100" r="3" fill="currentColor" />
        <path d="M90 112c3 3 7 3 10 0" />
        <path d="M55 130h80" />
      </g>
      {/* Cat */}
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(120,0)">
        <path d="M45 130c0-24 15-40 35-40s35 16 35 40" />
        <path d="M58 96l-8-22 18 10" />
        <path d="M102 96l8-22-18 10" />
        <circle cx="70" cy="105" r="3" fill="currentColor" />
        <circle cx="90" cy="105" r="3" fill="currentColor" />
        <path d="M75 116h10" />
        <path d="M45 130h70" />
      </g>
    </svg>
  )
}
