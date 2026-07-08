'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Edit2,
  Megaphone,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  announcementApi,
  type Announcement,
} from '@/api/announcement.api';

const emptyForm: Announcement = {
  title: '',
  date: '',
  audience: 'All Students',
  batch: 'None',
  content: '',
  author: 'Super Admin',
};

export default function AnnouncementsPage() {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [form, setForm] = useState<Announcement>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterBatch, setFilterBatch] = useState('All');

  const loadAnnouncements = async () => {
    try {
      const data = await announcementApi.getAll();
      setAnnouncements(data);
    } catch (error) {
      console.log('Announcements load error:', error);
      toast.error('Announcements load failed');
    }
  };

  const loadBatches = useCallback(async () => {
    try {
      const batchData = await announcementApi.getBatches();
      setBatches(Array.isArray(batchData) ? batchData : []);
    } catch (error) {
      console.log('Batch load error:', error);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
    loadBatches();
  }, [loadBatches]);

  const filteredAnnouncements = useMemo(() => {
    if (filterBatch === 'All') return announcements;

    if (filterBatch === 'All Students') {
      return announcements.filter(
        (item) =>
          item.audience === 'All Students' &&
          (!item.batch || item.batch === 'None'),
      );
    }

    return announcements.filter(
      (item) => item.audience === 'All Students' && item.batch === filterBatch,
    );
  }, [announcements, filterBatch]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    if (!form.date) return toast.error('Date required');
    if (!form.content.trim()) return toast.error('Content required');

    const payload: Announcement = {
      ...form,
      audience: 'All Students',
      batch: form.batch || 'None',
      author: form.author || 'Super Admin',
    };

    try {
      setLoading(true);

      if (editingId) {
        await announcementApi.update(editingId, payload);
        toast.success('Announcement updated successfully');
      } else {
        await announcementApi.create(payload);
        toast.success('Announcement posted successfully');
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAnnouncements();
    } catch (error) {
      console.log('Save error:', error);
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Announcement) => {
    setEditingId(item._id || item.id || null);
    setForm({
      title: item.title || '',
      date: item.date || '',
      audience: 'All Students',
      batch: item.batch || 'None',
      content: item.content || '',
      author: item.author || 'Super Admin',
    });

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleDelete = async (item: Announcement) => {
    const id = item._id || item.id;
    if (!id) return;

    try {
      await announcementApi.remove(id);
      toast.success('Announcement deleted successfully');
      await loadAnnouncements();
    } catch (error) {
      console.log('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-5 bg-slate-50 px-4 py-5 sm:p-6">
      <h1 className="text-xl font-bold text-slate-900">Announcements</h1>

      <div
        ref={formRef}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7"
      >
        <div className="mb-5 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-800">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-800">
                Target Audience
              </label>
              <div className="relative">
                <select
                  value={form.batch}
                  onClick={loadBatches}
                  onFocus={loadBatches}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      audience: 'All Students',
                      batch: e.target.value,
                    })
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-slate-300 px-4 pr-10 text-sm text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="None">All Students</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Typing..."
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            {editingId && (
              <button
                onClick={cancelEdit}
                type="button"
                className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingId ? 'Update Announcement' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <h2 className="text-lg font-bold text-slate-900">
            Recent Announcements
          </h2>

          <div className="relative w-full sm:w-auto">
            <select
              value={filterBatch}
              onClick={loadBatches}
              onFocus={loadBatches}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-500 sm:min-w-36"
            >
              <option value="All">All</option>
              <option value="All Students">All Students</option>
              {batches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
          </div>
        </div>

        {/* Mobile card view */}
        <div className="space-y-3 p-4 md:hidden">
          {filteredAnnouncements.map((item) => (
            <div
              key={item._id || item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded-lg bg-indigo-100 p-2 text-indigo-600"
                    type="button"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    className="rounded-lg bg-red-100 p-2 text-red-500"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                <p>
                  <span className="font-bold text-slate-800">Audience:</span>{' '}
                  {item.batch && item.batch !== 'None'
                    ? item.batch
                    : 'All Students'}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Author:</span>{' '}
                  {item.author || 'Super Admin'}
                </p>
                <p className="break-words">
                  <span className="font-bold text-slate-800">Content:</span>{' '}
                  {item.content || '-'}
                </p>
              </div>
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No announcements found
            </p>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Date Posted</th>
                <th className="px-6 py-4">Announcement Title</th>
                <th className="px-6 py-4">Audience</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAnnouncements.map((item) => (
                <tr
                  key={item._id || item.id}
                  className="border-t border-slate-100 text-xs"
                >
                  <td className="px-6 py-5 text-slate-600">{item.date}</td>
                  <td className="px-6 py-5 font-semibold text-slate-900">
                    {item.title}
                  </td>
                  <td className="px-6 py-5 text-slate-600">
                    {item.batch && item.batch !== 'None'
                      ? item.batch
                      : 'All Students'}
                  </td>
                  <td className="px-6 py-5 text-slate-600">
                    {item.author || 'Super Admin'}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100"
                        type="button"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded bg-red-50 p-2 text-red-500 hover:bg-red-100"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAnnouncements.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No announcements found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span>
            Showing {filteredAnnouncements.length} of {announcements.length}{' '}
            entries
          </span>
          <div className="flex items-center gap-2">
            <button className="px-2 text-slate-400" type="button">
              &lt;
            </button>
            <span className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white">
              1
            </span>
            <button className="px-2 text-slate-400" type="button">
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}