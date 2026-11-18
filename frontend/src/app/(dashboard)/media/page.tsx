'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Copy, Check, Upload } from 'lucide-react';
import { api } from '@/lib/api';

interface Project { id: string; name: string; }
interface MediaAsset {
  id: string; filename: string; originalName: string; mimeType: string;
  size: number; url: string; storageKey: string; projectId?: string; createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (projectId?: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const [media, proj] = await Promise.all([
        api.get<MediaAsset[]>(`/media${projectId ? `?projectId=${projectId}` : ''}`, token ?? undefined),
        projects.length === 0 ? api.get<Project[]>('/projects', token ?? undefined) : Promise.resolve(null),
      ]);
      setAssets(media);
      if (proj) {
        setProjects(proj);
        if (proj.length > 0 && !selectedProject) setSelectedProject(proj[0].id);
      }
    } catch {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [projects.length, selectedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const token = getToken();
      const fakeUrl = `https://cdn.example.com/media/${Date.now()}_${file.name}`;
      await api.post('/media', {
        filename: `${Date.now()}_${file.name}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: fakeUrl,
        storageKey: `media/${Date.now()}_${file.name}`,
        projectId: selectedProject || undefined,
      }, token ?? undefined);
      load(selectedProject || undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('Delete this media asset?')) return;
    try {
      const token = getToken();
      await api.delete(`/media/${id}`, token ?? undefined);
      setAssets(a => a.filter(x => x.id !== id));
    } catch { setError('Failed to delete'); }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Images, files and assets</p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); load(e.target.value || undefined); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        Note: File uploads register metadata only. Connect a storage provider (S3, Cloudflare R2, etc.) to store actual files.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No media assets yet</p>
          <button onClick={() => fileRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            <Upload className="w-4 h-4" /> Upload your first file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map(asset => (
            <div key={asset.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {isImage(asset.mimeType) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                    <span className="text-xs text-gray-400 font-mono">{asset.mimeType.split('/')[1]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyUrl(asset.url, asset.id)}
                    className="p-2 bg-white/90 rounded-lg text-gray-700 hover:bg-white">
                    {copied === asset.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteAsset(asset.id)}
                    className="p-2 bg-white/90 rounded-lg text-red-500 hover:bg-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-800 truncate" title={asset.originalName}>{asset.originalName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatSize(asset.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
