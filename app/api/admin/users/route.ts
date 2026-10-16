import { NextResponse } from 'next/server';
import { isUserRole, type UserRole } from '@/admin/page/roles';
import { reportConsoleError } from '@/lib/logger';
import { requireOwner } from '@/lib/supabase/authorization';

export async function GET() {
  try {
    const authorization = await requireOwner();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { admin } = authorization;
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: profiles, error: profilesError } = await admin
      .from('user_profiles')
      .select('id, role');
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }
    const roles = new Map((profiles ?? []).map((p) => [p.id as string, p.role as UserRole]));

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: (u.user_metadata?.full_name as string) ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      role: roles.get(u.id) ?? 'staff',
    }));

    return NextResponse.json({ users });
  } catch (error) {
    reportConsoleError('Error listing users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireOwner();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { admin } = authorization;
    const parsed = parseCreateBody(await request.json());
    if (parsed instanceof NextResponse) {
      return parsed;
    }
    const { email, password, full_name, role } = parsed;

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (role === 'owner') {
      const failure = await promoteToOwner(admin, newUser.user.id);
      if (failure) {
        return failure;
      }
    }

    return NextResponse.json({
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        created_at: newUser.user.created_at,
        last_sign_in_at: null,
        role,
      },
    });
  } catch (error) {
    reportConsoleError('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// New profiles start as staff (DB trigger); only the service role may promote.
async function promoteToOwner(
  admin: Extract<Awaited<ReturnType<typeof requireOwner>>, { ok: true }>['admin'],
  id: string
): Promise<NextResponse | null> {
  const { error } = await admin.from('user_profiles').update({ role: 'owner' }).eq('id', id);
  if (!error) {
    return null;
  }
  return NextResponse.json(
    { error: `Account created as staff, but setting owner failed: ${error.message}` },
    { status: 500 }
  );
}

function parseCreateBody(raw: unknown) {
  const body = (raw ?? {}) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: unknown;
  };
  const { email, password, full_name } = body;
  const role = body.role ?? 'staff';
  if (!isUserRole(role)) {
    return NextResponse.json({ error: 'role must be owner or staff' }, { status: 400 });
  }
  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: 'email, password, and full_name are required' },
      { status: 400 }
    );
  }
  return { email, password, full_name, role };
}
