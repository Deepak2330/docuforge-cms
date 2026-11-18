'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Folder, Tag } from 'lucide-react';
import { marked } from 'marked';
import { api } from '@/lib/api';

marked.setOptions({ breaks: true, gfm: true } as Parameters<typeof marked.setOptions>[0]);

function renderContent(content: string): string {
  if (!content?.trim()) return '';
  const trimmed = content.trim();
  if (trimmed.startsWith('<')) return content;
  return marked(content) as string;
}

interface Document {
  id: string; title: string; slug: string; status: string; docType: string;
  tags: string[]; content?: string; description?: string;
  createdAt: string; updatedAt: string; publishedAt?: string;
  project?: { id: string; name: string; slug: string };
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

const DOC_STYLES = `
  body { margin: 0; }
  .doc-body h1 { font-size: 2.25em; font-weight: 800; margin: 0 0 .4em; line-height: 1.2; color: #0f172a; }
  .doc-body h2 { font-size: 1.6em; font-weight: 700; margin: 2em 0 .6em; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: .4em; }
  .doc-body h3 { font-size: 1.25em; font-weight: 600; margin: 1.75em 0 .5em; color: #1e293b; }
  .doc-body h4, .doc-body h5, .doc-body h6 { font-size: 1.05em; font-weight: 600; margin: 1.5em 0 .4em; color: #334155; }
  .doc-body p { margin: 0 0 1.1em; color: #374151; }
  .doc-body ul { list-style: disc; padding-left: 1.6em; margin: 0 0 1.1em; }
  .doc-body ol { list-style: decimal; padding-left: 1.6em; margin: 0 0 1.1em; }
  .doc-body li { margin: .35em 0; color: #374151; line-height: 1.7; }
  .doc-body li > ul, .doc-body li > ol { margin: .25em 0; }
  .doc-body a { color: #2563eb; text-decoration: none; border-bottom: 1px solid #bfdbfe; transition: color .15s, border-color .15s; }
  .doc-body a:hover { color: #1d4ed8; border-color: #1d4ed8; }
  .doc-body code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px; padding: .15em .4em; font-size: .875em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #dc2626; }
  .doc-body pre { background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 1.25em 1.5em; overflow-x: auto; margin: 0 0 1.5em; font-size: .875em; line-height: 1.75; box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1); }
  .doc-body pre code { background: none; border: none; padding: 0; color: inherit; font-size: inherit; border-radius: 0; }
  .doc-body blockquote { border-left: 4px solid #6366f1; background: #f8fafc; padding: .75em 1.25em; margin: 0 0 1.25em; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }
  .doc-body blockquote p { margin: 0; color: inherit; }
  .doc-body table { width: 100%; border-collapse: collapse; margin: 0 0 1.5em; font-size: .93em; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgb(0 0 0/.08); }
  .doc-body th { background: #f8fafc; border: 1px solid #e2e8f0; padding: .65em 1.1em; text-align: left; font-weight: 600; color: #334155; font-size: .85em; text-transform: uppercase; letter-spacing: .04em; }
  .doc-body td { border: 1px solid #e2e8f0; padding: .65em 1.1em; color: #374151; }
  .doc-body tr:nth-child(even) td { background: #f8fafc; }
  .doc-body tr:hover td { background: #f0f9ff; transition: background .1s; }
  .doc-body img { max-width: 100%; border-radius: 10px; margin: .5em 0; box-shadow: 0 4px 6px -1px rgb(0 0 0/.08); }
  .doc-body hr { border: none; border-top: 2px solid #f1f5f9; margin: 2em 0; }
  .doc-body strong { font-weight: 700; color: #0f172a; }
  .doc-body em { font-style: italic; color: #475569; }
  .doc-body mark { background: #fef9c3; color: #713f12; padding: .1em .25em; border-radius: 3px; }
  .doc-body details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: .75em 1em; margin: 0 0 1em; }
  .doc-body summary { font-weight: 600; cursor: pointer; color: #334155; }
  .doc-body .msgbox_note { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: .75em 1.25em; margin: 0 0 1.25em; }
  .doc-body .msgbox_note p { margin: 0; color: #1e40af; }
  .doc-body .msgbox_note b { color: #1e3a8a; }
`;

export default function DocViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    api.get<Document>(`/documents/${id}`, token ?? undefined)
      .then(d => { setDoc(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ margin: 0, fontSize: 14 }}>Loading document…</p>
        </div>
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>📄</p>
          <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Document not found</h2>
          <p style={{ color: '#64748b', margin: '0 0 20px' }}>This document may have been deleted or is unavailable.</p>
          <button onClick={() => router.push('/documents')}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const isPublished = doc.status === 'PUBLISHED';
  const publishedDate = doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const updatedDate = new Date(doc.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{DOC_STYLES}</style>

      {/* Top nav bar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52,
      }}>
        <button
          onClick={() => router.push('/documents')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '6px 10px', borderRadius: 6, transition: 'all .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
        >
          <ArrowLeft size={14} />
          Back to CMS
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPublished ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              PUBLISHED
            </span>
          ) : (
            <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              {doc.status}
            </span>
          )}
        </div>
      </nav>

      {/* Article wrapper */}
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Doc metadata header */}
        <header style={{ marginBottom: 40, paddingBottom: 32, borderBottom: '2px solid #f1f5f9' }}>
          {doc.project && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6366f1', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              <Folder size={12} />
              {doc.project.name}
            </div>
          )}

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.15, letterSpacing: '-.025em' }}>
            {doc.title}
          </h1>

          {doc.description && (
            <p style={{ fontSize: '1.1rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
              {doc.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 12 }}>
              <Calendar size={12} />
              {publishedDate ? `Published ${publishedDate}` : `Updated ${updatedDate}`}
            </span>

            {doc.docType !== 'GENERAL' && (
              <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                {doc.docType.replace(/_/g, ' ')}
              </span>
            )}

            {doc.tags?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Tag size={11} style={{ color: '#94a3b8' }} />
                {doc.tags.map(tag => (
                  <span key={tag} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Document content */}
        {doc.content?.trim() ? (
          <article
            className="doc-body"
            style={{ fontSize: '16px', lineHeight: '1.8', color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: renderContent(doc.content ?? '') }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <p style={{ fontSize: 15 }}>This document has no content yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f1f5f9', padding: '20px 32px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        <span style={{ color: '#cbd5e1' }}>Powered by </span>
        <span style={{ fontWeight: 700, color: '#6366f1' }}>DocuForge</span>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  );
}
