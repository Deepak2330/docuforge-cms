'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Loader2, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface Project { id: string; name: string; }
interface ReleaseNote {
  id: string; title: string; version: string; releaseDate: string; isPublished: boolean;
  features: string[]; improvements: string[]; bugFixes: string[]; breakingChanges: string[];
  content?: string; project?: { id: string; name: string };
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function ReleaseNotesPage() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    projectId: '', title: '', version: '', releaseDate: new Date().toISOString().split('T')[0],
    features: '', improvements: '', bugFixes: '', breakingChanges: '', content: '', isPublished: false,
  });

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const [rn, proj] = await Promise.all([
        api.get<ReleaseNote[]>('/release-notes', token ?? undefined),
        api.get<Project[]>('/projects', token ?? undefined),
      ]);
      setNotes(rn);
      setProjects(proj);
      if (proj.length > 0) setForm(f => ({ ...f, projectId: proj[0].id }));
    } catch {
      setError('Failed to load release notes');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const splitLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = getToken();
      await api.post(`/projects/${form.projectId}/release-notes`, {
        title: form.title, version: form.version, releaseDate: form.releaseDate,
        features: splitLines(form.features), improvements: splitLines(form.improvements),
        bugFixes: splitLines(form.bugFixes), breakingChanges: splitLines(form.breakingChanges),
        content: form.content, isPublished: form.isPublished,
      }, token ?? undefined);
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create release note');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this release note?')) return;
    try {
      const token = getToken();
      await api.delete(`/release-notes/${id}`, token ?? undefined);
      load();
    } catch { setError('Failed to delete'); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Release Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Track product releases and changelog</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
          <Plus className="w-4 h-4" /> New Release
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No release notes yet</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            <Plus className="w-4 h-4" /> New Release
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded font-mono">v{note.version}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{note.title}</p>
                    <p className="text-xs text-gray-400">{note.project?.name} · {new Date(note.releaseDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${note.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {note.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} className="p-1 text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expanded === note.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expanded === note.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                  {[
                    { key: 'features', label: '✨ Features', items: note.features, color: 'text-green-700' },
                    { key: 'improvements', label: '🔧 Improvements', items: note.improvements, color: 'text-blue-700' },
                    { key: 'bugFixes', label: '🐛 Bug Fixes', items: note.bugFixes, color: 'text-yellow-700' },
                    { key: 'breakingChanges', label: '⚠️ Breaking Changes', items: note.breakingChanges, color: 'text-red-700' },
                  ].filter(s => s.items.length > 0).map(section => (
                    <div key={section.key}>
                      <h4 className={`text-sm font-semibold mb-2 ${section.color}`}>{section.label}</h4>
                      <ul className="space-y-1">
                        {section.items.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-gray-300">•</span>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {note.content && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">New Release Note</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-auto max-h-[80vh]">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="v2.0 Release" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
                  <input type="text" required value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2.0.0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Release Date *</label>
                <input type="date" required value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {[
                { key: 'features' as const, label: '✨ Features (one per line)' },
                { key: 'improvements' as const, label: '🔧 Improvements (one per line)' },
                { key: 'bugFixes' as const, label: '🐛 Bug Fixes (one per line)' },
                { key: 'breakingChanges' as const, label: '⚠️ Breaking Changes (one per line)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pub" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                <label htmlFor="pub" className="text-sm text-gray-700">Publish immediately</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
