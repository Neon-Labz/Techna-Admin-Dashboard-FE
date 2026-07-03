'use client';

import { useState } from 'react';
import { User, Mail, Phone, Shield, Save, LockKeyhole } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';
import api from '@/lib/axios';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
  });

  const [saving, setSaving] = useState(false);

  const initial = (user?.name ?? user?.email ?? 'S').charAt(0).toUpperCase();

  const accountCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : '6/2/2024';

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Name cannot be empty', 'error');
      return;
    }

    setSaving(true);

    try {
      await api.patch('/auth/profile', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      });
    } catch {
      // API unavailable irunthalum local update pannum
    } finally {
      updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      });
      addToast('Profile updated!', 'success');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl pb-24">
        <div className="mb-4">
          <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Admin Profile
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Manage your account settings and security preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 shadow-md">
                  <span className="text-2xl font-bold text-white">
                    {initial}
                  </span>
                </div>

                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold leading-tight text-slate-900">
                    {user?.name ?? 'Super Admin'}
                  </h2>
                  <p className="break-words text-sm text-slate-500">
                    {user?.email ?? 'admin@eduadmin.com'}
                  </p>
                  <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    <Shield className="h-3 w-3 shrink-0" />
                    <span className="truncate">Super Administrator</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
                <h2 className="text-base font-bold text-slate-800">
                  Personal Information
                </h2>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Full Name
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="min-w-0 w-full bg-transparent text-sm text-slate-800 outline-none"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Email Address
                    </label>
                    <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 truncate text-sm text-slate-400">
                        {user?.email ?? 'admin@eduadmin.com'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Phone Number
                    </label>
                    <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className="min-w-0 w-full bg-transparent text-sm text-slate-800 outline-none"
                        placeholder="+94 77 123 4567"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:px-7"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Personal Details'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-fit">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <LockKeyhole className="h-4 w-4 shrink-0 text-indigo-600" />
                Account Security
              </h2>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Account Created
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {accountCreated}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Active
                </span>
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Assigned Role
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    Super Admin
                  </p>
                  <p className="text-xs text-slate-400">
                    Full system access enabled
                  </p>
                </div>
                <span className="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Admin
                </span>
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Authentication
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    JWT Token based
                  </p>
                  <p className="text-xs text-slate-400">
                    Secure session management
                  </p>
                </div>
                <span className="w-fit rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                  Secure
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}