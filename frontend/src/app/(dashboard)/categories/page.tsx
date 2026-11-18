'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderOpen, Loader2, X, Trash2, Edit2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Project { id: string; name: string; }
interface Category {
  id: string; name: string; slug: string; description?: string; sortOrder: number;
  parent?: { id: string; name: string } | null;
  children?: Category[];
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', description: '', parentId: '', sortOrder: '0' });

  const loadProjects = useCallback(async () => {
    try {
      const token = getToken();
      const proj = await api.get<Project[]>('/projects', token ?? undefined);
      setProjects(proj);
      if (proj.length > 0) setSelectedProject(proj[0].id);
    } catch {
      setError('Failed to load projects');
    }
  }, []);

  const loadCategories = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = getToken();
      const cats = await api.get<Category[]>(`/projects/${projectId}/categories`, token ?? undefined);
      setCategories(cats);
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selectedProject) loadCategories(selectedProject); }, [selectedProject, loadCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', parentId: '', sortOrder: '0' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '', parentId: cat.parent?.id ?? '', sortOrder: String(cat.sortOrder) });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = {
      name: form.name, slug: form.slug,
      description: form.description || undefined,
      parentId: form.parentId || undefined,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    try {
      const token = getToken();
      if (editing) {
        await api.put(`/projects/${selectedProject}/categories/${editing.id}`, payload, token ?? undefined);
      } else {
        await api.post(`/projects/${selectedProject}/categories`, payload, token ?? undefined);
      }
      setShowModal(false);
      loadCategories(selectedProject);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Documents in it will become uncategorized.')) return;
    try {
      const token = getToken();
      await api.delete(`/projects/${selectedProject}/categories/${id}`, token ?? undefined);
      loadCategories(selectedProject);
    } catch { setError('Failed to delete'); }
  };

  const topLevel = categories.filter(c => !c.parent);
  const children = (parentId: string) => categories.filter(c => c.parent?.id === parentId);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organize documentation into categories</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {projects.length > 1 && (
        <div className="mb-4">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No categories yet</p>
          <button onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            <Plus className="w-4 h-4" /> New Category
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {topLevel.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{cat.slug}{cat.description ? ` — ${cat.description}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {children(cat.id).map(child => (
                <div key={child.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 ml-8 mt-1">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{child.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{child.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(child)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteCategory(child.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input type="text" required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">None (top-level)</option>
                  {topLevel.filter(c => c.id !== editing?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
