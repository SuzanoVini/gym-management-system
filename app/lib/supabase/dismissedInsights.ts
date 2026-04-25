// app/lib/supabase/dismissedInsights.ts

import { supabase } from './client';

export type InsightAction = 'done' | 'snoozed' | 'dismissed';

export interface DismissedInsight {
  id: string;
  user_id: string;
  insight_id: string;
  action: InsightAction;
  snoozed_until: string | null;
  dismissed_at: string;
  data_hash: string;
  created_at: string;
}

export interface UpsertDismissedInsightData {
  insight_id: string;
  action: InsightAction;
  data_hash: string;
  snoozed_until?: string | null;
}

export const fetchDismissedInsights = async (): Promise<DismissedInsight[]> => {
  const { data, error } = await supabase
    .from('dismissed_insights')
    .select('*')
    .order('dismissed_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

export const upsertDismissedInsight = async (
  record: UpsertDismissedInsightData
): Promise<DismissedInsight> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('dismissed_insights')
    .upsert(
      {
        user_id: user.id,
        insight_id: record.insight_id,
        action: record.action,
        data_hash: record.data_hash,
        snoozed_until: record.snoozed_until ?? null,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,insight_id' }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const restoreInsight = async (insightId: string): Promise<void> => {
  const { error } = await supabase.from('dismissed_insights').delete().eq('insight_id', insightId);

  if (error) {
    throw error;
  }
};
