/**
 * KUDL Pets — web design tokens.
 *
 * Every value here is lifted verbatim from the React Native StyleSheets in
 * apps/mobile, so the website and the app render the same design language.
 * When a colour changes in the app, change it here too — these are the only
 * two places the palette is defined.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        kudl: {
          /* Brand blue — mobile tabBarActiveTintColor / primary buttons */
          primary: "#2563eb",
          dark: "#1e40af",
          darker: "#1e3a8a",
          tint: "#eff6ff",
          /* Text ramp — mobile #111827 / #374151 / #4b5563 / #6b7280 / #9ca3af */
          ink: "#111827",
          body: "#374151",
          subtle: "#4b5563",
          muted: "#6b7280",
          faint: "#9ca3af",
          /* Surfaces */
          bg: "#f9fafb",
          surface: "#f3f4f6",
          border: "#e5e7eb",
          divider: "#f3f4f6",
          hairline: "#d1d5db",
          /* Status */
          success: "#059669",
          danger: "#ef4444",
          /* Amber hero promo card */
          "amber-from": "#fef3c7",
          "amber-to": "#fde68a",
          "amber-ink": "#78350f",
          "amber-body": "#92400e",
          "amber-icon": "#f59e0b",
          /*
           * Web-only decorative accents. The mobile app has no equivalent
           * screens (stats strips, app-promo banners) that would need these
           * mirrored, so — unlike everything above — they live only here.
           */
          coral: "#f4645c",
          "coral-light": "#feeceb",
          teal: "#0d9488",
          "teal-light": "#e6fffb",
          violet: "#7c3aed",
          "violet-light": "#f3ebfe",
        },
      },
      backgroundImage: {
        /* Mobile header LinearGradient: ['#1e3a8a', '#2563eb'] at 135deg */
        "kudl-header": "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        /* Mobile hero LinearGradient: ['#fef3c7', '#fde68a'] at 135deg */
        "kudl-hero": "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        /* Web-only gradients for new sections without a mobile counterpart */
        "kudl-violet": "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #9333ea 100%)",
        "kudl-teal": "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
        "kudl-sunset": "linear-gradient(135deg, #f4645c 0%, #fb923c 100%)",
      },
      borderRadius: {
        /* Mobile borderRadius values that Tailwind's scale doesn't cover */
        "kudl-card": "14px",
        "kudl-tile": "18px",
        "kudl-hero": "20px",
        "kudl-header": "24px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(12px, -18px) scale(1.08)" },
          "66%": { transform: "translate(-14px, 10px) scale(0.95)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        blob: "blob 9s ease-in-out infinite",
        marquee: "marquee 22s linear infinite",
      },
    },
  },
  plugins: [],
}
