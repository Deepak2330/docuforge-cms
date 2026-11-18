'use client';

import { useState, useEffect } from 'react';
import {
  FileText, BookOpen, CheckCircle, Clock, AlertCircle,
  FolderOpen, Code2, Zap, Users, ArrowRight, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Stats {
  documents: { total: number; published: number; draft: number; inReview: number };
  projects: number;
  apiSpecs: number;
  graphqlSchemas: number;
  workspaces: number;
}

interface RecentDoc {
  id: string; title: string; status: string; updatedAt: string;
  project?: { name: string };
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

function getUserName(): string {
  if (typeof document === 'undefined') return 'there';
  try {
    const match = document.cookie.match(/docuforge_user=([^;]+)/);
    if (!match) return 'there';
    const user = JSON.parse(decodeURIComponent(match[1]));
    return user.firstName ?? user.email?.split('@')[0] ?? 'there';
  } catch { return 'there'; }
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

function StatCard({ title, value, icon: Icon, color, sub, href }: {
  title: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; href?: string;
}) {
  const content = (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && <ArrowRight className="w-4 h-4 text-gray-300" />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{title}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('there');

  useEffect(() => {
    setUserName(getUserName());
    const token = getToken();

    // Health check
    api.get('/health', token ?? undefined)
      .then(() => setApiHealth(true))
      .catch(() => setApiHealth(false));

    // Fetch all stats in parallel
    Promise.all([
      api.get<unknown[]>('/documents', token ?? undefined).catch(() => []),
      api.get<unknown[]>('/projects', token ?? undefined).catch(() => []),
      api.get<unknown[]>('/api-specs', token ?? undefined).catch(() => []),
      api.get<unknown[]>('/graphql-schemas', token ?? undefined).catch(() => []),
      api.get<unknown[]>('/workspaces', token ?? undefined).catch(() => []),
    ]).then(([docs, projects, specs, gqlSchemas, workspaces]) => {
      const documents = docs as RecentDoc[];
      setStats({
        documents: {
          total: documents.length,
          published: documents.filter(d => d.status === 'PUBLISHED').length,
          draft: documents.filter(d => d.status === 'DRAFT').length,
          inReview: documents.filter(d => d.status === 'IN_REVIEW').length,
        },
        projects: (projects as unknown[]).length,
        apiSpecs: (specs as unknown[]).length,
        graphqlSchemas: (gqlSchemas as unknown[]).length,
        workspaces: (workspaces as unknown[]).length,
      });
      setRecent(
        documents
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
      );
    });
  }, []);

  const checklistItems = [
    { label: 'Create a workspace', done: (stats?.workspaces ?? 0) > 0, href: '/workspaces' },
    { label: 'Create a project', done: (stats?.projects ?? 0) > 0, href: '/projects' },
    { label: 'Write a document', done: (stats?.documents.total ?? 0) > 0, href: '/documents' },
    { label: 'Upload an OpenAPI spec', done: (stats?.apiSpecs ?? 0) > 0, href: '/api-reference' },
    { label: 'Publish documentation', done: (stats?.documents.published ?? 0) > 0, href: '/documents' },
  ];
  const doneCount = checklistItems.filter(c => c.done).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${apiHealth === null ? 'bg-gray-300' : apiHealth ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {apiHealth === null ? 'Checking…' : apiHealth ? 'API connected' : 'API disconnected'}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={stats?.documents.total ?? '—'} icon={FileText} color="bg-blue-500" href="/documents" />
        <StatCard title="Published" value={stats?.documents.published ?? '—'} icon={CheckCircle} color="bg-green-500"
          sub={stats ? `${stats.documents.total > 0 ? Math.round(stats.documents.published / stats.documents.total * 100) : 0}% of total` : undefined} />
        <StatCard title="Drafts" value={stats?.documents.draft ?? '—'} icon={Clock} color="bg-yellow-500" href="/documents" />
        <StatCard title="Pending Review" value={stats?.documents.inReview ?? '—'} icon={AlertCircle} color="bg-orange-500" href="/review-queue" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Projects" value={stats?.projects ?? '—'} icon={FolderOpen} color="bg-purple-500" href="/projects" />
        <StatCard title="API Specs" value={stats?.apiSpecs ?? '—'} icon={Code2} color="bg-indigo-500" href="/api-reference" />
        <StatCard title="GraphQL Schemas" value={stats?.graphqlSchemas ?? '—'} icon={Zap} color="bg-pink-500" href="/graphql" />
        <StatCard title="Workspaces" value={stats?.workspaces ?? '—'} icon={BookOpen} color="bg-teal-500" href="/workspaces" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent documents */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Documents</h2>
            <Link href="/documents" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              No documents yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.project?.name ?? 'No project'} · {new Date(doc.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`ml-3 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting started checklist */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Getting Started</h2>
            <span className="text-xs text-gray-400">{doneCount}/{checklistItems.length} complete</span>
          </div>
          <div className="px-5 py-2">
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 mt-2">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / checklistItems.length) * 100}%` }}
              />
            </div>
            {checklistItems.map(item => (
              <Link href={item.href} key={item.label}
                className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.done ? 'border-green-500 bg-green-500' : 'border-gray-300 group-hover:border-gray-400'
                }`}>
                  {item.done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm transition-colors ${item.done ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {item.label}
                </span>
                {!item.done && <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-500" />}
                {item.done && <TrendingUp className="w-3.5 h-3.5 text-green-400 ml-auto" />}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
