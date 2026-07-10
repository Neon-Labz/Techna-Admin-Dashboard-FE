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
    <div className="min-h-[calc(100vh-64px)] overflow-y-auto bg-[#F8FAFC] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold leading-[36px] tracking-[-0.75px] text-[#0F172A] sm:text-[30px]">
          Admin Profile
        </h1>
        <p className="mt-1 text-sm leading-6 text-[#64748B] sm:mt-2 sm:text-base">
          Manage your account settings and security preferences.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Profile Banner Card */}
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] sm:p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-[#4F46E5] shadow-[0px_20px_25px_-5px_#E0E7FF,0px_8px_10px_-6px_#E0E7FF] sm:h-[96px] sm:w-[96px]">
                <span className="text-3xl font-bold text-white sm:text-4xl">
                  {initial}
                </span>
              </div>

              <div className="min-w-0 text-center sm:text-left">
                <h2 className="text-xl font-bold leading-8 text-[#0F172A] sm:text-2xl">
                  {user?.name ?? 'Super Admin'}
                </h2>
                <p className="mt-0.5 text-sm font-medium leading-6 text-[#64748B] sm:text-base">
                  {user?.email ?? 'admin@eduadmin.com'}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-[3px] text-xs font-semibold text-[#4338CA] sm:mt-3">
                  <Shield className="h-3 w-3 shrink-0 text-[#4338CA]" />
                  Super Administrator
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information Form */}
          <div className="rounded-2xl border border-[rgba(226,232,240,0.6)] bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] sm:rounded-3xl">
            {/* Header */}
            <div className="rounded-t-2xl border-b border-[#F1F5F9] bg-[rgba(248,250,252,0.3)] px-5 py-4 sm:rounded-t-3xl sm:px-10 sm:py-6">
              <h2 className="text-lg font-bold leading-7 text-[#1E293B] sm:text-xl">
                Personal Information
              </h2>
            </div>

            {/* Form Body */}
            <div className="px-5 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-8">
              {/* Full Name */}
              <div className="mb-6 sm:mb-8">
                <label className="mb-2 block text-sm font-bold leading-5 text-[#334155]">
                  Full Name
                </label>
                <div className="flex h-[50px] items-center rounded-xl border border-[#E2E8F0] bg-white sm:h-[58px] sm:rounded-2xl">
                  <div className="flex w-[42px] items-center justify-center sm:w-[49px]">
                    <User className="h-5 w-5 text-[#94A3B8]" />
                  </div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="min-w-0 flex-1 bg-transparent pr-4 text-sm leading-6 text-[#1E293B] outline-none placeholder:text-[#94A3B8] sm:text-base"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Email + Phone row */}
              <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold leading-5 text-[#334155]">
                    Email Address
                  </label>
                  <div className="flex h-[50px] items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] sm:h-[58px] sm:rounded-2xl">
                    <div className="flex w-[42px] items-center justify-center sm:w-[49px]">
                      <Mail className="h-5 w-5 text-[#94A3B8]" />
                    </div>
                    <span className="min-w-0 flex-1 truncate pr-4 text-sm leading-6 text-[#94A3B8] sm:text-base">
                      {user?.email ?? 'admin@eduadmin.com'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold leading-5 text-[#334155]">
                    Phone Number
                  </label>
                  <div className="flex h-[50px] items-center rounded-xl border border-[#E2E8F0] bg-white sm:h-[58px] sm:rounded-2xl">
                    <div className="flex w-[42px] items-center justify-center sm:w-[49px]">
                      <Phone className="h-5 w-5 text-[#94A3B8]" />
                    </div>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="min-w-0 flex-1 bg-transparent pr-4 text-sm leading-6 text-[#1E293B] outline-none placeholder:text-[#94A3B8] sm:text-base"
                      placeholder="+94 77 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-6 sm:mt-8 flex justify-center sm:justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white shadow-[0px_20px_25px_-5px_#C7D2FE,0px_8px_10px_-6px_#C7D2FE] transition hover:bg-[#4338CA] disabled:opacity-50 sm:h-[56px] sm:w-auto sm:gap-3 sm:rounded-2xl sm:px-8 sm:text-base"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving…' : 'Save Personal Details'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Account Security */}
        <div className="rounded-2xl border border-[#F1F5F9] bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
          {/* Header */}
          <div className="rounded-t-2xl border-b border-[#F8FAFC] bg-[rgba(248,250,252,0.5)] px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="flex items-center gap-2 text-base font-semibold leading-7 text-[#1E293B] sm:text-lg">
              <LockKeyhole className="h-5 w-5 text-[#4F46E5]" />
              Account Security
            </h2>
          </div>

          {/* Security Rows */}
          <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
            {/* Account Created */}
            <div className="flex items-center justify-between rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-4 py-4 sm:px-[17px] sm:py-[17px]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] sm:text-xs">
                  Account Created
                </p>
                <p className="mt-[2px] text-sm font-semibold leading-5 text-[#334155]">
                  {accountCreated}
                </p>
              </div>
              <span className="ml-3 shrink-0 rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-[11px] py-[3px] text-xs font-bold text-[#15803D]">
                Active
              </span>
            </div>

            {/* Assigned Role */}
            <div className="flex items-center justify-between rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-4 py-4 sm:px-[17px] sm:py-[17px]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] sm:text-xs">
                  Assigned Role
                </p>
                <p className="mt-[2px] text-sm font-semibold leading-5 text-[#334155]">
                  Super Admin
                </p>
                <p className="mt-[2px] text-[10px] leading-[15px] text-[#94A3B8]">
                  Full system access enabled
                </p>
              </div>
              <span className="ml-3 shrink-0 rounded-full border border-[#C7D2FE] bg-[#E0E7FF] px-[11px] py-[3px] text-xs font-bold text-[#4338CA]">
                Admin
              </span>
            </div>

            {/* Authentication */}
            <div className="flex items-center justify-between rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-4 py-4 sm:px-[17px] sm:py-[17px]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] sm:text-xs">
                  Authentication
                </p>
                <p className="mt-[2px] text-sm font-semibold leading-5 text-[#334155]">
                  JWT Token based
                </p>
                <p className="mt-[2px] text-[10px] leading-[15px] text-[#94A3B8]">
                  Secure session management
                </p>
              </div>
              <span className="ml-3 shrink-0 rounded-full border border-[#E9D5FF] bg-[#F3E8FF] px-[11px] py-[3px] text-xs font-bold text-[#7E22CE]">
                Secure
              </span>
            </div>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
