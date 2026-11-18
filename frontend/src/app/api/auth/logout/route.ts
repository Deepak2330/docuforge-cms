import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('docuforge_access_token')?.value;
  const refreshToken = cookieStore.get('docuforge_refresh_token')?.value;

  // Revoke refresh token server-side (refresh cookie is httpOnly; client JS cannot send it).
  if (accessToken) {
    try {
      await fetch(`${INTERNAL_API}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Still clear local session even if backend logout fails
    }
  }

  cookieStore.delete('docuforge_access_token');
  cookieStore.delete('docuforge_refresh_token');
  cookieStore.delete('docuforge_user');
  return NextResponse.json({ success: true });
}
