'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const RedocStandalone = dynamic(
  () => import('redoc').then(m => m.RedocStandalone),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    ),
  }
);

interface ApiGroup {
  id: string;
  name: string;
  slug: string;
  apis: { api: { id: string; name: string; slug: string; specType: string; specVersion?: string; spec?: { id: string; title: string; version: string } | null } }[];
}

interface ApiSpec {
  id: string;
  title: string;
  version: string;
  versions: { id: string; version: string; specContent: unknown; isPublished: boolean }[];
}

function getToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const REDOC_OPTIONS = {
  scrollYOffset: 56,
  hideDownloadButton: false,
  nativeScrollbars: true,
  hideLoading: true,
  theme: {
    colors: { primary: { main: '#2563eb' } },
    typography: {
      fontSize: '14px',
      lineHeight: '1.6',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '600' },
      code: { fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    },
    sidebar: { width: '280px', backgroundColor: '#0f172a', textColor: '#d1d5db' },
    rightPanel: { backgroundColor: '#1e293b', textColor: '#e2e8f0', width: '40%' },
  },
};

export default function PortalApiPage() {
  const { groupSlug, apiSlug } = useParams<{ groupSlug: string; apiSlug: string }>();
  const [spec, setSpec] = useState<unknown>(null);
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [apiName, setApiName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    api.get<ApiGroup[]>('/api-groups', token ?? undefined)
      .then(async groups => {
        const g = groups.find(gr => gr.slug === groupSlug);
        if (!g) { setError('Group not found'); return; }
        setGroup(g);
        const entry = g.apis.find(({ api: a }) => a.slug === apiSlug);
        if (!entry) { setError('API not found'); return; }
        setApiName(entry.api.name);
        if (!entry.api.spec) { setError('No spec linked to this API'); return; }
        const full = await api.get<ApiSpec>(`/api-specs/${entry.api.spec.id}`, token ?? undefined);
        const content = full.versions?.find(v => v.isPublished)?.specContent ?? full.versions?.[0]?.specContent;
        if (!content) { setError('No spec content available'); return; }
        setSpec(content);
      })
      .catch(() => setError('Failed to load API'))
      .finally(() => setLoading(false));
  }, [groupSlug, apiSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-500 font-medium">{error}</p>
        <Link href="/portal" className="text-sm text-blue-600 hover:underline">← Back to API Reference</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <header className="shrink-0 sticky top-0 z-50" style={{ background: '#0f172a' }}>
        <div className="px-6 py-3.5 flex items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-semibold hidden sm:inline">Developer Portal</span>
          </div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 ml-2 min-w-0">
            <Link href="/portal" className="hover:text-white transition-colors whitespace-nowrap">API Reference</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <Link href={`/portal/${groupSlug}`} className="hover:text-white transition-colors truncate max-w-32">{group?.name}</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-white font-medium truncate">{apiName}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shrink-0"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Live
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {spec && <RedocStandalone spec={spec as Record<string, unknown>} options={REDOC_OPTIONS} />}
      </div>
    </div>
  );
}
