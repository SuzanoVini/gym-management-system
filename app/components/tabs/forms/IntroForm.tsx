'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, FormField } from '@/components/ui/Form';
import { checkMemberStatus } from '@/lib/supabase/memberStatus';
import type { Intro, IntroFormData } from '@/types';
import {
  IntroFormActions,
  IntroOutcomeFields,
  IntroTimeField,
  RequiredOptionsSelect,
} from './IntroForm/IntroFormFields';
import {
  buildIntroPayload,
  type IntroFormValues,
  initialIntroFormValues,
  monthFromDate,
} from './IntroForm/introFormValues';

interface IntroFormProps {
  intro?: Intro | null;
  onSubmit: (data: IntroFormData) => void | Promise<void>;
  loading?: boolean;
  onCancel: () => void;
  classTypes: string[];
  staffMembers: string[];
}

export default function IntroForm({
  intro,
  onSubmit,
  loading = false,
  onCancel,
  classTypes,
  staffMembers,
}: IntroFormProps) {
  const [formData, setFormData] = useState<IntroFormValues>(initialIntroFormValues(intro));

  const [memberError, setMemberError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const classOptions = useMemo(() => {
    if (intro?.class && !classTypes.includes(intro.class)) {
      return [...classTypes, intro.class];
    }
    return classTypes;
  }, [classTypes, intro?.class]);

  const staffOptions = useMemo(() => {
    if (intro?.staff && !staffMembers.includes(intro.staff)) {
      return [...staffMembers, intro.staff];
    }
    return staffMembers;
  }, [staffMembers, intro?.staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create mode only: hard block if current member
    if (!intro) {
      const status = await checkMemberStatus(formData.name.trim());
      if (status.isCurrentMember && status.signupDate) {
        setMemberError(
          `${formData.name.trim()} is a current member (signed up ${status.signupDate}). Cannot add as intro.`
        );
        return;
      }
    }

    const payload = buildIntroPayload(formData);
    await onSubmit(payload);
  };

  const updateField = (
    field: keyof IntroFormValues,
    value: string | number | readonly string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const warnIfCurrentMember = async (trimmed: string) => {
    const status = await checkMemberStatus(trimmed);
    if (status.isCurrentMember && status.signupDate) {
      setMemberError(
        `${trimmed} is a current member (signed up ${status.signupDate}). Cannot add as intro.`
      );
    }
  };

  const handleNameChange = (value: string | number | readonly string[]) => {
    updateField('name', value);
    setMemberError(null);

    // Only validate in create mode
    if (intro) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = (value as string).trim();
    if (!trimmed) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void warnIfCurrentMember(trimmed);
    }, 500);
  };

  return (
    <Form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      loading={loading}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder="Enter full name"
          required
        />

        {memberError && (
          <p className="text-sm text-red-600 -mt-2 col-span-1 md:col-span-2">{memberError}</p>
        )}

        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(value) => updateField('email', value)}
          placeholder="email@example.com"
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(value) => updateField('phone', value)}
          placeholder="(555) 123-4567"
        />

        <FormField
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={(value) => {
            const s = value as string;
            setFormData((prev) => ({ ...prev, date: s, month: monthFromDate(s) || prev.month }));
          }}
          required
        />

        <IntroTimeField value={formData.time} onChange={(value) => updateField('time', value)} />

        <RequiredOptionsSelect
          id="class"
          label="Class"
          value={formData.class}
          onChange={(value) => updateField('class', value)}
          options={classOptions}
        />

        <RequiredOptionsSelect
          id="staff"
          label="Staff"
          value={formData.staff}
          onChange={(value) => updateField('staff', value)}
          options={staffOptions}
        />

        <IntroOutcomeFields
          attended={formData.attended}
          signedUp={formData.signed_up}
          status={formData.status}
          updateField={updateField}
        />
      </div>

      <IntroFormActions loading={loading} isEdit={Boolean(intro)} onCancel={onCancel} />
    </Form>
  );
}
