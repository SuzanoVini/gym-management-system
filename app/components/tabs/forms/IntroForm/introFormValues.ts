import type { Intro, IntroFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  return parts.length >= 2 ? (MONTHS[Number(parts[1]) - 1] ?? '') : '';
};

export type IntroFormValues = {
  month: string;
  date: string;
  time: string;
  class: string;
  name: string;
  email: string;
  phone: string;
  staff: string;
  attended: '' | 'Yes' | 'No';
  signed_up: '' | 'Yes' | 'No';
  status: 'Active' | 'Cancelled' | 'Completed';
};

function orEmpty<T extends string>(value: T | null | undefined): T | '' {
  return value || '';
}

export function initialIntroFormValues(intro: Intro | null | undefined): IntroFormValues {
  if (!intro) {
    return {
      month: MONTHS[new Date().getMonth()] ?? '',
      date: '',
      time: '',
      class: '',
      name: '',
      email: '',
      phone: '',
      staff: '',
      attended: '',
      signed_up: '',
      status: 'Active',
    };
  }
  return {
    month: intro.month || (MONTHS[new Date().getMonth()] ?? ''),
    date: orEmpty(intro.date),
    time: orEmpty(intro.time),
    class: orEmpty(intro.class),
    name: orEmpty(intro.name),
    email: orEmpty(intro.email),
    phone: orEmpty(intro.phone),
    staff: orEmpty(intro.staff),
    attended: orEmpty(intro.attended),
    signed_up: orEmpty(intro.signed_up),
    status: intro.status || 'Active',
  };
}

export function buildIntroPayload(formData: IntroFormValues): IntroFormData {
  const payload: IntroFormData = {
    month: formData.month,
    class: formData.class,
    name: formData.name,
    staff: formData.staff,
    status: formData.status,
  };
  if (formData.date) {
    payload.date = formData.date;
    const yr = Number(formData.date.split('-')[0]);
    if (!Number.isNaN(yr)) {
      payload.year = yr;
    }
  }
  if (formData.time) {
    payload.time = formData.time;
  }
  if (formData.email) {
    payload.email = formData.email;
  }
  if (formData.phone) {
    payload.phone = formData.phone;
  }
  if (formData.attended) {
    payload.attended = formData.attended;
  }
  if (formData.signed_up) {
    payload.signed_up = formData.signed_up;
  }
  return payload;
}
