import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('docuforge_access_token')?.value;

  const path = params.path.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${INTERNAL_API}/api/v1/${path}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE' && request.method !== 'HEAD') {
    body = await request.text();
  }

  const backendRes = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  if (backendRes.status === 204 || backendRes.status === 205) {
    return new NextResponse(null, { status: backendRes.status });
  }

  const data = await backendRes.json().catch(() => ({}));
  if (backendRes.status >= 400) {
    console.error(`[x-proxy] ${request.method} ${targetUrl} → ${backendRes.status}`, JSON.stringify(data));
  }
  return NextResponse.json(data, { status: backendRes.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}
