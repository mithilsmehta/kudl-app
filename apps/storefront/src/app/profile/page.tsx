"use client"

/**
 * Account — port of apps/mobile/app/(tabs)/profile.tsx.
 * The app's Alert.alert sign-out prompt becomes a real modal (ConfirmDialog).
 */

import Link from "next/link"
import { useState } from "react"
import {
  User,
  Package,
  MapPin,
  Settings,
  Shield,
  LogIn,
  LogOut,
  UserPlus,
  ChevronRight,
} from "@/components/icons"
import { useAuth } from "@/context/AuthContext"
import { MEDUSA_BACKEND_URL } from "@/lib/api"
import ScreenHeader from "@/components/ScreenHeader"
import ConfirmDialog from "@/components/ConfirmDialog"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const displayName =
    user && (user.first_name || user.last_name)
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : "KUDL Customer"

  return (
    <div>
      <ScreenHeader title="Account" />

      <div className="mx-auto max-w-2xl p-4 md:px-6 md:pb-16">
        {/* User header */}
        <div className="mb-4 flex items-center gap-3.5 rounded-kudl-card border border-kudl-border bg-white p-4">
          <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-kudl-tint">
            <User className="h-9 w-9 text-kudl-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-kudl-ink">
              {user ? displayName : "Welcome Guest"}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-kudl-muted">
              {user
                ? user.email
                : "Sign in to save orders & checkout faster"}
            </p>
          </div>
        </div>

        {/* Guest auth buttons */}
        {!user && (
          <div className="mb-4 flex gap-3">
            <Link
              href="/login"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-kudl-primary text-[15px] font-semibold text-white transition-colors hover:bg-kudl-dark"
            >
              <LogIn className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-kudl-primary bg-white text-[15px] font-semibold text-kudl-primary transition-colors hover:bg-kudl-tint"
            >
              <UserPlus className="h-[18px] w-[18px]" aria-hidden="true" />
              Register
            </Link>
          </div>
        )}

        {/* Menu list */}
        <ul className="mb-4 overflow-hidden rounded-kudl-card border border-kudl-border bg-white">
          <li>
            <Link
              href={user ? "/orders" : "/login?next=/orders"}
              className="flex items-center gap-3 border-b border-kudl-divider p-4 transition-colors hover:bg-kudl-bg"
            >
              <Package className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />
              <span className="flex-1 text-[15px] font-medium text-kudl-ink">
                My Orders
              </span>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link
              href={user ? "/addresses" : "/login?next=/addresses"}
              className="flex items-center gap-3 border-b border-kudl-divider p-4 transition-colors hover:bg-kudl-bg"
            >
              <MapPin className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />
              <span className="flex-1 text-[15px] font-medium text-kudl-ink">
                My Addresses
              </span>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
            </Link>
          </li>
          {/*
            Account Settings and Privacy & Security are inert in the app too —
            there are no screens behind them yet. They're marked disabled here
            rather than rendered as links that go nowhere.
          */}
          <li>
            <div
              aria-disabled="true"
              className="flex items-center gap-3 border-b border-kudl-divider p-4 opacity-50"
            >
              <Settings className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />
              <span className="flex-1 text-[15px] font-medium text-kudl-ink">
                Account Settings
              </span>
              <span className="text-[11px] font-semibold uppercase text-kudl-faint">
                Soon
              </span>
            </div>
          </li>
          <li>
            <div
              aria-disabled="true"
              className="flex items-center gap-3 p-4 opacity-50"
            >
              <Shield className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />
              <span className="flex-1 text-[15px] font-medium text-kudl-ink">
                Privacy &amp; Security
              </span>
              <span className="text-[11px] font-semibold uppercase text-kudl-faint">
                Soon
              </span>
            </div>
          </li>
        </ul>

        {/* Backend connection info — the app shows this to make demos debuggable. */}
        <div className="mb-4 rounded-xl bg-kudl-tint p-3.5">
          <p className="text-xs font-bold uppercase text-kudl-dark">
            Medusa Backend URL
          </p>
          <p className="mt-0.5 break-all text-[13px] text-kudl-darker">
            {MEDUSA_BACKEND_URL}
          </p>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-[15px] font-semibold text-kudl-danger"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            Log Out
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        destructive
        onConfirm={async () => {
          setConfirmLogout(false)
          await logout()
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
