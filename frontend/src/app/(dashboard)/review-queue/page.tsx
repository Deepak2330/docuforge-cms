'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Loader2, CheckCircle, XCircle, MessageSquare, ArrowRight, User } from 'lucide-react';
import { api } from '@/lib/api';

interface Document {
  id: string; title: string; slug: string; status: string; docType: string;
  tags: string[]; updatedAt: string;
  project?: { id: string; name: string };
  createdBy?: { firstName: string; lastName: string };
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  IN_REVIEW:          { label: 'In Review',          color: 'text-yellow-700',  bg: 'bg-yellow-100' },
  CHANGES_REQUESTED:  { label: 'Changes Requested',  color: 'text-orange-700',  bg: 'bg-orange-100' },
  APPROVED:           { label: 'Approved',            color: 'text-green-700',   bg: 'bg-green-100'  },
  DRAFT:              { label: 'Draft',               color: 'text-gray-600',    bg: 'bg-gray-100'   },
  PUBLISHED:          { label: 'Published',           color: 'text-blue-700',    bg: 'bg-blue-100'   },
};

type FilterKey = 'ALL' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED';

export default function ReviewQueuePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('IN_REVIEW');

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const data = await api.get<Document[]>('/documents', token ?? undefined);
      setDocuments(data);
    } catch {
      setError('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const token = getToken();
      await api.patch(`/documents/${id}`, { status }, token ?? undefined);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    } catch {
      setError('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const reviewDocs = documents.filter(d => ['IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'].includes(d.status));
  const draftDocs = documents.filter(d => d.status === 'DRAFT');

  const filtered: Document[] = filter === 'ALL' ? reviewDocs : documents.filter(d => d.status === filter);

  const counts = {
    IN_REVIEW:         documents.filter(d => d.status === 'IN_REVIEW').length,
    CHANGES_REQUESTED: documents.filter(d => d.status === 'CHANGES_REQUESTED').length,
    APPROVED:          documents.filter(d => d.status === 'APPROVED').length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review, approve, or request changes on documents</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {([
          { key: 'IN_REVIEW', label: 'In Review', border: 'border-yellow-200', activeBg: 'bg-yellow-50', text: 'text-yellow-700' },
          { key: 'CHANGES_REQUESTED', label: 'Changes Requested', border: 'border-orange-200', activeBg: 'bg-orange-50', text: 'text-orange-700' },
          { key: 'APPROVED', label: 'Approved', border: 'border-green-200', activeBg: 'bg-green-50', text: 'text-green-700' },
        ] as const).map(({ key, label, border, activeBg, text }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`p-4 rounded-xl border text-left transition-all ${filter === key ? `${activeBg} ${border} shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300'}`}>
            <div className={`text-2xl font-bold ${filter === key ? text : 'text-gray-900'}`}>
              {counts[key]}
            </div>
            <div className={`text-sm mt-0.5 ${filter === key ? text : 'text-gray-500'}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['ALL', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'] as FilterKey[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f === 'ALL' ? `All (${reviewDocs.length})` : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No documents in this state</p>
          {filter === 'IN_REVIEW' && draftDocs.length > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {draftDocs.length} draft{draftDocs.length !== 1 ? 's' : ''} can be submitted for review
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const meta = STATUS_META[doc.status] ?? STATUS_META.DRAFT;
            const isUpdating = updating === doc.id;
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {doc.project && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {doc.project.name}
                        </span>
                      )}
                      {doc.createdBy && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.createdBy.firstName} {doc.createdBy.lastName}
                        </span>
                      )}
                      <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {doc.status !== 'APPROVED' && (
                          <button
                            onClick={() => changeStatus(doc.id, 'APPROVED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {doc.status !== 'CHANGES_REQUESTED' && (
                          <button
                            onClick={() => changeStatus(doc.id, 'CHANGES_REQUESTED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Request Changes
                          </button>
                        )}
                        {doc.status === 'APPROVED' && (
                          <button
                            onClick={() => changeStatus(doc.id, 'IN_REVIEW')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Revert
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drafts that can be submitted */}
      {draftDocs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Drafts — Submit for Review
          </h2>
          <div className="space-y-2">
            {draftDocs.map(doc => (
              <div key={doc.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-700 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400">{doc.project?.name ?? '—'}</p>
                </div>
                <button
                  onClick={() => changeStatus(doc.id, 'IN_REVIEW')}
                  disabled={updating === doc.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
                >
                  {updating === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                  Submit for Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
