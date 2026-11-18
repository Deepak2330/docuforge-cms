'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ApiGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  apis: { api: { id: string; spec?: { id: string } | null } }[];
}

function getToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function PortalPage() {
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiGroup[]>('/api-groups', getToken() ?? undefined)
      .then(data => setGroups(data.filter(g => g.apis.some(a => a.api.spec))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <span className="text-sm text-gray-400">API Reference</span>
        </div>
      </header>

      <div className="py-16" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">API Reference</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Browse our APIs organized by product groups. Click a group to explore the APIs it contains.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Layers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-medium">No API groups published yet.</p>
            <p className="text-sm mt-1 text-gray-400">Create API groups and link APIs with specs to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(g => {
              const count = g.apis.filter(a => a.api.spec).length;
              return (
                <Link key={g.id} href={`/portal/${g.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                      <Layers className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-blue-700 truncate">{g.name}</h2>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">
                        {g.description || 'Browse the APIs in this group.'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">{count} API{count !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          Explore <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
