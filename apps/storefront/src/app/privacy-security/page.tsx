'use client';

/**
 * Privacy & Security — port of apps/mobile/app/privacy-security.tsx.
 *
 * Built around a simple idea: a privacy page is only worth having if every
 * control on it changes what the backend actually does, and if it can tell the
 * customer what is held about them. So it has three parts, in that order:
 *
 *   1. Your data — real counts, straight from the database. This is what makes
 *      the buttons underneath it mean something.
 *   2. Permissions — three toggles, each honoured by a specific backend route:
 *      marketing email, activity tracking (the recommendation event log stops
 *      being written), and personalization (the log stops being used for
 *      ranking). Tracking and personalization are separate because they answer
 *      different questions, and someone may well allow one and not the other.
 *   3. Security & data controls — change password, wipe activity history, delete
 *      the account.
 *
 * Toggles are written optimistically and rolled back on failure, because a
 * switch that lags a network round trip feels broken and gets clicked twice.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Package, MapPin, Heart, Activity, Mail, Star, Lock, Trash2, Info, ChevronRight } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  PrivacyDataSummary,
  PrivacySettings,
  clearActivityHistory,
  getPrivacyOverview,
  updatePrivacySettings,
} from '@/lib/api';
import ScreenHeader from '@/components/ScreenHeader';
import Spinner from '@/components/Spinner';
import ErrorBanner from '@/components/ErrorBanner';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function PrivacySecurityPage() {
  const { isReady } = useRequireAuth();
  const { user } = useAuth();

  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [summary, setSummary] = useState<PrivacyDataSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const overview = await getPrivacyOverview();
      setSettings(overview.settings);
      setSummary(overview.data_summary);
    } catch (e: any) {
      setError(e?.message || 'Could not load your settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) load();
  }, [isReady, load]);

  const toggle = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setError(null);
    try {
      setSettings(await updatePrivacySettings({ [key]: value }));
    } catch (e: any) {
      setSettings(previous);
      setError(e?.message || 'Could not save that setting.');
    }
  };

  const handleClearActivity = async () => {
    setConfirmClear(false);
    setIsClearing(true);
    setError(null);
    setNotice(null);
    try {
      const deleted = await clearActivityHistory();
      setSummary((s) => (s ? { ...s, activity_events: 0 } : s));
      setNotice(
        deleted
          ? `${deleted} activity ${deleted === 1 ? 'record' : 'records'} deleted.`
          : 'There was nothing to clear.',
      );
    } catch (e: any) {
      setError(e?.message || 'Could not clear your history.');
    } finally {
      setIsClearing(false);
    }
  };

  if (!isReady || !user || isLoading) {
    return (
      <div>
        <ScreenHeader title="Privacy & Security" fallbackHref="/profile" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      </div>
    );
  }

  const memberSince = summary?.account_created_at
    ? new Date(summary.account_created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div>
      <ScreenHeader title="Privacy & Security" fallbackHref="/profile" />

      <div className="mx-auto max-w-2xl p-4 md:px-6 md:pb-16">
        <SectionLabel>Your data</SectionLabel>
        <div className="mb-6 rounded-kudl-card border border-kudl-border bg-white p-4 md:p-5">
          <p className="text-[13px] text-kudl-muted">What KUDL currently stores against your account.</p>
          <div className="mt-3.5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              icon={<Package className="h-4 w-4 text-kudl-primary" aria-hidden="true" />}
              label="Orders"
              value={summary?.orders ?? 0}
            />
            <Stat
              icon={<MapPin className="h-4 w-4 text-kudl-primary" aria-hidden="true" />}
              label="Addresses"
              value={summary?.addresses ?? 0}
            />
            <Stat
              icon={<Heart className="h-4 w-4 text-kudl-primary" aria-hidden="true" />}
              label="Pet profiles"
              value={summary?.pets ?? 0}
            />
            <Stat
              icon={<Activity className="h-4 w-4 text-kudl-primary" aria-hidden="true" />}
              label="Activity records"
              value={summary?.activity_events ?? 0}
            />
          </div>
          {memberSince && (
            <p className="mt-3.5 border-t border-kudl-divider pt-3.5 text-xs text-kudl-faint">
              Member since {memberSince}
            </p>
          )}
        </div>

        <SectionLabel>Permissions</SectionLabel>
        <div className="mb-6 rounded-kudl-card border border-kudl-border bg-white px-4 md:px-5">
          <ToggleRow
            icon={<Mail className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Promotional emails"
            description="Offers, new arrivals and pet care tips. Order and delivery updates are sent either way."
            checked={settings?.marketing_emails ?? true}
            onChange={(v) => toggle('marketing_emails', v)}
          />
          <ToggleRow
            icon={<Activity className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Activity tracking"
            description="Lets us record what you view and buy. Turning this off stops new activity being saved."
            checked={settings?.activity_tracking ?? true}
            onChange={(v) => toggle('activity_tracking', v)}
          />
          <ToggleRow
            icon={<Star className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Personalised recommendations"
            description={
              settings?.activity_tracking === false
                ? 'Uses your saved activity to pick products for you. Nothing new is being recorded while tracking is off.'
                : 'Uses your saved activity to pick products for you. Turn off to see the same picks as everyone else.'
            }
            checked={settings?.personalized_recommendations ?? true}
            onChange={(v) => toggle('personalized_recommendations', v)}
            isLast
          />
        </div>

        <SectionLabel>Security</SectionLabel>
        <ul className="mb-6 overflow-hidden rounded-kudl-card border border-kudl-border bg-white">
          <MenuRow
            href="/change-password"
            icon={<Lock className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Change password"
            value="Requires your current password"
          />
          <MenuRow
            href="/change-email"
            icon={<Mail className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Change sign-in email"
            value={user.email}
            isLast
          />
        </ul>

        <SectionLabel>Data controls</SectionLabel>
        <div className="mb-4 overflow-hidden rounded-kudl-card border border-kudl-border bg-white">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={isClearing}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-kudl-bg disabled:opacity-60"
          >
            <Trash2 className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-kudl-ink">Clear activity history</span>
              <span className="mt-0.5 block text-[13px] text-kudl-muted">
                {summary?.activity_events
                  ? `Delete ${summary.activity_events} saved activity records`
                  : 'Nothing saved right now'}
              </span>
            </span>
            {isClearing ? (
              <Spinner className="h-[18px] w-[18px] text-kudl-primary" />
            ) : (
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
            )}
          </button>
        </div>

        <ErrorBanner message={error} />
        {notice && (
          <p role="status" className="mb-4 text-[13px] font-medium text-green-700">
            {notice}
          </p>
        )}

        {/* <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-kudl-tint p-3.5">
          <Info className="mt-px h-4 w-4 shrink-0 text-kudl-dark" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-kudl-darker">
            Your past orders are kept even if you delete your account. They are payment
            records, and we need them for GST returns, refunds and payment disputes.
          </p>
        </div> */}

        {/*
          No "read the full privacy policy" link here on purpose: the storefront
          has no such page yet — the footer renders Privacy Policy and Terms as
          inert <span>s — and a link into a 404 is worse than no link. Add it
          back pointing at the real page once one exists.
        */}
        <Link
          href="/delete-account"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-[15px] font-bold text-kudl-danger transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
          Delete my account
        </Link>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear activity history?"
        message="Your browsing and purchase signals will be deleted. Recommendations will start from scratch. Orders, addresses and pets are not affected."
        confirmLabel="Clear"
        destructive
        onConfirm={handleClearActivity}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-kudl-muted">{children}</h2>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      {icon}
      <p className="mt-1.5 text-[22px] font-bold leading-none text-kudl-ink">{value}</p>
      <p className="mt-1 text-xs text-kudl-muted">{label}</p>
    </div>
  );
}

/**
 * The app uses React Native's <Switch>; on the web this is a checkbox styled as
 * a track and knob. It stays a real checkbox so it keeps keyboard focus, the
 * space key, and the checked state screen readers announce.
 */
function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 py-3.5 ${isLast ? '' : 'border-b border-kudl-divider'}`}>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-kudl-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-kudl-muted">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      {/*
        The knob's position comes from `checked` rather than a peer-checked:
        variant. Tailwind compiles peer-checked: to `.peer:checked ~ &`, which
        matches a SIBLING of the input — so it styles the track fine but can
        never reach the knob nested inside it, and the knob would sit still.
      */}
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-kudl-primary/40 peer-focus-visible:ring-offset-2 ${
          checked ? 'bg-kudl-primary' : 'bg-kudl-hairline'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  );
}

function MenuRow({
  href,
  icon,
  title,
  value,
  isLast,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 p-4 transition-colors hover:bg-kudl-bg ${
          isLast ? '' : 'border-b border-kudl-divider'
        }`}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-kudl-ink">{title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-kudl-muted">{value}</span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-kudl-faint" aria-hidden="true" />
      </Link>
    </li>
  );
}
