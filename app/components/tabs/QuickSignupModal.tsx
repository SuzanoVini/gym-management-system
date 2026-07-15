'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { createSignup } from '@/lib/supabase/signups';
import { monthAbbrFromDate, yearFromDate } from '@/lib/utils/date.utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Intro } from '@/types';

function toMonthAbbr(dateStr: string): string {
  return monthAbbrFromDate(dateStr) || 'Jan';
}

function toYear(dateStr: string): number {
  return yearFromDate(dateStr) ?? new Date(dateStr).getFullYear();
}

function today(): string {
  const iso = new Date().toISOString();
  const dateStr = iso.split('T')[0];
  return dateStr || '2000-01-01';
}

interface Props {
  intro: Intro;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickSignupModal({ intro, onClose, onSuccess }: Props) {
  const todayStr = today();
  const membershipTypes = useSettingsStore((s) => s.membershipTypes);
  const [membership, setMembership] = useState('');
  const [signupDate, setSignupDate] = useState(todayStr);
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayStr);
  const [signupPackage, setSignupPackage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step2Failed, setStep2Failed] = useState(false);
  const isASP = membership.trim().toLowerCase() === 'asp';

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!membership) {
      errs.membership = 'Please select a membership type.';
    }
    if (!signupDate) {
      errs.signupDate = 'Please enter a sign up date.';
    }
    if (!firstPaymentDate) {
      errs.firstPaymentDate = 'Please enter a first payment date.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      return;
    }
    setLoading(true);
    setError('');

    const { error: introError } = await supabase
      .from('intros')
      .update({ signed_up: 'Yes' })
      .eq('id', intro.id);

    if (introError) {
      setError('Failed to update the intro. Please try again.');
      setLoading(false);
      return;
    }

    try {
      await createSignup({
        name: intro.name,
        membership,
        membership_date: signupDate,
        first_payment_date: firstPaymentDate,
        signup_package: isASP ? false : signupPackage,
        month: toMonthAbbr(signupDate),
        year: toYear(signupDate),
      });
    } catch {
      setStep2Failed(true);
      setError('Signup record could not be created. Please add it manually in the Signups tab.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  function handleClose() {
    if (step2Failed) {
      onSuccess();
    } else {
      onClose();
    }
  }

  return (
    <Modal isOpen onClose={handleClose} title="New Sign Up" size="sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-900">{intro.name}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!step2Failed && (
          <div className="space-y-3">
            <div>
              <label htmlFor="membership" className="block text-sm font-medium text-gray-700 mb-1">
                Membership <span className="text-red-500">*</span>
              </label>
              <select
                id="membership"
                value={membership}
                onChange={(e) => setMembership(e.target.value)}
                className="form-select w-full"
              >
                <option value="">Select membership…</option>
                {membershipTypes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {fieldErrors.membership && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.membership}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-date" className="block text-sm font-medium text-gray-700 mb-1">
                Sign Up Date <span className="text-red-500">*</span>
              </label>
              <input
                id="signup-date"
                type="date"
                value={signupDate}
                onChange={(e) => setSignupDate(e.target.value)}
                className="form-input w-full"
              />
              {fieldErrors.signupDate && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.signupDate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="first-payment-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                id="first-payment-date"
                type="date"
                value={firstPaymentDate}
                onChange={(e) => setFirstPaymentDate(e.target.value)}
                className="form-input w-full"
              />
              {fieldErrors.firstPaymentDate && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.firstPaymentDate}</p>
              )}
            </div>

            {!isASP && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="signup-package"
                  checked={signupPackage}
                  onChange={(e) => setSignupPackage(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600"
                />
                <label htmlFor="signup-package" className="text-sm text-gray-700">
                  Package
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn btn-secondary"
          >
            {step2Failed ? 'Close' : 'Cancel'}
          </button>
          {!step2Failed && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving…' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
