import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('docuforge_access_token');
  cookieStore.delete('docuforge_refresh_token');
  cookieStore.delete('docuforge_user');
  return NextResponse.json({ success: true });
}
