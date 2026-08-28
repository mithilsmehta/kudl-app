'use client';

/**
 * Account Settings — port of apps/mobile/app/account-settings.tsx.
 *
 * Split three ways by how much proof each change needs, which is also why it is
 * not one big Save button:
 *
 *   - Name, phone and company: no proof. Saved inline here.
 *   - Email: proof that the new address is reachable, because it is also the
 *     login identifier. Own page, own two-step flow.
 *   - Password: proof of the current password. Own page.
 *
 * Delete Account sits at the bottom, visually separated, and is the only route
 * out of here that cannot be undone.
 *
 * The app's Alert.alert calls become an inline ErrorBanner for failures and a
 * transient success line for the happy path, matching how the rest of the
 * storefront handles the same prompts.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Mail, Lock, Shield, Trash2, ChevronRight, CheckCircle } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/lib/useRequireAuth';
import ScreenHeader from '@/components/ScreenHeader';
import Spinner from '@/components/Spinner';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';

export default function AccountSettingsPage() {
  const { isReady } = useRequireAuth();
  const { user, updateProfile, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-seeds the form from the customer record whenever it changes — including
  // on the way back from the email page, so a just-changed address shows
  // immediately instead of the stale one this page loaded with.
  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setPhone(user.phone || '');
    setCompanyName(user.company_name || '');
  }, [user]);

  // The email row is rendered from `user`, and the email page changes it on the
  // server. Re-reading on mount covers coming back here after that change.
  useEffect(() => {
    if (isReady) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      firstName.trim() !== (user.first_name || '') ||
      lastName.trim() !== (user.last_name || '') ||
      phone.trim() !== (user.phone || '') ||
      companyName.trim() !== (user.company_name || '')
    );
  }, [user, firstName, lastName, phone, companyName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!firstName.trim() && !lastName.trim()) {
      setError('Enter at least a first or last name.');
      return;
    }

    // Deliberately loose: 10 digits after stripping spaces, dashes and a +91.
    // Indian mobile numbers get written half a dozen ways and rejecting a valid
    // one is worse than storing a slightly odd one.
    const digits = phone.replace(/[^\d]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (phone.trim() && digits.length !== 10) {
      setError('Enter a 10-digit mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim() ? digits : '',
        company_name: companyName,
      });
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Could not save your details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady || !user) {
    return (
      <div>
        <ScreenHeader title="Account Settings" fallbackHref="/profile" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="Account Settings" fallbackHref="/profile" />

      <div className="mx-auto max-w-2xl p-4 md:px-6 md:pb-16">
        <SectionLabel>Personal details</SectionLabel>
        <form onSubmit={handleSave} className="mb-6 rounded-kudl-card border border-kudl-border bg-white p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              autoComplete="given-name"
            />
            <FormField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              autoComplete="family-name"
            />
          </div>

          <div className="mt-4">
            <FormField
              label="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="mt-1.5 text-xs text-kudl-muted">Used for delivery updates and order calls.</p>
          </div>

          {/* <div className="mt-4">
            <FormField
              label="Company (optional)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="For GST invoices"
              autoComplete="organization"
            />
          </div> */}

          <ErrorBanner message={error} />

          {saved && (
            <p role="status" className="mt-3 flex items-center gap-2 text-[13px] font-medium text-green-700">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Your details have been updated.
            </p>
          )}

          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-kudl-primary text-[15px] font-bold text-white transition-colors hover:bg-kudl-dark disabled:cursor-not-allowed disabled:bg-kudl-primary/40 md:w-auto md:px-8"
          >
            {isSaving ? <Spinner className="h-5 w-5 text-white" label="Saving" /> : 'Save changes'}
          </button>
        </form>

        <SectionLabel>Sign-in &amp; security</SectionLabel>
        <ul className="mb-6 overflow-hidden rounded-kudl-card border border-kudl-border bg-white">
          <MenuRow
            href="/change-email"
            icon={<Mail className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Email address"
            value={user.email}
          />
          <MenuRow
            href="/change-password"
            icon={<Lock className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Password"
            value="Change your password"
          />
          <MenuRow
            href="/privacy-security"
            icon={<Shield className="h-5 w-5 shrink-0 text-kudl-body" aria-hidden="true" />}
            title="Privacy & security"
            value="Data, tracking and permissions"
            isLast
          />
        </ul>

        <SectionLabel>Danger zone</SectionLabel>
        <div className="rounded-kudl-card border border-red-200 bg-red-50/40 p-4 md:p-5">
          <h2 className="text-[15px] font-bold text-red-700">Delete account</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-red-900/80">
            Permanently removes your profile, addresses, pets and activity history.
          </p>
          <Link
            href="/delete-account"
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-[15px] font-bold text-kudl-danger transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            Delete my account
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-kudl-muted">{children}</h2>;
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
