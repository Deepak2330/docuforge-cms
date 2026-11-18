'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Code2, Zap, Eye, Trash2,
  Loader2, Plus, BookOpen, Globe, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Project {
  id: string; name: string; slug: string; description?: string; isPublic: boolean;
  workspace: { id: string; name: string };
  _count: { documents: number; members: number };
  createdAt: string;
}

interface Document {
  id: string; title: string; slug: string; status: string; docType: string;
  tags: string[]; updatedAt: string;
}

interface ApiSpec {
  id: string; title: string; version: string; description?: string;
  _count: { versions: number }; createdAt: string;
}

interface GraphqlSchema {
  id: string; title: string; description?: string;
  _count: { versions: number }; createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-600',
  APPROVED: 'bg-blue-100 text-blue-700',
};

type Tab = 'documents' | 'api-specs' | 'graphql';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [apiSpecs, setApiSpecs] = useState<ApiSpec[]>([]);
  const [graphqlSchemas, setGraphqlSchemas] = useState<GraphqlSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('documents');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = getToken();
      const [proj, docs, specs, gql] = await Promise.all([
        api.get<Project>(`/projects/${id}`, token ?? undefined),
        api.get<Document[]>(`/projects/${id}/documents`, token ?? undefined),
        api.get<ApiSpec[]>(`/projects/${id}/api-specs`, token ?? undefined),
        api.get<GraphqlSchema[]>(`/projects/${id}/graphql-schemas`, token ?? undefined),
      ]);
      setProject(proj);
      setDocuments(docs);
      setApiSpecs(specs);
      setGraphqlSchemas(gql);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const deleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const token = getToken();
      await api.delete(`/documents/${docId}`, token ?? undefined);
      setDocuments(d => d.filter(x => x.id !== docId));
    } catch { setError('Failed to delete document'); }
  };

  const deleteSpec = async (specId: string) => {
    if (!confirm('Delete this API spec?')) return;
    try {
      const token = getToken();
      await api.delete(`/api-specs/${specId}`, token ?? undefined);
      setApiSpecs(s => s.filter(x => x.id !== specId));
    } catch { setError('Failed to delete spec'); }
  };

  const deleteSchema = async (schemaId: string) => {
    if (!confirm('Delete this GraphQL schema?')) return;
    try {
      const token = getToken();
      await api.delete(`/graphql-schemas/${schemaId}`, token ?? undefined);
      setGraphqlSchemas(s => s.filter(x => x.id !== schemaId));
    } catch { setError('Failed to delete schema'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-500">
        {error || 'Project not found'}
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: React.ElementType; color: string }[] = [
    { key: 'documents', label: 'Documents', count: documents.length, icon: FileText, color: 'text-blue-600' },
    { key: 'api-specs', label: 'API Specs', count: apiSpecs.length, icon: Code2, color: 'text-orange-500' },
    { key: 'graphql', label: 'GraphQL', count: graphqlSchemas.length, icon: Zap, color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {project.isPublic
                    ? <><Globe className="w-3.5 h-3.5 text-green-500" /> Public</>
                    : <><Lock className="w-3.5 h-3.5 text-gray-400" /> Private</>
                  }
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {project.workspace.name} / <span className="font-mono">{project.slug}</span>
              </p>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className={`w-4 h-4 ${tab === t.key ? t.color : ''}`} />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Documents tab */}
      {tab === 'documents' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => router.push('/documents')}
              className="flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" /> New Document
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No documents yet</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{doc.docType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(doc.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => router.push(`/documents`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteDocument(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Specs tab */}
      {tab === 'api-specs' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => router.push('/api-reference')}
              className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" /> Upload Spec
            </button>
          </div>
          {apiSpecs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <Code2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No API specs yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiSpecs.map(spec => (
                <div key={spec.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                      <Code2 className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{spec.title}</h3>
                      <p className="text-xs text-gray-400">v{spec.version} · {spec._count.versions} version{spec._count.versions !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {spec.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{spec.description}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{new Date(spec.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => router.push('/api-reference')} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteSpec(spec.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GraphQL tab */}
      {tab === 'graphql' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => router.push('/graphql')}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> Upload Schema
            </button>
          </div>
          {graphqlSchemas.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <Zap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No GraphQL schemas yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graphqlSchemas.map(schema => (
                <div key={schema.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{schema.title}</h3>
                      <p className="text-xs text-gray-400">{schema._count.versions} version{schema._count.versions !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {schema.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{schema.description}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{new Date(schema.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => router.push('/graphql')} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteSchema(schema.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
