import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { CartProvider } from "@/context/CartContext"
import TopNav from "@/components/TopNav"
import TabBar from "@/components/TabBar"

export const metadata: Metadata = {
  title: {
    default: "KUDL Pet Store | Everything Your Pet Needs",
    template: "%s | KUDL Pet Store",
  },
  description:
    "KUDL Pet Store is an Indian pet store for dogs and cats — food, treats, toys and grooming essentials, delivered across India.",
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-kudl-bg font-sans">
        <AuthProvider>
          <CartProvider>
            <TopNav />
            {/*
              pb-20 clears the fixed bottom tab bar on narrow viewports. On md+
              the tab bar is hidden, so the padding is dropped.
            */}
            <main className="pb-20 md:pb-16">{children}</main>
            <TabBar />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
