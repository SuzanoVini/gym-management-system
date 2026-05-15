import { NextResponse } from 'next/server';
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

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: (u.user_metadata?.full_name as string) ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
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
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    const { email, password, full_name } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'email, password, and full_name are required' },
        { status: 400 }
      );
    }

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        created_at: newUser.user.created_at,
        last_sign_in_at: null,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
