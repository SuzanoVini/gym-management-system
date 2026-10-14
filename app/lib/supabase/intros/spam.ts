// app/lib/supabase/intros/spam.ts

import type { Intro } from '@/types';
import { supabase } from '../client';

type SpamGroupKey = Pick<Intro, 'id'> & {
  email_normalized?: string | null;
  phone_normalized?: string | null;
};

const MIN_GROUP_PHONE_DIGITS = 7;

// supabase-js .or() does no escaping: quote every value and escape \ then ".
const quoteFilterValue = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function buildSpamGroupFilter(intro: SpamGroupKey): string {
  const terms = [`id.eq.${quoteFilterValue(intro.id)}`];
  if (intro.email_normalized) {
    terms.push(`email_normalized.eq.${quoteFilterValue(intro.email_normalized)}`);
  }
  if (intro.phone_normalized && intro.phone_normalized.length >= MIN_GROUP_PHONE_DIGITS) {
    terms.push(`phone_normalized.eq.${quoteFilterValue(intro.phone_normalized)}`);
  }
  return terms.join(',');
}

export const fetchSpamIntros = async (): Promise<Intro[]> => {
  const all: Intro[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('intros')
      .select('*, follow_up_notes (id, note, created_at, staff_name)')
      .eq('is_spam', true)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) {
      throw error;
    }
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) {
      return all;
    }
  }
};

export const countSpamGroup = async (intro: SpamGroupKey, isSpam: boolean): Promise<number> => {
  // spam-gate: allow — count preview for the mark/restore dialog; the is_spam filter is parameterized
  const { count, error } = await supabase
    .from('intros')
    .select('id', { count: 'exact', head: true })
    .or(buildSpamGroupFilter(intro))
    .eq('is_spam', isSpam);
  if (error) {
    throw error;
  }
  return count ?? 0;
};

export const markSpamGroup = async (intro: SpamGroupKey): Promise<string[]> => {
  const { data, error } = await supabase
    .from('intros')
    .update({ is_spam: true, spam_marked_at: new Date().toISOString() })
    .or(buildSpamGroupFilter(intro))
    .eq('is_spam', false)
    .select('id');
  if (error) {
    throw error;
  }
  return (data ?? []).map((row: { id: string }) => row.id);
};

export const undoSpamMark = async (changedIds: string[]): Promise<void> => {
  if (changedIds.length === 0) {
    return;
  }
  const { error } = await supabase
    .from('intros')
    .update({ is_spam: false, spam_marked_at: null })
    .in('id', changedIds);
  if (error) {
    throw error;
  }
};

export const restoreSpamGroup = async (intro: SpamGroupKey): Promise<string[]> => {
  const { data, error } = await supabase
    .from('intros')
    .update({
      is_spam: false,
      spam_marked_at: null,
      spam_warning_dismissed_at: new Date().toISOString(),
    })
    .or(buildSpamGroupFilter(intro))
    .eq('is_spam', true)
    .select('id');
  if (error) {
    throw error;
  }
  return (data ?? []).map((row: { id: string }) => row.id);
};

export const dismissSpamWarning = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('intros')
    .update({ spam_warning_dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw error;
  }
};
