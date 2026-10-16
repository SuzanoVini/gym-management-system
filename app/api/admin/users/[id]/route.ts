import { NextResponse } from 'next/server';
import { isUserRole } from '@/admin/page/roles';
import { reportConsoleError } from '@/lib/logger';
import { requireOwner } from '@/lib/supabase/authorization';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authorization = await requireOwner();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { admin, user } = authorization;
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account from here' },
        { status: 400 }
      );
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    reportConsoleError('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Body is either { password } (reset) or { role } (change role).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authorization = await requireOwner();
    if (!authorization.ok) {
      return authorization.response;
    }

    const body = (await request.json()) as { password?: string; role?: unknown };
    if (body.role !== undefined) {
      return changeRole(authorization, id, body.role);
    }
    return resetPassword(authorization.admin, id, body.password);
  } catch (error) {
    reportConsoleError('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

type Authorized = Extract<Awaited<ReturnType<typeof requireOwner>>, { ok: true }>;

async function changeRole({ admin, user }: Authorized, id: string, role: unknown) {
  if (!isUserRole(role)) {
    return NextResponse.json({ error: 'role must be owner or staff' }, { status: 400 });
  }
  // Blocking self-changes also guarantees at least one owner always remains.
  if (user.id === id) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }
  const { error } = await admin.from('user_profiles').update({ role }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, role });
}

async function resetPassword(admin: Authorized['admin'], id: string, password?: string) {
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
