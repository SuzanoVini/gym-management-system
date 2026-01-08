import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Auth routes
  const isAuthRoute =
    req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/reset-password');

  // Protected routes - exclude auth routes
  const protectedRoutes = ['/'];
  const isProtectedRoute =
    protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route)) && !isAuthRoute;

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && session) {
    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
