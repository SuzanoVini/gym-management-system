import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from './admin';

type AdminClient = ReturnType<typeof createAdminClient>;

type OwnerAuthorizationResult =
  | {
      ok: true;
      user: User;
      admin: AdminClient;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireOwner(): Promise<OwnerAuthorizationResult> {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'owner') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, user, admin };
}
