import { NextResponse } from 'next/server';
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
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authorization = await requireOwner();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { admin } = authorization;
    const body = (await request.json()) as { password?: string };
    const { password } = body;
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
