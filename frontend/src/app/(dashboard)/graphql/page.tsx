'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  buildSchema,
  isObjectType, isEnumType, isInputObjectType, isInterfaceType, isUnionType, isScalarType,
  GraphQLObjectType, GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLUnionType,
  GraphQLNamedType, GraphQLField, GraphQLInputField, GraphQLEnumValue,
} from 'graphql';
import { Plus, Zap, Loader2, X, Upload, ArrowLeft, Trash2, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Project { id: string; name: string; slug: string; workspace: { name: string } }
interface GraphqlSchema {
  id: string; title: string; description?: string;
  project: { id: string; name: string; slug: string };
  _count: { versions: number };
  versions: Array<{ id: string; version: string; sdlContent: string; isPublished: boolean; createdAt: string }>;
  createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

function typeString(type: { toString(): string }): string {
  return type.toString();
}

function TypeBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    OBJECT: 'bg-blue-900/60 text-blue-300 border-blue-700',
    ENUM: 'bg-purple-900/60 text-purple-300 border-purple-700',
    INPUT: 'bg-orange-900/60 text-orange-300 border-orange-700',
    INTERFACE: 'bg-teal-900/60 text-teal-300 border-teal-700',
    UNION: 'bg-pink-900/60 text-pink-300 border-pink-700',
    SCALAR: 'bg-gray-800 text-gray-400 border-gray-600',
  };
  return (
    <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border ${styles[kind] ?? styles.SCALAR}`}>
      {kind}
    </span>
  );
}

function FieldRow({ name, typeStr, description, args, onTypeClick }: {
  name: string; typeStr: string; description?: string | null;
  args?: Array<{ name: string; type: string; description?: string | null; defaultValue?: unknown }>;
  onTypeClick: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const baseType = typeStr.replace(/[!\[\]]/g, '');

  return (
    <div className="border-b border-gray-800 last:border-0">
      <div className="flex items-start gap-3 px-5 py-3 hover:bg-gray-800/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-green-400 text-sm">{name}</span>
            {args && args.length > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-0.5"
              >
                ({args.length} arg{args.length !== 1 ? 's' : ''})
                <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            )}
            <span className="text-gray-600 text-sm">:</span>
            <button
              onClick={() => onTypeClick(baseType)}
              className="font-mono text-sm text-sky-400 hover:text-sky-300 hover:underline transition-colors"
            >
              {typeStr}
            </button>
          </div>
          {description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>}
          {expanded && args && (
            <div className="mt-2 ml-3 space-y-1.5 border-l-2 border-gray-700 pl-3">
              {args.map(arg => (
                <div key={arg.name} className="text-xs">
                  <span className="font-mono text-yellow-400">{arg.name}</span>
                  <span className="text-gray-600">: </span>
                  <span className="font-mono text-sky-400">{arg.type}</span>
                  {arg.defaultValue != null && (
                    <span className="text-gray-500"> = {String(arg.defaultValue)}</span>
                  )}
                  {arg.description && <span className="text-gray-500"> — {arg.description}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeDetail({ type, onTypeClick }: { type: GraphQLNamedType; onTypeClick: (name: string) => void }) {
  let kind = 'SCALAR';
  if (isObjectType(type)) kind = 'OBJECT';
  else if (isEnumType(type)) kind = 'ENUM';
  else if (isInputObjectType(type)) kind = 'INPUT';
  else if (isInterfaceType(type)) kind = 'INTERFACE';
  else if (isUnionType(type)) kind = 'UNION';

  const fields = isObjectType(type) || isInterfaceType(type)
    ? Object.values((type as GraphQLObjectType | GraphQLInterfaceType).getFields())
    : [];
  const inputFields = isInputObjectType(type)
    ? Object.values((type as GraphQLInputObjectType).getFields())
    : [];
  const enumValues = isEnumType(type)
    ? (type as GraphQLEnumType).getValues()
    : [];
  const unionTypes = isUnionType(type)
    ? (type as GraphQLUnionType).getTypes()
    : [];

  const interfaces = isObjectType(type) ? (type as GraphQLObjectType).getInterfaces() : [];

  return (
    <div>
      <div className="mb-5 pb-5 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-white font-mono">{type.name}</h2>
          <TypeBadge kind={kind} />
        </div>
        {type.description && (
          <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">{type.description}</p>
        )}
        {interfaces.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-600">implements</span>
            {interfaces.map(iface => (
              <button key={iface.name} onClick={() => onTypeClick(iface.name)}
                className="text-xs font-mono text-teal-400 hover:text-teal-300 hover:underline">
                {iface.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Object / Interface fields */}
      {fields.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/60 px-5 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fields</span>
          </div>
          {fields.map((f: GraphQLField<unknown, unknown>) => (
            <FieldRow
              key={f.name}
              name={f.name}
              typeStr={typeString(f.type)}
              description={f.description}
              args={f.args?.map(a => ({
                name: a.name, type: typeString(a.type),
                description: a.description, defaultValue: a.defaultValue,
              }))}
              onTypeClick={onTypeClick}
            />
          ))}
        </div>
      )}

      {/* Input fields */}
      {inputFields.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/60 px-5 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Input Fields</span>
          </div>
          {inputFields.map((f: GraphQLInputField) => (
            <FieldRow
              key={f.name}
              name={f.name}
              typeStr={typeString(f.type)}
              description={f.description}
              onTypeClick={onTypeClick}
            />
          ))}
        </div>
      )}

      {/* Enum values */}
      {enumValues.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/60 px-5 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Values</span>
          </div>
          {enumValues.map((v: GraphQLEnumValue) => (
            <div key={v.name} className="flex items-start gap-3 px-5 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
              <span className="font-mono font-semibold text-purple-400 text-sm">{v.name}</span>
              {v.description && <span className="text-xs text-gray-500 mt-0.5">{v.description}</span>}
              {v.isDeprecated && <span className="text-xs text-red-500 ml-auto">deprecated</span>}
            </div>
          ))}
        </div>
      )}

      {/* Union types */}
      {unionTypes.length > 0 && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/60 px-5 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Possible Types</span>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            {unionTypes.map(t => (
              <button key={t.name} onClick={() => onTypeClick(t.name)}
                className="font-mono text-sm text-sky-400 hover:text-sky-300 bg-sky-900/20 border border-sky-800 rounded px-2 py-0.5 hover:bg-sky-900/40 transition-colors">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const BUILTIN_NAMES = new Set(['String', 'Int', 'Float', 'Boolean', 'ID', 'Query', 'Mutation', 'Subscription']);

// Defined outside the viewer to keep stable component references across renders
function SidebarTypeItem({ type, selected, onSelect }: {
  type: GraphQLNamedType; selected: boolean; onSelect: (name: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(type.name)}
      className={`w-full text-left px-4 py-1.5 text-sm font-mono truncate transition-colors rounded mx-1 ${
        selected ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {type.name}
    </button>
  );
}

function SidebarSection({ title, types, selectedName, onSelect, search }: {
  title: string; types: GraphQLNamedType[]; selectedName: string | null;
  onSelect: (name: string) => void; search: string;
}) {
  const filtered = search
    ? types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : types;
  if (filtered.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</div>
      {filtered.map(t => (
        <SidebarTypeItem key={t.name} type={t} selected={selectedName === t.name} onSelect={onSelect} />
      ))}
    </div>
  );
}

function GraphQLDocViewer({ sdl }: { sdl: string }) {
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { schema, parseError } = useMemo(() => {
    try {
      return { schema: buildSchema(sdl, { assumeValidSDL: true }), parseError: null };
    } catch (e) {
      return { schema: null, parseError: String(e) };
    }
  }, [sdl]);

  const handleTypeClick = useCallback((name: string) => {
    if (!schema) return;
    const typeMap = schema.getTypeMap();
    if (typeMap[name] && !name.startsWith('__') && !['String','Int','Float','Boolean','ID'].includes(name)) {
      setSelectedTypeName(name);
    }
  }, [schema]);

  if (!schema) {
    return (
      <div className="h-full overflow-auto bg-gray-950 p-6">
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-lg text-xs font-mono">
          Schema parse error: {parseError}
        </div>
        <pre className="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">{sdl}</pre>
      </div>
    );
  }

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();
  const typeMap = schema.getTypeMap();

  const customTypes = Object.values(typeMap).filter(t =>
    !t.name.startsWith('__') && !BUILTIN_NAMES.has(t.name)
  );

  const objectTypes = customTypes.filter(isObjectType) as GraphQLObjectType[];
  const enumTypes = customTypes.filter(isEnumType) as GraphQLEnumType[];
  const inputTypes = customTypes.filter(isInputObjectType) as GraphQLInputObjectType[];
  const interfaceTypes = customTypes.filter(isInterfaceType) as GraphQLInterfaceType[];
  const unionTypes = customTypes.filter(isUnionType) as GraphQLUnionType[];
  const scalarTypes = customTypes.filter(isScalarType);

  const rootTypes: GraphQLNamedType[] = [
    ...(queryType ? [queryType] : []),
    ...(mutationType ? [mutationType] : []),
    ...(subscriptionType ? [subscriptionType] : []),
  ];

  const nonRootObjects = objectTypes.filter(t => !rootTypes.some(r => r.name === t.name));

  const displayTypeName = selectedTypeName
    ?? queryType?.name
    ?? mutationType?.name
    ?? objectTypes[0]?.name
    ?? null;
  const displayType = displayTypeName ? typeMap[displayTypeName] : null;

  const sidebarProps = { selectedName: displayTypeName, onSelect: setSelectedTypeName, search };

  return (
    <div className="flex h-full bg-gray-950">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Schema Explorer</span>
          </div>
          <input
            type="text"
            placeholder="Search types…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2.5 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarSection title="Root" types={rootTypes} {...sidebarProps} />
          <SidebarSection title="Types" types={nonRootObjects} {...sidebarProps} />
          <SidebarSection title="Interfaces" types={interfaceTypes} {...sidebarProps} />
          <SidebarSection title="Unions" types={unionTypes} {...sidebarProps} />
          <SidebarSection title="Enums" types={enumTypes} {...sidebarProps} />
          <SidebarSection title="Input Types" types={inputTypes} {...sidebarProps} />
          {scalarTypes.length > 0 && <SidebarSection title="Scalars" types={scalarTypes} {...sidebarProps} />}
        </div>
        <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-700">
          {customTypes.length} types
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-7">
        {displayType ? (
          <TypeDetail type={displayType} onTypeClick={handleTypeClick} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-700">
            <Zap className="w-10 h-10 mb-3" />
            <p className="text-sm">Select a type from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GraphQLPage() {
  const [schemas, setSchemas] = useState<GraphqlSchema[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'viewer'>('list');
  const [activeSchema, setActiveSchema] = useState<GraphqlSchema | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', version: '1.0.0', description: '', projectId: '', sdlContent: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const [sch, proj] = await Promise.all([
        api.get<GraphqlSchema[]>('/graphql-schemas', token ?? undefined),
        api.get<Project[]>('/projects', token ?? undefined),
      ]);
      setSchemas(sch);
      setProjects(proj);
      if (proj.length > 0) setForm(f => ({ ...f, projectId: proj[0].id }));
    } catch {
      setError('Failed to load GraphQL schemas');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setForm(f => ({
        ...f,
        sdlContent: content,
        title: f.title || file.name.replace(/\.(graphql|gql|sdl)$/, ''),
      }));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sdlContent.trim()) { setError('Please upload or paste a GraphQL schema'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = getToken();
      const { projectId, ...schemaBody } = form;
      await api.post(`/projects/${projectId}/graphql-schemas`, schemaBody, token ?? undefined);
      setShowModal(false);
      setForm(f => ({ ...f, title: '', version: '1.0.0', sdlContent: '' }));
      load();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray((err as {errors: string[]}).errors)) {
        setError((err as {errors: string[]}).errors.join('; '));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to upload schema');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openViewer = async (schema: GraphqlSchema) => {
    try {
      const token = getToken();
      const full = await api.get<GraphqlSchema>(`/graphql-schemas/${schema.id}`, token ?? undefined);
      setActiveSchema(full);
      setView('viewer');
    } catch {
      setError('Failed to load schema');
    }
  };

  const deleteSchema = async (id: string) => {
    if (!confirm('Delete this GraphQL schema?')) return;
    try {
      const token = getToken();
      await api.delete(`/graphql-schemas/${id}`, token ?? undefined);
      load();
    } catch {
      setError('Failed to delete schema');
    }
  };

  const getLatestSdl = (schema: GraphqlSchema) => {
    const published = schema.versions?.find(v => v.isPublished);
    return published?.sdlContent ?? schema.versions?.[0]?.sdlContent ?? '';
  };

  if (view === 'viewer' && activeSchema) {
    const sdl = getLatestSdl(activeSchema);
    return (
      <div className="flex flex-col" style={{ margin: '-24px', height: 'calc(100vh - 56px)' }}>
        <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('list'); setActiveSchema(null); }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-gray-200">|</span>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm leading-tight">{activeSchema.title}</h2>
              <p className="text-xs text-gray-400">{activeSchema.project?.name}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse inline-block" />
            Schema Explorer
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {sdl ? (
            <GraphQLDocViewer sdl={sdl} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No schema content found</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GraphQL</h1>
          <p className="text-sm text-gray-500 mt-1">Upload GraphQL schemas and explore them live</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Schema
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : schemas.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No GraphQL schemas yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload a .graphql SDL file to explore your schema live</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
            <Upload className="w-4 h-4" /> Upload Schema
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map(schema => (
            <div key={schema.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{schema.title}</h3>
                  <p className="text-xs text-gray-400">{schema.project?.name}</p>
                </div>
              </div>
              {schema.description && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{schema.description}</p>}
              <div className="text-xs text-gray-400 mt-3">
                {schema._count.versions} version{schema._count.versions !== 1 ? 's' : ''} · {new Date(schema.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => openViewer(schema)}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <Zap className="w-4 h-4" /> Explore Schema
                </button>
                <button onClick={() => deleteSchema(schema.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Upload GraphQL Schema</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Users API" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
                  <input type="text" required value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schema File (.graphql, .gql)</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {form.sdlContent ? '✓ Schema loaded — click to replace' : 'Click to upload schema.graphql'}
                  </p>
                  <input ref={fileRef} type="file" accept=".graphql,.gql,.sdl,.txt" onChange={handleFile} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or paste SDL content</label>
                <textarea
                  value={form.sdlContent}
                  onChange={e => setForm(f => ({ ...f, sdlContent: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="type Query { ... }"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Publish Schema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
