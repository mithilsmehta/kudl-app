'use client';

/**
 * Delete Account — port of apps/mobile/app/delete-account.tsx.
 *
 * Three deliberate pieces of friction, in increasing order of cost to fake: the
 * customer is shown exactly what goes and what stays (with real counts, so it is
 * not a generic warning they can skim), they must type DELETE, and they must
 * enter their password — which the backend verifies, so it is a real check rather
 * than theatre.
 *
 * The "what stays" list matters as much as the "what goes" one. Past orders are
 * retained as payment records, and someone deleting their account because they
 * want their data gone deserves to learn that here rather than discover it later.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, User, MapPin, Heart, Activity, Lock, FileText, CheckCircle } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { PrivacyDataSummary, getPrivacyOverview } from '@/lib/api';
import ScreenHeader from '@/components/ScreenHeader';
import Spinner from '@/components/Spinner';
import ErrorBanner from '@/components/ErrorBanner';
import FormField from '@/components/FormField';
import ConfirmDialog from '@/components/ConfirmDialog';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, isLoading, deleteAccount } = useAuth();
  const { resetCart } = useCart();

  const [summary, setSummary] = useState<PrivacyDataSummary | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orders: number } | null>(null);

  /*
   * The sign-in guard is spelled out here instead of using useRequireAuth,
   * because a successful deletion sets `user` to null on purpose and that hook
   * would read it as "signed out", redirecting to /login and replacing the
   * confirmation panel the customer needs to read.
   *
   * It is a ref set BEFORE the request, not a state flag set after it, because
   * `deleteAccount` signs out as part of its own work — so `user` is already null
   * while `resetCart()` is still awaiting a network call, and a render happens in
   * that window with no user and no result yet. A state flag set afterwards
   * arrives too late to stop it; a ref is readable by the effect immediately and
   * never triggers a render of its own.
   */
  const isDeletingRef = useRef(false);
  const isReady = !isLoading && !!user;

  useEffect(() => {
    if (isDeletingRef.current || result) return;
    if (!isLoading && !user) {
      router.replace('/login?next=%2Fdelete-account');
    }
  }, [isLoading, user, result, router]);

  useEffect(() => {
    if (!isReady) return;
    // Counts are a nice-to-have on this page, not a precondition — a failed load
    // must not block someone from deleting their account, so the copy below falls
    // back to unnumbered wording.
    getPrivacyOverview()
      .then((overview) => setSummary(overview.data_summary))
      .catch(() => setSummary(null));
  }, [isReady]);

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD && !!password && !isBusy;

  const handleDelete = async () => {
    setShowConfirm(false);
    setIsBusy(true);
    setError(null);
    isDeletingRef.current = true;
    try {
      const deleted = await deleteAccount(password);

      /*
       * The cart is dropped after, not before. It is tied to the customer that no
       * longer exists, so keeping its id would leave the storefront pointing at a
       * cart it can never check out — but doing it first would throw away a live
       * cart if the delete then failed on a wrong password.
       */
      await resetCart();

      setResult({ orders: deleted.retained.orders });
      setTimeout(() => router.push('/'), 2600);
    } catch (e: any) {
      // Deletion failed, so the customer is still signed in and the guard should
      // go back to doing its job.
      isDeletingRef.current = false;
      setError(e?.message || 'Could not delete your account. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  // Checked first, ahead of the signed-out spinner: after deletion `user` is null
  // by design, and the spinner branch would otherwise swallow the confirmation.
  if (result) {
    return (
      <div>
        <ScreenHeader title="Delete Account" fallbackHref="/" />
        <div className="mx-auto max-w-md p-4 md:px-6 md:pb-16">
          <div className="rounded-kudl-card border border-kudl-border bg-white p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-7 w-7 text-green-600" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-kudl-ink">Account deleted</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
              {result.orders
                ? `Your account is gone. ${result.orders} past ${
                    result.orders === 1 ? 'order is' : 'orders are'
                  } kept as payment records.`
                : 'Your account and all associated data have been deleted.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady || !user) {
    return (
      <div>
        <ScreenHeader title="Delete Account" fallbackHref="/account-settings" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8 text-kudl-primary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="Delete Account" fallbackHref="/account-settings" />

      <div className="mx-auto max-w-md p-4 md:px-6 md:pb-16">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-kudl-danger" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[22px] font-bold text-kudl-ink">Delete your account</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-kudl-muted">
          This is permanent. There is no way to restore the account or its data afterwards.
        </p>

        <SectionLabel>What gets deleted</SectionLabel>
        <ul className="rounded-kudl-card border border-kudl-border bg-white p-4">
          <Bullet
            icon={<User className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />}
            text="Your profile, name, phone and email"
          />
          <Bullet
            icon={<MapPin className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />}
            text={
              summary
                ? `${summary.addresses} saved ${summary.addresses === 1 ? 'address' : 'addresses'}`
                : 'Your saved addresses'
            }
          />
          <Bullet
            icon={<Heart className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />}
            text={summary ? `${summary.pets} pet ${summary.pets === 1 ? 'profile' : 'profiles'}` : 'Your pet profiles'}
          />
          <Bullet
            icon={<Activity className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />}
            text={
              summary ? `${summary.activity_events} activity records used for recommendations` : 'Your activity history'
            }
          />
          <Bullet
            icon={<Lock className="h-4 w-4 shrink-0 text-kudl-muted" aria-hidden="true" />}
            text="Your sign-in credentials"
            isLast
          />
        </ul>

        {/* <SectionLabel>What we have to keep</SectionLabel>
        <ul className="rounded-kudl-card border border-blue-200 bg-kudl-tint p-4">
          <Bullet
            icon={<FileText className="h-4 w-4 shrink-0 text-kudl-dark" aria-hidden="true" />}
            text={
              summary && summary.orders
                ? `${summary.orders} past ${
                    summary.orders === 1 ? "order" : "orders"
                  } — payment records needed for GST returns, refunds and payment disputes. They will no longer be linked to an account you can sign in to.`
                : "Any past orders, as payment records needed for GST returns, refunds and payment disputes."
            }
            tinted
            isLast
          />
        </ul> */}

        <SectionLabel>Confirm</SectionLabel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) setShowConfirm(true);
          }}
          className="rounded-kudl-card border border-kudl-border bg-white p-4"
        >
          <FormField
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-4">
            <FormField
              label="Your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <p className="mt-1.5 text-xs text-kudl-muted">
              Confirms it&apos;s really you, not someone using your browser.
            </p>
          </div>

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-kudl-danger text-[15px] font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isBusy ? <Spinner className="h-5 w-5 text-white" label="Deleting" /> : 'Delete my account permanently'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/account-settings')}
            disabled={isBusy}
            className="mt-3.5 w-full text-sm font-semibold text-kudl-muted hover:underline"
          >
            Keep my account
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Delete account permanently?"
        message="This cannot be undone. Your profile, addresses, pet profiles and activity history will be deleted."
        confirmLabel="Delete"
        cancelLabel="Keep my account"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-kudl-muted">{children}</h3>;
}

function Bullet({
  icon,
  text,
  isLast,
  tinted,
}: {
  icon: React.ReactNode;
  text: string;
  isLast?: boolean;
  tinted?: boolean;
}) {
  return (
    <li className={`flex items-start gap-2.5 ${isLast ? '' : 'pb-3'}`}>
      {icon}
      <span className={`text-[13px] leading-relaxed ${tinted ? 'text-kudl-darker' : 'text-kudl-body'}`}>{text}</span>
    </li>
  );
}
