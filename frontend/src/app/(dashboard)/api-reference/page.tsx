'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus, Code2, Loader2, X, Upload, Eye, ArrowLeft, Trash2,
  Layers, Link2, Search, ChevronRight, Edit2, Globe,
} from 'lucide-react';
import { api } from '@/lib/api';

const RedocStandalone = dynamic(
  () => import('redoc').then(m => m.RedocStandalone),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> }
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; slug: string; workspace: { name: string } }
interface ApiSpec {
  id: string; title: string; description?: string; version: string;
  project: { id: string; name: string; slug: string };
  _count: { versions: number };
  versions: Array<{ id: string; version: string; specContent: unknown; specFormat: string; isPublished: boolean; createdAt: string }>;
  createdAt: string;
}
interface ApiEntry {
  id: string; name: string; slug: string; description?: string;
  specType: string; specVersion?: string;
  spec?: { id: string; title: string; version: string } | null;
  project: { id: string; name: string };
  _count: { groups: number };
  createdAt: string;
}
interface ApiGroup {
  id: string; name: string; slug: string; description?: string;
  project: { id: string; name: string };
  parent?: { id: string; name: string } | null;
  children: { id: string; name: string; slug: string }[];
  apis: { api: { id: string; name: string; slug: string; specType: string; spec?: { id: string; title: string; version: string } | null } }[];
  _count: { apis: number; children: number };
  createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const REDOC_OPTIONS = {
  scrollYOffset: 56, hideDownloadButton: false, nativeScrollbars: true, hideLoading: true,
  theme: {
    colors: { primary: { main: '#f97316' } },
    typography: {
      fontSize: '14px', lineHeight: '1.6', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '600' },
      code: { fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    },
    sidebar: { width: '280px', backgroundColor: '#111827', textColor: '#d1d5db' },
    rightPanel: { backgroundColor: '#1e293b', textColor: '#e2e8f0', width: '40%' },
  },
};

type MainTab = 'api-specs' | 'apis' | 'api-groups';

// ─── Live Portal View ─────────────────────────────────────────────────────────

function LivePortalView({ groups, onBack }: { groups: ApiGroup[]; onBack: () => void }) {
  const [selectedEntry, setSelectedEntry] = useState<{ apiId: string; specId: string; name: string; groupName: string } | null>(null);
  const [spec, setSpec] = useState<unknown>(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [specError, setSpecError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.map(g => g.id)));

  const selectApi = async (entry: { apiId: string; specId: string; name: string; groupName: string }) => {
    if (selectedEntry?.apiId === entry.apiId) return;
    setSelectedEntry(entry);
    setSpec(null);
    setSpecError('');
    setLoadingSpec(true);
    try {
      const full = await api.get<ApiSpec>(`/api-specs/${entry.specId}`, getToken() ?? undefined);
      const content = full.versions?.find(v => v.isPublished)?.specContent ?? full.versions?.[0]?.specContent;
      setSpec(content);
    } catch { setSpecError('Failed to load spec'); }
    finally { setLoadingSpec(false); }
  };

  const toggleGroup = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const groupsWithSpecs = groups.filter(g => g.apis.some(({ api: a }) => a.spec));

  return (
    <div className="flex" style={{ height: 'calc(100vh - 56px)', margin: '-24px' }}>
      {/* Sidebar */}
      <div className="flex flex-col shrink-0 overflow-y-auto" style={{ width: 272, background: '#111827', borderRight: '1px solid #1f2937' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: '#1f2937' }}>
          <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="text-gray-600 mx-1">|</span>
          <span className="text-white font-semibold text-sm flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-green-400" /> Live Portal
          </span>
        </div>
        <div className="flex-1 py-2">
          {groupsWithSpecs.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-500 italic">No groups with linked specs yet.</p>
          ) : groupsWithSpecs.map(g => (
            <div key={g.id}>
              <button
                onClick={() => toggleGroup(g.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 transition-transform shrink-0" style={{ transform: expanded.has(g.id) ? 'rotate(90deg)' : 'none' }} />
                <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-gray-200 text-sm font-medium truncate flex-1">{g.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{g.apis.filter(({ api: a }) => a.spec).length}</span>
              </button>
              {expanded.has(g.id) && g.apis.filter(({ api: a }) => a.spec).map(({ api: a }) => (
                <button
                  key={a.id}
                  onClick={() => selectApi({ apiId: a.id, specId: a.spec!.id, name: a.name, groupName: g.name })}
                  className="w-full flex items-center gap-2 pl-10 pr-4 py-2 text-left transition-colors"
                  style={{ background: selectedEntry?.apiId === a.id ? '#1e3a8a' : 'transparent' }}
                >
                  <Link2 className="w-3 h-3 shrink-0" style={{ color: a.specType === 'GraphQL' ? '#a855f7' : '#f97316' }} />
                  <span className="text-sm truncate" style={{ color: selectedEntry?.apiId === a.id ? '#fff' : '#9ca3af', fontWeight: selectedEntry?.apiId === a.id ? 600 : 400 }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-auto flex flex-col">
        {!selectedEntry ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Globe className="w-12 h-12 text-gray-200" />
            <p className="font-medium text-gray-600">Select an API from the sidebar</p>
            <p className="text-sm text-gray-400">Expand a group and click an API name to render its live portal</p>
          </div>
        ) : loadingSpec ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : specError ? (
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm">{specError}</div>
        ) : spec ? (
          <>
            <div className="px-5 py-2.5 border-b bg-white shrink-0 flex items-center gap-2 text-sm">
              <span className="text-gray-400">{selectedEntry.groupName}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <span className="font-semibold text-gray-800">{selectedEntry.name}</span>
              <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" /> Live
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <RedocStandalone spec={spec as Record<string, unknown>} options={REDOC_OPTIONS} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Redoc viewer ─────────────────────────────────────────────────────────────

function RedocViewer({ spec, onBack, title, subtitle }: { spec: unknown; onBack: () => void; title: string; subtitle?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="flex flex-col" style={{ margin: '-24px', height: 'calc(100vh - 56px)' }}>
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0 shadow-sm z-20" style={{ position: 'sticky', top: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-gray-200">|</span>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
          Live Portal
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {err
          ? <div className="p-8 text-center text-gray-500"><p className="font-medium mb-1">Portal renderer failed to load.</p><pre className="mt-4 text-left text-xs bg-gray-50 border rounded p-4 overflow-auto max-h-96">{JSON.stringify(spec, null, 2)}</pre></div>
          : <RedocStandalone spec={spec as Record<string, unknown>} options={REDOC_OPTIONS} onLoaded={(e) => { if (e) setErr(true); }} />
        }
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApiReferencePage() {
  const [tab, setTab] = useState<MainTab>('api-specs');
  const [portalMode, setPortalMode] = useState(false);
  const [specs, setSpecs] = useState<ApiSpec[]>([]);
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // viewer
  const [viewerSpec, setViewerSpec] = useState<unknown>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerSub, setViewerSub] = useState('');

  // create/edit modals
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState<ApiSpec | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiEntry | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ApiGroup | null>(null);

  // forms
  const [specForm, setSpecForm] = useState({ projectId: '', title: '', version: '1.0.0', description: '', specContent: '', specFormat: 'json' });
  const [apiForm, setApiForm] = useState({ projectId: '', name: '', slug: '', description: '', specType: 'REST', specId: '', specVersion: '' });
  const [groupForm, setGroupForm] = useState({ projectId: '', name: '', slug: '', description: '', parentId: '', apiIds: [] as string[] });
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [sp, ap, grp, proj] = await Promise.all([
        api.get<ApiSpec[]>('/api-specs', token ?? undefined),
        api.get<ApiEntry[]>('/apis', token ?? undefined),
        api.get<ApiGroup[]>('/api-groups', token ?? undefined),
        api.get<Project[]>('/projects', token ?? undefined),
      ]);
      setSpecs(sp); setApis(ap); setGroups(grp); setProjects(proj);
      if (proj.length > 0) {
        setSpecForm(f => ({ ...f, projectId: proj[0].id }));
        setApiForm(f => ({ ...f, projectId: proj[0].id }));
        setGroupForm(f => ({ ...f, projectId: proj[0].id }));
      }
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Spec actions ─────────────────────────────────────────────────────────

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setSpecForm(f => ({ ...f, specContent: content, specFormat: file.name.endsWith('.yaml') || file.name.endsWith('.yml') ? 'yaml' : 'json', title: f.title || file.name.replace(/\.(json|yaml|yml)$/, '') }));
    };
    reader.readAsText(file);
  };

  const openCreateSpec = () => {
    setSpecForm(f => ({ ...f, title: '', version: '1.0.0', description: '', specContent: '', specFormat: 'json' }));
    setEditingSpec(null);
    setShowSpecModal(true);
  };

  const openEditSpec = (spec: ApiSpec) => {
    setSpecForm({ projectId: spec.project.id, title: spec.title, version: spec.version, description: spec.description ?? '', specContent: '', specFormat: 'json' });
    setEditingSpec(spec);
    setShowSpecModal(true);
  };

  const submitSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpec && !specForm.specContent) { setError('Upload or paste an OpenAPI spec'); return; }
    setSubmitting(true); setError('');
    try {
      const token = getToken();
      if (editingSpec) {
        await api.patch(`/api-specs/${editingSpec.id}`, { title: specForm.title, version: specForm.version, description: specForm.description || undefined }, token ?? undefined);
        if (specForm.specContent) {
          await api.post(`/api-specs/${editingSpec.id}/versions`, { version: specForm.version, specContent: specForm.specContent, specFormat: specForm.specFormat }, token ?? undefined);
        }
      } else {
        const { projectId, ...body } = specForm;
        await api.post(`/projects/${projectId}/api-specs`, body, token ?? undefined);
      }
      setShowSpecModal(false); setEditingSpec(null);
      load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save spec'); }
    finally { setSubmitting(false); }
  };

  const openSpecViewer = async (spec: ApiSpec) => {
    try {
      const token = getToken();
      const full = await api.get<ApiSpec>(`/api-specs/${spec.id}`, token ?? undefined);
      const content = full.versions?.find(v => v.isPublished)?.specContent ?? full.versions?.[0]?.specContent;
      setViewerSpec(content); setViewerTitle(full.title); setViewerSub(`v${full.version} · ${full.project?.name}`);
    } catch { setError('Failed to load spec'); }
  };

  const deleteSpec = async (id: string) => {
    if (!confirm('Delete this API spec?')) return;
    try { await api.delete(`/api-specs/${id}`, getToken() ?? undefined); load(); }
    catch { setError('Failed to delete spec'); }
  };

  // ── API actions ───────────────────────────────────────────────────────────

  const handleApiName = (name: string) => {
    setApiForm(f => ({ ...f, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }));
  };

  const openCreateApi = () => {
    setApiForm(f => ({ ...f, name: '', slug: '', description: '', specType: 'REST', specId: '', specVersion: '' }));
    setEditingApi(null);
    setShowApiModal(true);
  };

  const openEditApi = (a: ApiEntry) => {
    setApiForm({ projectId: a.project.id, name: a.name, slug: a.slug, description: a.description ?? '', specType: a.specType, specId: a.spec?.id ?? '', specVersion: a.specVersion ?? '' });
    setEditingApi(a);
    setShowApiModal(true);
  };

  const submitApi = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const token = getToken();
      if (editingApi) {
        await api.patch(`/apis/${editingApi.id}`, {
          name: apiForm.name, slug: apiForm.slug, description: apiForm.description || undefined,
          specType: apiForm.specType, specId: apiForm.specId || undefined, specVersion: apiForm.specVersion || undefined,
        }, token ?? undefined);
      } else {
        const { projectId, ...body } = apiForm;
        await api.post(`/projects/${projectId}/apis`, { ...body, specId: body.specId || undefined, specVersion: body.specVersion || undefined }, token ?? undefined);
      }
      setShowApiModal(false); setEditingApi(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save API'); }
    finally { setSubmitting(false); }
  };

  const openApiViewer = async (entry: ApiEntry) => {
    if (!entry.spec) { setError('No API spec linked to this API'); return; }
    try {
      const token = getToken();
      const full = await api.get<ApiSpec>(`/api-specs/${entry.spec.id}`, token ?? undefined);
      const content = full.versions?.find(v => v.isPublished)?.specContent ?? full.versions?.[0]?.specContent;
      setViewerSpec(content); setViewerTitle(entry.name); setViewerSub(`${entry.specType} · v${entry.specVersion || full.version}`);
    } catch { setError('Failed to load spec'); }
  };

  const deleteApiEntry = async (id: string) => {
    if (!confirm('Delete this API?')) return;
    try { await api.delete(`/apis/${id}`, getToken() ?? undefined); load(); }
    catch { setError('Failed to delete API'); }
  };

  // ── Group actions ─────────────────────────────────────────────────────────

  const handleGroupName = (name: string) => {
    setGroupForm(f => ({ ...f, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }));
  };

  const openCreateGroup = () => {
    setGroupForm(f => ({ ...f, name: '', slug: '', description: '', parentId: '', apiIds: [] }));
    setEditingGroup(null);
    setShowGroupModal(true);
  };

  const openEditGroup = (g: ApiGroup) => {
    setGroupForm({ projectId: g.project.id, name: g.name, slug: g.slug, description: g.description ?? '', parentId: g.parent?.id ?? '', apiIds: g.apis.map(a => a.api.id) });
    setEditingGroup(g);
    setShowGroupModal(true);
  };

  const submitGroup = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const token = getToken();
      const payload = { name: groupForm.name, slug: groupForm.slug, description: groupForm.description || undefined, parentId: groupForm.parentId || undefined, apiIds: groupForm.apiIds };
      if (editingGroup) {
        await api.patch(`/api-groups/${editingGroup.id}`, payload, token ?? undefined);
      } else {
        const { projectId } = groupForm;
        await api.post(`/projects/${projectId}/api-groups`, payload, token ?? undefined);
      }
      setShowGroupModal(false); setEditingGroup(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save group'); }
    finally { setSubmitting(false); }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this API group?')) return;
    try { await api.delete(`/api-groups/${id}`, getToken() ?? undefined); load(); }
    catch { setError('Failed to delete group'); }
  };

  // ── Filter ────────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredSpecs = specs.filter(s => s.title.toLowerCase().includes(q) || s.project?.name?.toLowerCase().includes(q));
  const filteredApis = apis.filter(a => a.name.toLowerCase().includes(q) || a.spec?.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));

  if (viewerSpec) return <RedocViewer spec={viewerSpec} onBack={() => setViewerSpec(null)} title={viewerTitle} subtitle={viewerSub} />;
  if (portalMode) return <LivePortalView groups={groups} onBack={() => setPortalMode(false)} />;

  const TABS: { key: MainTab; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { key: 'api-specs', label: 'API Specs', icon: Code2, count: specs.length, color: 'text-orange-500' },
    { key: 'apis', label: 'APIs', icon: Link2, count: apis.length, color: 'text-blue-500' },
    { key: 'api-groups', label: 'API Groups', icon: Layers, count: groups.length, color: 'text-purple-500' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Reference</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage specs, APIs, and API groups</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'api-specs' && <button onClick={openCreateSpec} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"><Upload className="w-4 h-4" /> Upload Spec</button>}
          {tab === 'apis' && <button onClick={openCreateApi} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> New API</button>}
          {tab === 'api-groups' && <button onClick={openCreateGroup} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"><Plus className="w-4 h-4" /> New Group</button>}
          <button onClick={() => setPortalMode(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <Globe className="w-4 h-4" /> Live Portal
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className={`w-4 h-4 ${tab === t.key ? t.color : ''}`} />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab === 'api-specs' ? 'specs' : tab === 'apis' ? 'APIs' : 'groups'}...`}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* ── API Specs ───────────────────────────────────────────────────── */}
          {tab === 'api-specs' && (
            filteredSpecs.length === 0
              ? <EmptyState icon={Code2} label="No API specs" action={openCreateSpec} actionLabel="Upload Spec" />
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSpecs.map(spec => (
                    <div key={spec.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                          <Code2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{spec.title}</h3>
                          <p className="text-xs text-gray-400">{spec.project?.name} · v{spec.version}</p>
                        </div>
                      </div>
                      {/* Always show description area */}
                      <p className="text-sm text-gray-500 min-h-[2.5rem] line-clamp-2 mb-3">
                        {spec.description || <span className="italic text-gray-300">No description</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 justify-end">
                        <button onClick={() => openEditSpec(spec)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg border border-gray-200 hover:border-blue-200" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteSpec(spec.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg border border-gray-200 hover:border-red-200" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ── APIs ────────────────────────────────────────────────────────── */}
          {tab === 'apis' && (
            filteredApis.length === 0
              ? <EmptyState icon={Link2} label="No APIs yet" action={openCreateApi} actionLabel="New API" />
              : (
                <div className="space-y-3">
                  {filteredApis.map(a => (
                    <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <Link2 className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{a.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.specType === 'GraphQL' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{a.specType}</span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{a.slug}</p>
                            {/* Always-visible description */}
                            <p className="text-sm text-gray-500 mt-1">
                              {a.description || <span className="italic text-gray-300 text-xs">No description</span>}
                            </p>
                            {a.spec && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                                <Code2 className="w-3 h-3 text-orange-400" />
                                <span>{a.spec.title}</span>
                                {a.specVersion && <span>· v{a.specVersion}</span>}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{a.project.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {a.spec && (
                            <button onClick={() => window.open('/portal', '_blank')} className="p-1.5 text-gray-400 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-200" title="Open Live Portal">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEditApi(a)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-200" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteApiEntry(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded border border-gray-200 hover:border-red-200" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ── API Groups ──────────────────────────────────────────────────── */}
          {tab === 'api-groups' && (
            filteredGroups.length === 0
              ? <EmptyState icon={Layers} label="No API groups yet" action={openCreateGroup} actionLabel="New Group" />
              : (
                <div className="space-y-4">
                  {filteredGroups.map(g => (
                    <div key={g.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-start justify-between p-4 border-b border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{g.name}</h3>
                            <p className="text-xs text-gray-400 font-mono">{g.slug}</p>
                            {/* Always-visible description */}
                            <p className="text-sm text-gray-500 mt-0.5">
                              {g.description || <span className="italic text-gray-300 text-xs">No description</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {g.parent && <span>Parent: {g.parent.name}</span>}
                              {g.children.length > 0 && <span>{g.children.length} sub-group{g.children.length !== 1 ? 's' : ''}</span>}
                              <span>{g.project.name}</span>
                              <span>{g._count.apis} API{g._count.apis !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditGroup(g)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-200" title="Edit group">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteGroup(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded border border-gray-200 hover:border-red-200" title="Delete group">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {g.apis.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {g.apis.map(({ api: a }) => (
                            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group">
                              <div className="flex items-center gap-3">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                <span className="font-medium text-gray-800 text-sm">{a.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${a.specType === 'GraphQL' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>{a.specType}</span>
                                {a.spec && <span className="text-xs text-gray-400">{a.spec.title}</span>}
                              </div>
                              {a.spec && (
                                <button
                                  onClick={() => window.open(`/portal/${g.slug}/${a.slug}`, '_blank')}
                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-transparent hover:border-blue-200"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Live Portal
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-xs text-gray-400 italic">No APIs in this group — click Edit to add some</div>
                      )}
                      {g.children.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                          <span className="text-xs text-gray-400">Sub-groups: </span>
                          {g.children.map(c => <span key={c.id} className="inline-block mx-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{c.name}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
          )}
        </>
      )}

      {/* ── API Spec Modal (create + edit) ───────────────────────────────── */}
      {showSpecModal && (
        <Modal title={editingSpec ? `Edit: ${editingSpec.title}` : 'Upload OpenAPI Spec'} onClose={() => { setShowSpecModal(false); setEditingSpec(null); }}>
          <form onSubmit={submitSpec} className="space-y-4">
            {error && <ErrBox msg={error} />}
            {!editingSpec && (
              <Field label="Project *">
                <select required value={specForm.projectId} onChange={e => setSpecForm(f => ({ ...f, projectId: e.target.value }))} className={INPUT}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title *">
                <input type="text" required value={specForm.title} onChange={e => setSpecForm(f => ({ ...f, title: e.target.value }))} className={INPUT} placeholder="Payments API" />
              </Field>
              <Field label="Version *">
                <input type="text" required value={specForm.version} onChange={e => setSpecForm(f => ({ ...f, version: e.target.value }))} className={INPUT} placeholder="1.0.0" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={specForm.description} onChange={e => setSpecForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${INPUT} resize-none`} placeholder="What does this API do?" />
            </Field>
            <Field label={editingSpec ? 'Upload New Version (optional)' : 'OpenAPI File (JSON or YAML) *'}>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50">
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{specForm.specContent ? '✓ File loaded — click to replace' : 'Click to upload openapi.json or openapi.yaml'}</p>
                <input ref={fileRef} type="file" accept=".json,.yaml,.yml" onChange={handleFile} className="hidden" />
              </div>
            </Field>
            <Field label="Or paste spec content">
              <textarea value={specForm.specContent} onChange={e => setSpecForm(f => ({ ...f, specContent: e.target.value }))} rows={4} className={`${INPUT} font-mono resize-none`} placeholder='{"openapi": "3.0.0", ...}' />
            </Field>
            <ModalActions onCancel={() => { setShowSpecModal(false); setEditingSpec(null); }} submitting={submitting} label={editingSpec ? 'Save Changes' : 'Upload'} />
          </form>
        </Modal>
      )}

      {/* ── API Modal (create + edit) ────────────────────────────────────── */}
      {showApiModal && (
        <Modal title={editingApi ? `Edit: ${editingApi.name}` : 'New API'} onClose={() => { setShowApiModal(false); setEditingApi(null); }}>
          <form onSubmit={submitApi} className="space-y-4">
            {error && <ErrBox msg={error} />}
            {!editingApi && (
              <Field label="Project *">
                <select required value={apiForm.projectId} onChange={e => setApiForm(f => ({ ...f, projectId: e.target.value }))} className={INPUT}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <input type="text" required value={apiForm.name} onChange={e => handleApiName(e.target.value)} className={INPUT} placeholder="Offer API" />
              </Field>
              <Field label="Slug *">
                <input type="text" required value={apiForm.slug} onChange={e => setApiForm(f => ({ ...f, slug: e.target.value }))} className={INPUT} placeholder="offer-api" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={apiForm.specType} onChange={e => setApiForm(f => ({ ...f, specType: e.target.value }))} className={INPUT}>
                  <option value="REST">REST</option>
                  <option value="GraphQL">GraphQL</option>
                </select>
              </Field>
              <Field label="Spec Version">
                <input type="text" value={apiForm.specVersion} onChange={e => setApiForm(f => ({ ...f, specVersion: e.target.value }))} className={INPUT} placeholder="1.0.0" />
              </Field>
            </div>
            <Field label="Link to API Spec">
              <select value={apiForm.specId} onChange={e => setApiForm(f => ({ ...f, specId: e.target.value }))} className={INPUT}>
                <option value="">— None —</option>
                {specs.map(s => <option key={s.id} value={s.id}>{s.title} (v{s.version})</option>)}
              </select>
            </Field>
            <Field label="Description">
              <textarea value={apiForm.description} onChange={e => setApiForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${INPUT} resize-none`} placeholder="Describe what this API does..." />
            </Field>
            <ModalActions onCancel={() => { setShowApiModal(false); setEditingApi(null); }} submitting={submitting} label={editingApi ? 'Save Changes' : 'Create API'} />
          </form>
        </Modal>
      )}

      {/* ── Group Modal (create + edit) ──────────────────────────────────── */}
      {showGroupModal && (
        <Modal title={editingGroup ? `Edit: ${editingGroup.name}` : 'New API Group'} onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}>
          <form onSubmit={submitGroup} className="space-y-4">
            {error && <ErrBox msg={error} />}
            {!editingGroup && (
              <Field label="Project *">
                <select required value={groupForm.projectId} onChange={e => setGroupForm(f => ({ ...f, projectId: e.target.value }))} className={INPUT}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <input type="text" required value={groupForm.name} onChange={e => handleGroupName(e.target.value)} className={INPUT} placeholder="Sell APIs" />
              </Field>
              <Field label="Slug *">
                <input type="text" required value={groupForm.slug} onChange={e => setGroupForm(f => ({ ...f, slug: e.target.value }))} className={INPUT} placeholder="sell-apis" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${INPUT} resize-none`} placeholder="What APIs does this group contain?" />
            </Field>
            <Field label="Parent Group">
              <select value={groupForm.parentId} onChange={e => setGroupForm(f => ({ ...f, parentId: e.target.value }))} className={INPUT}>
                <option value="">— None (root group) —</option>
                {groups.filter(g => g.id !== editingGroup?.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="APIs in this group">
              <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                {apis.length === 0
                  ? <p className="text-sm text-gray-400 p-3 italic">No APIs yet — create some first</p>
                  : apis.map(a => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={groupForm.apiIds.includes(a.id)}
                        onChange={e => setGroupForm(f => ({ ...f, apiIds: e.target.checked ? [...f.apiIds, a.id] : f.apiIds.filter(id => id !== a.id) }))} className="rounded" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-700">{a.name}</span>
                        {a.description && <p className="text-xs text-gray-400 truncate">{a.description}</p>}
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${a.specType === 'GraphQL' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>{a.specType}</span>
                    </label>
                  ))
                }
              </div>
              {apis.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{groupForm.apiIds.length} of {apis.length} selected</p>
              )}
            </Field>
            <ModalActions onCancel={() => { setShowGroupModal(false); setEditingGroup(null); }} submitting={submitting} label={editingGroup ? 'Save Changes' : 'Create Group'} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function ErrBox({ msg }: { msg: string }) {
  return <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{msg}</div>;
}

function EmptyState({ icon: Icon, label, action, actionLabel }: { icon: React.ElementType; label: string; action: () => void; actionLabel: string }) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">{label}</p>
      <button onClick={action} className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
        <Plus className="w-4 h-4" /> {actionLabel}
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}

function ModalActions({ onCancel, submitting, label }: { onCancel: () => void; submitting: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
      <button type="submit" disabled={submitting} className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{label}
      </button>
    </div>
  );
}
