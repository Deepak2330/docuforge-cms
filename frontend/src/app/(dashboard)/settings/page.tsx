'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, User } from 'lucide-react';
import { api } from '@/lib/api';

interface UserProfile {
  id: string; email: string; firstName: string; lastName: string;
  role: string; avatarUrl?: string; createdAt: string;
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/docuforge_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', avatarUrl: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        const data = await api.get<UserProfile>('/users/me', token ?? undefined);
        setProfile(data);
        setForm({ firstName: data.firstName, lastName: data.lastName, avatarUrl: data.avatarUrl ?? '' });
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const token = getToken();
      await api.patch(`/users/${profile?.id}`, form, token ?? undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">Settings saved successfully.</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <h2 className="font-medium text-gray-900">Profile</h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
              {form.firstName[0]}{form.lastName[0]}
            </div>
            <div>
              <p className="font-medium text-gray-900">{form.firstName} {form.lastName}</p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{profile?.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={profile?.email ?? ''} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
            <input type="url" value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/avatar.jpg" />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-medium text-gray-900">Account Info</h2>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-900">{profile ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-900">{profile?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
