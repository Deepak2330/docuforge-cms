'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Users, FileText, Loader2, X, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Workspace { id: string; name: string; slug: string; }
interface Project {
  id: string; name: string; slug: string; description?: string; isPublic: boolean;
  workspace: { id: string; name: string; slug: string };
  _count: { documents: number; members: number };
  createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', description: '', workspaceId: '', isPublic: false });
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const [proj, ws] = await Promise.all([
        api.get<Project[]>('/projects', token ?? undefined),
        api.get<Workspace[]>('/workspaces', token ?? undefined),
      ]);
      setProjects(proj);
      setWorkspaces(ws);
      if (ws.length > 0 && !form.workspaceId) {
        setForm(f => ({ ...f, workspaceId: ws[0].id }));
      }
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workspaceId) { setError('Select a workspace'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = getToken();
      await api.post(`/workspaces/${form.workspaceId}/projects`, {
        name: form.name,
        slug: form.slug,
        description: form.description,
        isPublic: form.isPublic,
      }, token ?? undefined);
      setShowModal(false);
      setForm(f => ({ ...f, name: '', slug: '', description: '', isPublic: false }));
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = getToken();
      await api.delete(`/projects/${deleteTarget.id}`, token ?? undefined);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage documentation projects across workspaces</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to start writing documentation</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="relative group">
              <Link href={`/projects/${p.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 truncate">{p.name}</h3>
                    <span className="text-xs text-gray-400">{p.workspace.name} / {p.slug}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 shrink-0 transition-colors" />
                </div>
                {p.description && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {p._count.documents} doc{p._count.documents !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {p._count.members} member{p._count.members !== 1 ? 's' : ''}
                  </span>
                  {p.isPublic && (
                    <span className="ml-auto px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">Public</span>
                  )}
                </div>
              </div>
              </Link>
              <button
                onClick={e => { e.preventDefault(); setDeleteTarget(p); }}
                className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white rounded z-10"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Delete Project</h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-medium text-gray-700">{deleteTarget.name}</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workspace *</label>
                <select
                  required
                  value={form.workspaceId}
                  onChange={e => setForm(f => ({ ...f, workspaceId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My API Docs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text" required value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-api-docs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="isPublic"
                  checked={form.isPublic}
                  onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">Make project publicly visible</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
