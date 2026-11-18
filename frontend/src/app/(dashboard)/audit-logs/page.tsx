'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const data = await api.get<AuditLog[]>('/audit-logs?limit=100', token ?? undefined);
      setLogs(data);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter
    ? logs.filter(l =>
        l.action.toLowerCase().includes(filter.toLowerCase()) ||
        l.resource.toLowerCase().includes(filter.toLowerCase()) ||
        `${l.user?.firstName} ${l.user?.lastName}`.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const actionTag = (action: string) => {
    const cls = ACTION_COLOR[action.toUpperCase()] ?? 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{action}</span>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track all system activity and changes</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
          <Shield className="w-4 h-4" /> Security
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by action, resource or user..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{filter ? 'No matching logs' : 'No audit logs yet'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Action</span><span>Resource</span><span>User</span><span>Time</span><span />
          </div>
          {filtered.map(log => (
            <div key={log.id} className="border-b border-gray-100 last:border-0">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <span>{actionTag(log.action)}</span>
                <span className="text-sm text-gray-700 font-mono">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</span>
                <span className="text-sm text-gray-600">
                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : <span className="text-gray-400 italic">System</span>}
                </span>
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                <span className="text-gray-400">
                  {expanded === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>
              {expanded === log.id && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                    {log.ipAddress && (
                      <div><span className="text-gray-400 text-xs">IP Address</span><p className="font-mono text-gray-700">{log.ipAddress}</p></div>
                    )}
                    {log.user && (
                      <div><span className="text-gray-400 text-xs">User Email</span><p className="text-gray-700">{log.user.email}</p></div>
                    )}
                    {log.details && (
                      <div className="col-span-2">
                        <span className="text-gray-400 text-xs">Details</span>
                        <pre className="mt-1 bg-gray-800 text-green-400 rounded p-3 text-xs overflow-auto max-h-40">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">Showing {filtered.length} of {logs.length} entries</p>
      )}
    </div>
  );
}
