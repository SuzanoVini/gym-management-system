// app/lib/supabase/settings.ts
import { supabase } from './client';

// SETTINGS
export const fetchSettings = async (key: string) => {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();

  if (error) {
    console.error(`Error fetching settings for ${key}:`, error);

    // Fallback defaults if database fails
    const defaults: { [key: string]: any[] } = {
      class_types: [
        'GB1',
        'GB 1/2',
        'GB2',
        'NO Gi',
        'No Gi',
        'Kids 3 - 6 yo',
        'Kids 6 - 8 yo',
        'Kids 7 - 9 yo',
        'Kids All Ages',
        'Kids & Parents',
        'Juniors & Teens',
        "Women's",
        'MUAY THAI',
        'Wrestling',
        'Judo',
        'Jiu-Jitsu Drills',
      ],
      staff_members: [
        'Staff 1',
        'Staff 2',
        'Staff 3',
        'Staff 4',
        'Vinicius',
        'Jun',
        'Staff 7',
        'Staff 8',
        'Staff 9',
        'Staff 10',
        'Staff 11',
        'Staff 12',
      ],
      membership_types: ['Integrity', 'Legacy', 'Special', 'ASP'],
      cancellation_reasons: [
        'No time',
        'Moving',
        'Injury',
        'Medical reason',
        'Financial',
        'No interest',
        'Try new sport',
        'Other Gym',
        'Distance from home',
        'Distance from work',
        'Overdue',
        'Other',
        'No reason',
      ],
      hold_reasons: ['Injury', 'Illness', 'Travel', 'Break Time', 'Work', 'No reason', 'Other'],
      age_categories: ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'],
    };

    return defaults[key] || [];
  }

  return data?.value || [];
};

export const updateSettings = async (key: string, value: any[]) => {
  const { error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error(`Error updating settings for ${key}:`, error);
    throw error;
  }

  return true;
};
