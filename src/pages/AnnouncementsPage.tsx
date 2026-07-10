'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Megaphone,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  announcementApi,
  type Announcement,
} from '@/api/announcement.api';
import Modal from '@/components/ui/Modal';


const emptyForm: Announcement = {
  title: '',
  date: '',
  audience: 'All Students',
  batch: 'None',
  content: '',
  author: 'Super Admin',
};

type SelectOption = {
  value: string;
  label: string;
};

function CompactSelect({
  value,
  options,
  onChange,
  onOpen,
  className = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open) onOpen?.();
    setOpen((current) => !current);
  };

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-4 text-left text-sm text-slate-900 outline-none focus:border-indigo-500"
      >
        <span className="truncate">{selected?.label || value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-56 min-w-0 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full min-w-0 px-4 py-2 text-left text-sm hover:bg-indigo-50 ${
                option.value === value
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-slate-700'
              }`}
            >
              <span className="block truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

function CompactDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: Array<number | null> = Array.from(
      { length: startOffset },
      () => null,
    );

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(day);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const selectDay = (day: number) => {
    const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatDateValue(nextDate));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-4 text-left text-sm text-slate-900 outline-none focus:border-indigo-500"
      >
        <span className={value ? 'truncate' : 'truncate text-slate-400'}>
          {value || 'Select date'}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <p className="text-sm font-semibold text-slate-800">
              {viewDate.toLocaleString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </p>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayValue = day
                ? formatDateValue(
                    new Date(viewDate.getFullYear(), viewDate.getMonth(), day),
                  )
                : '';
              const selected = dayValue && dayValue === value;

              return day ? (
                <button
                  key={dayValue}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-indigo-50'
                  }`}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} className="h-8" />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnnouncementsPage() {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [form, setForm] = useState<Announcement>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterBatch, setFilterBatch] = useState('All');
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);


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
              <CompactDatePicker
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-800">
                Target Audience
              </label>
              <CompactSelect
                value={form.batch || 'None'}
                onOpen={loadBatches}
                onChange={(value) =>
                  setForm({
                    ...form,
                    audience: 'All Students',
                    batch: value,
                  })
                }
                options={[
                  { value: 'None', label: 'All Students' },
                  ...batches.map((batch) => ({ value: batch, label: batch })),
                ]}
              />
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

          <CompactSelect
            value={filterBatch}
            onOpen={loadBatches}
            onChange={setFilterBatch}
            className="w-full sm:w-44"
            options={[
              { value: 'All', label: 'All' },
              { value: 'All Students', label: 'All Students' },
              ...batches.map((batch) => ({ value: batch, label: batch })),
            ]}
          />
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
onClick={() => setDeleteItem(item)}
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
                        onClick={() => setDeleteItem(item)}
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
      <Modal
  isOpen={!!deleteItem}
  onClose={() => setDeleteItem(null)}
  title="Delete Announcement"
  size="md"
  closeOnBackdrop={false}
>
  <div className="px-2 py-2 text-center">
    <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
      <Trash2 className="h-8 w-8 text-red-600" />
    </div>

    <h3 className="mb-4 text-lg font-bold text-slate-900">
      Remove this announcement?
    </h3>

    <p className="mx-auto mb-8 max-w-xs text-sm leading-6 text-slate-500">
      This will permanently delete this announcement.
    </p>

    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setDeleteItem(null)}
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={async () => {
          if (deleteItem) {
            await handleDelete(deleteItem);
            setDeleteItem(null);
          }
        }}
        className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
      >
        Delete
      </button>
    </div>
  </div>
</Modal>
    </div>
  );
}
