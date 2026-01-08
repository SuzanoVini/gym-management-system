// lib/config.ts
export const config = {
  app: {
    name: 'GB Kitsilano Management',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },

  pagination: {
    defaultPageSize: 100,
    maxPageSize: 500,
  },

  dateFormat: {
    display: 'MMM DD, YYYY',
    input: 'YYYY-MM-DD',
  },

  months: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const,

  defaultSettings: {
    classTypes: ['GB1', 'GB2', 'GB3', 'Muay Thai', 'Kids 3-6', 'Kids 7-9', 'No-Gi'],
    staffMembers: ['Staff 1', 'Staff 4', 'Staff 2'],
  },
};

// Validate required env vars on startup
if (typeof window === 'undefined') {
  // Only validate on server-side
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing required environment variables:');
    if (!config.supabase.url) {
      console.error('- NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!config.supabase.anonKey) {
      console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    throw new Error('Missing required environment variables. Check .env.local file.');
  }
}

export type Month = (typeof config.months)[number];
