import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, tokens } = body;

    if (!user || !tokens) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Access token must be readable by client JS (dashboard getToken / TopBar).
    // Refresh token stays httpOnly.
    cookieStore.set('docuforge_access_token', tokens.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    cookieStore.set('docuforge_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    cookieStore.set('docuforge_user', JSON.stringify(user), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('docuforge_access_token');
  cookieStore.delete('docuforge_refresh_token');
  cookieStore.delete('docuforge_user');
  return NextResponse.json({ success: true });
}
