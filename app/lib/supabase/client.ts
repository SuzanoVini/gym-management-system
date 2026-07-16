// app/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// The deprecated auth-helpers wrapper cannot carry a schema generic with the
// current supabase-js: with the generated Database type it collapses every
// table to `never` (with the previous hand-written type it silently degraded
// to `any`, which is what the app has always effectively run with). The
// untyped client preserves that behavior explicitly. Typed queries return
// when the client migrates to @supabase/ssr.
export const supabase = createClientComponentClient();
