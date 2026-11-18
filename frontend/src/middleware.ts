import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public portal is intentionally unauthenticated (README / product feature).
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/portal'];
const AUTH_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('docuforge_access_token')?.value;

  // If accessing auth routes while already logged in, redirect to dashboard
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // If accessing protected routes without token, redirect to login
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (!isPublic && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|x-proxy|_next/static|_next/image|favicon.ico|public).*)'],
};
