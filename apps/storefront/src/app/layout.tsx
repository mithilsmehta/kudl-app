import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { CartProvider } from "@/context/CartContext"
import { WishlistProvider } from "@/context/WishlistContext"
import TopNav from "@/components/TopNav"
import TabBar from "@/components/TabBar"
import Footer from "@/components/Footer"

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
            <WishlistProvider>
              <TopNav />
              <main>{children}</main>
              {/*
                Footer carries its own bottom padding to clear the fixed
                mobile TabBar, since it's the last element before it.
              */}
              <Footer />
              <TabBar />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
