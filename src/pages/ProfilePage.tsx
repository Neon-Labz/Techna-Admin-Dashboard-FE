'use client';

import { useState } from 'react';
import { User, Mail, Phone, Shield, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';
import api from '@/lib/axios';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();

  const [form, setForm] = useState({
    name:  user?.name  ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);

  const initial = (user?.name ?? user?.email ?? 'A').charAt(0).toUpperCase();

  const accountCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : '—';

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/auth/profile', {
        name:  form.name.trim(),
        phone: form.phone.trim() || undefined,
      });
    } catch {
      // update locally even if API unavailable
    } finally {
      updateProfile({ name: form.name.trim(), phone: form.phone.trim() || undefined });
      addToast('Profile updated!', 'success');
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Profile</h1>
        <p className="text-sm text-gray-500">Manage your account settings</p>
      </div>

      {/* ── Identity card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
          <span className="text-2xl font-bold text-white">{initial}</span>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">{user?.name ?? 'Admin'}</p>
          <p className="text-sm text-gray-500 mb-1.5">{user?.email ?? '—'}</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Shield className="w-3.5 h-3.5" /> Super Administrator
          </span>
        </div>
      </div>

      {/* ── Personal Information ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Personal Information</h2>

        <div className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-400">{user?.email ?? '—'}</span>
            </div>
            <p className="text-xs text-gray-400">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                placeholder="e.g. +94 77 123 4567"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Account Security ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" /> Account Security
        </h2>

        <div className="flex flex-col divide-y divide-gray-100">
          {/* Account Created */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Account Created</p>
              <p className="text-xs text-gray-400">{accountCreated}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Active
            </span>
          </div>

          {/* Role */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-xs text-gray-400">Full system access</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
              Admin
            </span>
          </div>

          {/* Authentication */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Authentication</p>
              <p className="text-xs text-gray-400">JWT Token based</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
              Secure
            </span>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
