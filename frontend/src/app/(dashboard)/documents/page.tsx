'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Loader2, X, Eye, EyeOff, Pencil, Trash2, ArrowLeft, Save, Globe, Code2, SplitSquareHorizontal, ExternalLink } from 'lucide-react';
import { marked } from 'marked';
import { api } from '@/lib/api';

marked.setOptions({ breaks: true, gfm: true } as Parameters<typeof marked.setOptions>[0]);

function renderContent(content: string): string {
  if (!content?.trim()) return '';
  // If content starts with an HTML tag → treat as HTML, otherwise parse as Markdown
  const trimmed = content.trim();
  if (trimmed.startsWith('<')) return content;
  return marked(content) as string;
}

interface Project { id: string; name: string; slug: string; workspace: { name: string } }
interface Document {
  id: string; title: string; slug: string; status: string; docType: string;
  tags: string[]; createdAt: string; updatedAt: string; publishedAt?: string;
  project?: { id: string; name: string; slug: string };
  content?: string; description?: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<Document | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', slug: '', description: '', projectId: '', content: '', docType: 'GENERAL', tags: '' });

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const [docs, proj] = await Promise.all([
        api.get<Document[]>('/documents', token ?? undefined),
        api.get<Project[]>('/projects', token ?? undefined),
      ]);
      setDocuments(docs);
      setProjects(proj);
      if (proj.length > 0) setForm(f => ({ ...f, projectId: proj[0].id }));
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleNameChange = (title: string) => {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, title, slug }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId) { setError('Select a project'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = getToken();
      const doc = await api.post<Document>(`/projects/${form.projectId}/documents`, {
        title: form.title, slug: form.slug, description: form.description,
        content: form.content, docType: form.docType,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }, token ?? undefined);
      setShowModal(false);
      setForm(f => ({ ...f, title: '', slug: '', description: '', content: '' }));
      setEditing(doc);
      setView('editor');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditor = async (doc: Document) => {
    try {
      const token = getToken();
      const full = await api.get<Document>(`/documents/${doc.id}`, token ?? undefined);
      setEditing(full);
      setView('editor');
    } catch {
      setError('Failed to load document');
    }
  };

  const saveDocument = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const token = getToken();
      const updated = await api.patch<Document>(`/documents/${editing.id}`, {
        title: editing.title, content: editing.content, description: editing.description,
      }, token ?? undefined);
      setEditing(updated);
      load();
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const token = getToken();
      const isPublished = editing.status === 'PUBLISHED';
      const updated = await api.post<Document>(
        `/documents/${editing.id}/${isPublished ? 'unpublish' : 'publish'}`,
        {}, token ?? undefined
      );
      setEditing(updated);
      load();
    } catch {
      setError('Failed to change publish status');
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const token = getToken();
      await api.delete(`/documents/${id}`, token ?? undefined);
      load();
    } catch {
      setError('Failed to delete document');
    }
  };

  if (view === 'editor' && editing) {
    const isPublished = editing.status === 'PUBLISHED';
    return (
      <div className="flex flex-col" style={{ margin: '-24px', height: 'calc(100vh - 56px)' }}>
        {/* Editor header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b bg-white shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setView('list'); setEditing(null); }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium shrink-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-gray-200">|</span>
            <input
              className="text-base font-semibold text-gray-900 border-none outline-none bg-transparent min-w-0 flex-1"
              value={editing.title}
              onChange={e => setEditing(ed => ed ? { ...ed, title: e.target.value } : ed)}
            />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[editing.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {editing.status}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={togglePublish}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isPublished
                  ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
            {isPublished && (
              <a
                href={`/docs/${editing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Live
              </a>
            )}
            <button
              onClick={saveDocument}
              disabled={saving}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
        {error && <div className="mx-5 mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm shrink-0">{error}</div>}

        {/* Split editor + preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: code editor */}
          <div className="flex flex-col w-1/2 border-r border-gray-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
              <Code2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">HTML / Markdown</span>
            </div>
            <textarea
              className="flex-1 p-5 text-sm font-mono text-gray-800 bg-gray-950 text-green-300 focus:outline-none resize-none leading-relaxed"
              placeholder="<h1>My Document</h1>&#10;<p>Write your content in HTML or plain text…</p>"
              value={editing.content ?? ''}
              onChange={e => setEditing(ed => ed ? { ...ed, content: e.target.value } : ed)}
              spellCheck={false}
            />
          </div>

          {/* Right: live preview */}
          <div className="flex flex-col w-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Preview</span>
              {isPublished && (
                <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                  Published
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-white">
              {editing.content?.trim() ? (
                <>
                  <style>{`
                    .doc-preview h1{font-size:2em;font-weight:700;margin:0 0 .5em;line-height:1.25;color:#111827}
                    .doc-preview h2{font-size:1.5em;font-weight:600;margin:1.5em 0 .5em;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:.3em}
                    .doc-preview h3{font-size:1.2em;font-weight:600;margin:1.25em 0 .4em;color:#1f2937}
                    .doc-preview h4,h5,h6{font-size:1em;font-weight:600;margin:1em 0 .3em;color:#374151}
                    .doc-preview p{margin:0 0 1em;color:#374151}
                    .doc-preview ul{list-style:disc;padding-left:1.5em;margin:0 0 1em}
                    .doc-preview ol{list-style:decimal;padding-left:1.5em;margin:0 0 1em}
                    .doc-preview li{margin:.25em 0;color:#374151}
                    .doc-preview a{color:#2563eb;text-decoration:underline}
                    .doc-preview a:hover{color:#1d4ed8}
                    .doc-preview code{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;padding:.1em .35em;font-size:.875em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#dc2626}
                    .doc-preview pre{background:#1e293b;color:#e2e8f0;border-radius:8px;padding:1.25em 1.5em;overflow-x:auto;margin:0 0 1.25em;font-size:.875em;line-height:1.7}
                    .doc-preview pre code{background:none;border:none;padding:0;color:inherit;font-size:inherit}
                    .doc-preview blockquote{border-left:4px solid #e5e7eb;padding:.5em 1em;margin:0 0 1em;color:#6b7280;font-style:italic}
                    .doc-preview table{width:100%;border-collapse:collapse;margin:0 0 1.25em;font-size:.9em}
                    .doc-preview th{background:#f9fafb;border:1px solid #e5e7eb;padding:.5em 1em;text-align:left;font-weight:600;color:#374151}
                    .doc-preview td{border:1px solid #e5e7eb;padding:.5em 1em;color:#374151}
                    .doc-preview tr:nth-child(even) td{background:#f9fafb}
                    .doc-preview img{max-width:100%;border-radius:8px;margin:.5em 0}
                    .doc-preview hr{border:none;border-top:1px solid #e5e7eb;margin:1.5em 0}
                    .doc-preview strong{font-weight:600;color:#111827}
                    .doc-preview em{font-style:italic}
                  `}</style>
                  <div
                    className="doc-preview px-10 py-8 max-w-3xl mx-auto"
                    style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', lineHeight: '1.75', fontSize: '15px' }}
                    dangerouslySetInnerHTML={{ __html: renderContent(editing.content ?? '') }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300">
                  <SplitSquareHorizontal className="w-10 h-10 mb-3" />
                  <p className="text-sm">Start typing to see a live preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your documentation</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No documents yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first document to start writing</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            <Plus className="w-4 h-4" /> New Document
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Project</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <button onClick={() => openEditor(doc)} className="font-medium text-gray-900 hover:text-blue-600 text-left">
                      {doc.title}
                    </button>
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {doc.tags.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{doc.project?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => openEditor(doc)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Pencil className="w-3.5 h-3.5" />
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">New Document</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={e => handleNameChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Getting Started Guide" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input type="text" required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="getting-started" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['GENERAL','USER_GUIDE','API_REFERENCE','TUTORIAL','TROUBLESHOOTING','RELEASE_NOTE','INSTALLATION_GUIDE','CONFIGURATION_GUIDE','CODE_SAMPLE'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="api, guide, v2" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
