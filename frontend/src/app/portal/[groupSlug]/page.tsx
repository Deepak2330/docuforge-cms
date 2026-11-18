'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layers, Link2, Loader2, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface ApiEntry {
  id: string;
  name: string;
  slug: string;
  description?: string;
  specType: string;
  specVersion?: string;
  spec?: { id: string; title: string; version: string } | null;
}

interface ApiGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  apis: { api: ApiEntry }[];
}

function getToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function PortalGroupPage() {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ApiGroup[]>('/api-groups', getToken() ?? undefined)
      .then(groups => {
        const found = groups.find(g => g.slug === groupSlug);
        if (!found) setError('Group not found');
        else setGroup(found);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [groupSlug]);

  const apisWithSpec = group?.apis.filter(a => a.api.spec) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50" style={{ background: '#0f172a' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">Developer Portal</span>
          </div>
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/portal" className="hover:text-white transition-colors">API Reference</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white">{group?.name ?? '...'}</span>
          </nav>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-32 text-red-500">{error}</div>
      ) : group ? (
        <>
          <div className="py-12" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
            <div className="max-w-6xl mx-auto px-6">
              <Link href="/portal" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> All Groups
              </Link>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <Layers className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{group.name}</h1>
                  {group.description && <p className="text-gray-300 mt-1">{group.description}</p>}
                  <p className="text-gray-400 text-sm mt-1">
                    {apisWithSpec.length} API{apisWithSpec.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-10">
            {apisWithSpec.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No published APIs in this group yet.</div>
            ) : (
              <div className="space-y-3">
                {apisWithSpec.map(({ api: a }) => (
                  <Link key={a.id} href={`/portal/${group.slug}/${a.slug}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-5 hover:shadow-md hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: a.specType === 'GraphQL' ? '#f5f3ff' : '#eff6ff' }}>
                        <Link2 className="w-5 h-5" style={{ color: a.specType === 'GraphQL' ? '#7c3aed' : '#2563eb' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{a.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.specType === 'GraphQL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {a.specType}
                          </span>
                          {(a.specVersion || a.spec?.version) && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              v{a.specVersion || a.spec?.version}
                            </span>
                          )}
                        </div>
                        {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
                        {a.spec && <p className="text-xs text-gray-400 mt-0.5">{a.spec.title}</p>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
