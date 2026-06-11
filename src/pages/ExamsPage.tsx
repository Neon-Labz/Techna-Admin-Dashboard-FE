'use client';

import { useEffect, useState } from 'react';
import type { Exam, Module } from '../types';
import Modal from '../components/ui/Modal';
import {
  Plus,
  Edit2,
  Trash2,
  ClipboardList,
  Download,
  Calendar,
  Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { examApi } from '@/api/exam.api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const BATCHES = [
  'May 2024 Batch',
  'September 2024 Batch',
  'January 2025 Batch',
  'May 2025 Batch',
];

const emptyExam: Omit<Exam, 'id'> = {
  title: '',
  moduleId: '',
  moduleName: '',
  batch: BATCHES[0],
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  venue: '',
  description: '',
  totalMarks: 100,
  status: 'upcoming',
  createdAt: new Date().toISOString(),
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<Omit<Exam, 'id'>>(emptyExam);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchExams = async () => {
  try {
    const examsArray = await examApi.getAll();

    setExams(
      examsArray.map((exam: any) => ({
        ...exam,
        id: exam.id || exam._id,
      }))
    );
  } catch (error) {
    toast.error('Failed to load exams');
    console.error(error);
  }
};

const fetchModules = async () => {
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken');

    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/modules`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });

    if (!res.ok) {
      toast.error('Failed to load modules');
      setModules([]);
      return;
    }

    const result = await res.json();

    const modulesArray = Array.isArray(result)
      ? result
      : result.data || result.modules || [];

    setModules(
      modulesArray.map((module: any) => ({
        ...module,
        id: module.id || module._id,
        name: module.name || module.moduleName || 'Unnamed Module',
      }))
    );
  } catch (error) {
    toast.error('Failed to load modules');
    setModules([]);
  }
};

 
  useEffect(() => {
    fetchExams();
    fetchModules();
  }, []);

  const filtered = exams.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.moduleName.toLowerCase().includes(search.toLowerCase());

    const matchBatch = !filterBatch || e.batch === filterBatch;
    const matchStatus = !filterStatus || e.status === filterStatus;

    return matchSearch && matchBatch && matchStatus;
  });

  const openAdd = () => {
    setForm(emptyExam);
    setEditExam(null);
    setModalOpen(true);
  };

  const openEdit = (e: Exam) => {
    const { id, ...examData } = e;
    setForm(examData);
    setEditExam(e);
    setModalOpen(true);
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();

    try {
      const mod = modules.find((m) => m.id === form.moduleId);

      const payload = {
        title: form.title,
        moduleId: form.moduleId,
        moduleName: mod?.name || form.moduleName,
        batch: form.batch,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue,
        description: form.description || '',
        totalMarks: Number(form.totalMarks),
        status: form.status || 'upcoming',
        isPublished: true,
      };

            if (editExam) {
        await examApi.update(editExam.id, payload);
        toast.success('Exam updated!');
      } else {
        await examApi.create(payload);
        toast.success('Exam published!');
      }

      setModalOpen(false);
      fetchExams();
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    }
  };

  const handleDelete = async () => {
  if (!deleteConfirm) return;

  try {
await examApi.remove(deleteConfirm);
    toast.success('Exam deleted');
    setDeleteConfirm(null);
    fetchExams();
  } catch (error) {
    toast.error('Failed to delete exam');
    console.error(error);
  }
};

 const downloadTimetable = () => {
  if (filtered.length === 0) {
    toast.error('No exams to export');
    return;
  }

  const generatePdf = (
    img: HTMLImageElement | null,
    imgType: 'PNG' | 'JPEG' | null
  ) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();

    // Techna logo text color
   const leafBlue = { r: 0, g: 170, b: 230 };
   const technaBlue = { r: 0, g: 122, b: 204 };

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, w, h, 'F');

    pdf.setFillColor(leafBlue.r, leafBlue.g, leafBlue.b);
    pdf.rect(0, 0, w, 8, 'F');
    
    if (img && imgType) {
  const imgProps = pdf.getImageProperties(img);

  const logoWidth = 35; // adjust if needed
  const logoHeight = (imgProps.height * logoWidth) / imgProps.width;

  pdf.addImage(
    img,
    imgType,
    3, // x
    10, // y
    logoWidth,
    logoHeight
  );
}

    pdf.setTextColor(technaBlue.r, technaBlue.g, technaBlue.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('TECHNA', w / 2, 20, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(
      'Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549',
      w / 2,
      27,
      { align: 'center' }
    );

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(technaBlue.r, technaBlue.g, technaBlue.b);
    pdf.text('Examination Timetable', w / 2, 36, { align: 'center' });

    pdf.setDrawColor(220, 220, 230);
    pdf.line(14, 42, w - 14, 42);

    let y = 54;

    const headers = [
      'Exam',
      'Module',
      'Batch',
      'Date',
      'Time',
      'Venue',
      'Marks',
      'Status',
    ];

    const colW = [20, 55, 24, 20, 21, 20, 15, 18];

    pdf.setFillColor(240, 250, 255);
    pdf.roundedRect(10, y - 7, w - 20, 10, 2, 2, 'F');

    pdf.setTextColor(technaBlue.r, technaBlue.g, technaBlue.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);

    let x = 12;
    headers.forEach((head, i) => {
      pdf.text(head, x, y);
      x += colW[i];
    });

    y += 9;

    const sorted = [...filtered].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    sorted.forEach((e, index) => {
      if (y > h - 28) {
        pdf.addPage();
        y = 20;
      }

      x = 12;

      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.8);
      pdf.setTextColor(45, 45, 45);

      const row = [
        e.title,
        e.moduleName,
        e.batch,
        e.date,
        `${e.startTime}-${e.endTime}`,
        e.venue,
        `${e.totalMarks}`,
        e.status,
      ];

row.forEach((cell, i) => {
  const text = String(cell || '-');

  pdf.text(text, x, y);

  x += colW[i];
});

      y += 8;

      pdf.setDrawColor(235, 235, 235);
      pdf.line(10, y - 4, w - 10, y - 4);
    });

    pdf.setDrawColor(220, 220, 230);
    pdf.line(14, h - 18, w - 14, h - 18);

    pdf.setFontSize(7.5);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} · TECHNA`,
      w / 2,
      h - 10,
      { align: 'center' }
    );

    pdf.save('exam-timetable.pdf');
    toast.success('Timetable downloaded!');
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/logo.png';

  img.onload = () => generatePdf(img, 'PNG');

  img.onerror = () => {
    const fallback = new Image();
    fallback.crossOrigin = 'anonymous';
    fallback.src = '/logo.jpeg';

    fallback.onload = () => generatePdf(fallback, 'JPEG');
    fallback.onerror = () => generatePdf(null, null);
  };
};
const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Examinations</h1>
          <p className="text-gray-500 text-sm">{exams.length} total exams</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadTimetable}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Timetable PDF
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Publish Exam
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          />
        </div>

        <select
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Batches</option>
          {BATCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex flex-col items-center justify-center text-white">
                  <span className="text-sm font-bold">
                    {new Date(e.date).getDate()}
                  </span>
                  <span className="text-xs opacity-80">
                    {new Date(e.date).toLocaleString('default', {
                      month: 'short',
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800">{e.title}</h3>
                  <p className="text-sm text-indigo-600">{e.moduleName}</p>
                </div>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusColors[e.status]
                }`}
              >
                {e.status}
              </span>
            </div>

            <div className="space-y-1.5 text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {e.date} · {e.startTime} – {e.endTime}
              </p>
              <p>📍 {e.venue}</p>
              <p>📊 Total Marks: {e.totalMarks}</p>
              <p>🎓 {e.batch}</p>
              {e.description && (
                <p className="text-gray-400 text-xs">{e.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEdit(e)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                onClick={() => setDeleteConfirm(e.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No exams found</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editExam ? 'Edit Exam' : 'Publish New Exam'}
        size="xl"
      >
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module
            </label>
            <select
              required
              value={form.moduleId}
              onChange={(e) =>
                setForm((f) => ({ ...f, moduleId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Select module...</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch
            </label>
            <select
              value={form.batch}
              onChange={(e) =>
                setForm((f) => ({ ...f, batch: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              {BATCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) =>
                setForm((f) => ({ ...f, venue: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, startTime: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, endTime: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Marks
            </label>
            <input
              type="number"
              value={form.totalMarks}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  totalMarks: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as Exam['status'],
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description optional
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              {editExam ? 'Update' : 'Publish'} Exam
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Exam"
        size="sm"
      >
        <p className="text-gray-600 text-sm mb-5">
          Are you sure you want to delete this exam?
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}