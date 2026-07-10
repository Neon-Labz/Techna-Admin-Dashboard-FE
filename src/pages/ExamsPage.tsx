'use client';

import { useEffect, useState } from 'react';
import type { Exam } from '../types';
import Modal from '../components/ui/Modal';
import DeleteModal from '../components/common/DeleteModal';
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
import api from '@/lib/axios';
import CompactSelect from '@/components/ui/CompactSelect';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import { useDataStore } from '@/store/dataStore';


export default function ExamsPage() {
  
  const { students, fetchStudents } = useDataStore();

  
  const BATCHES = Array.from(
    new Set(
      students.map((s: any) => s.batch).filter(Boolean),
    ),
  );

  const emptyExam: Omit<Exam, 'id'> = {
    title: '',
    moduleId: '',
    moduleName: '',
    batch: BATCHES[0] || '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    venue: '',
    description: '',
    totalMarks: 100,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
  };

  const [modules, setModules] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<Omit<Exam, 'id'>>(emptyExam);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadExams();
    loadModules();
    fetchStudents(); 
  }, []);

  const loadModules = async () => {
    try {
      const res: any = await api.get('/modules', { params: { status: 'active' } });
      // Interceptor returns the unwrapped value directly, not an AxiosResponse
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setModules(list);
    } catch (error) {
      console.error('Module API Error:', error);
      toast.error('Failed to load modules');
    }
  };
  const loadExams = async () => {
    try {
      const data = await examApi.getAll();

      const list = Array.isArray(data) ? data : [];

      const formatted = list.map((e: any) => ({
        id: e.id || e._id,
        title: e.title || '',
        moduleId: e.moduleId || '',
        moduleName: e.moduleName || '',
        batch: e.batch || '',
        date: e.date || '',
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        venue: e.venue || '',
        description: e.description || '',
        totalMarks: e.totalMarks || 100,
        status: e.status || 'upcoming',
        createdAt: e.createdAt || new Date().toISOString(),
      }));

      setExams(formatted);
    } catch (error) {
      console.error('Exam API Error:', error);
      toast.error('Failed to load exams');
    }
  };

  const filtered = exams.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.moduleName.toLowerCase().includes(search.toLowerCase());

    const matchBatch = !filterBatch || e.batch === filterBatch;

    return matchSearch && matchBatch;
  });

  const examToDelete = exams.find((e) => e.id === deleteConfirm);

  const openAdd = () => {
    setForm(emptyExam);
    setEditExam(null);
    setModalOpen(true);
  };

  const openEdit = (e: Exam) => {
    setForm({ ...e });
    setEditExam(e);
    setModalOpen(true);
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();

    try {
      const mod = modules.find(
        (m: any) => (m.id || m._id) === form.moduleId
      );

      const payload = {
        title: form.title.trim(),
        moduleId: form.moduleId,
        moduleName: mod?.name || mod?.moduleName || form.moduleName,
        batch: form.batch,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue,
        description: form.description,
        totalMarks: form.totalMarks ?? 100,
        status: form.status ?? 'upcoming',
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
      loadExams();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save exam';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await examApi.delete(deleteConfirm);
      toast.success('Exam deleted');
      setDeleteConfirm(null);
      loadExams();
    } catch (error) {
      console.error('Delete exam error:', error);
      toast.error('Failed to delete exam');
    } finally {
      setDeleting(false);
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

      const leafBlue = { r: 0, g: 170, b: 230 };
      const technaBlue = { r: 0, g: 122, b: 204 };

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, w, h, 'F');

      pdf.setFillColor(leafBlue.r, leafBlue.g, leafBlue.b);
      pdf.rect(0, 0, w, 8, 'F');

      if (img && imgType) {
  const imgProps = pdf.getImageProperties(img);

  const logoWidth = 55;
const logoHeight = (imgProps.height * logoWidth) / imgProps.width;

pdf.addImage(
  img,
  imgType,
  (w - logoWidth) / 2,
  0, 
  logoWidth,
  logoHeight
);
}

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      pdf.text(
  'Email: technatechnicalinstitute@gmail.com | Contact: +94 77 170 3549',
  w / 2,
  38, 
  { align: 'center' }
);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(technaBlue.r, technaBlue.g, technaBlue.b);
      pdf.text('Examination Timetable', w / 2, 50, {
  align: 'center',
});

      pdf.setDrawColor(220, 220, 230);
      pdf.line(14, 52, w - 14, 52);

      let y = 70;

      const headers = ['Exam', 'Module', 'Batch', 'Date', 'Time', 'Venue'];
      const colW = [25, 65, 28, 28, 28, 30];

      pdf.setFillColor(240, 250, 255);
      pdf.roundedRect(5, y - 7, w - 10, 10, 2, 2, 'F');

      pdf.setTextColor(technaBlue.r, technaBlue.g, technaBlue.b);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);

      let x = 8;
      headers.forEach((head, i) => {
        pdf.text(head, x, y);
        x += colW[i];
      });

      y += 9;

      const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

      sorted.forEach((e) => {
        if (y > h - 28) {
          pdf.addPage();
          y = 20;
        }

        x = 8;

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
        ];

        row.forEach((cell, i) => {
          const text = String(cell || '-');
          const fittedText = pdf.splitTextToSize(text, colW[i] - 2)[0] || '-';
          pdf.text(fittedText, x, y);
          x += colW[i];
        });

        y += 8;

        pdf.setDrawColor(235, 235, 235);
        pdf.line(5, y - 4, w - 5, y - 4);
      });

     // Footer blue background
pdf.setFillColor(leafBlue.r, leafBlue.g, leafBlue.b);
pdf.rect(0, h - 18, w, 18, 'F');

pdf.setFontSize(7.5);
pdf.setTextColor(255, 255, 255);

pdf.text(
  `Generated on ${new Date().toLocaleDateString()} · TECHNA`,
  w / 2,
  h - 8,
  { align: 'center' }
);

      pdf.save('exam-timetable.pdf');
      toast.success('Timetable downloaded!');
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/new.png';

    img.onload = () => generatePdf(img, 'PNG');

    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = 'anonymous';
      fallback.src = '/new.jpeg';

      fallback.onload = () => generatePdf(fallback, 'JPEG');
      fallback.onerror = () => generatePdf(null, null);
    };
  };

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
          <h1 className="text-2xl font-bold text-gray-800">Examinations</h1>
          <p className="text-gray-500 text-sm">{exams.length} total exams</p>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <button
            onClick={downloadTimetable}
          className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Timetable PDF
          </button>

          <button
            onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"          >
            <Plus className="w-4 h-4" /> Publish Exam
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

        <CompactSelect
          value={filterBatch}
          onChange={setFilterBatch}
          className="w-full sm:w-44"
          options={[
            { value: '', label: 'All Batches' },
            ...BATCHES.map((batch) => ({ value: batch, label: batch })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
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

            <div className="space-y-1.5 text-sm text-gray-600 mb-4 flex-1">
              <p className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {e.date} · {e.startTime} – {e.endTime}
              </p>
              <p>📍 {e.venue}</p>
              <p>🎓 {e.batch}</p>
              {e.description && (
                <p className="text-gray-400 text-xs">{e.description}</p>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => openEdit(e)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>

              <button
                onClick={() => setDeleteConfirm(e.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
<div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-16 text-gray-400">           
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
        height="content"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module
            </label>
            <CompactSelect
              value={form.moduleId}
              onChange={(value) => {
                const selectedModule = modules.find(
                  (m: any) => (m.id || m._id) === value,
                );

                setForm((f) => ({
                  ...f,
                  moduleId: value,
                  moduleName:
                    selectedModule?.name || selectedModule?.moduleName || '',
                }));
              }}
              options={[
                { value: '', label: 'Select module...' },
                ...modules.map((m: any) => ({
                  value: m.id || m._id,
                  label: m.name || m.moduleName,
                })),
              ]}
            />
            <select
              required
              value={form.moduleId}
              onChange={(e) => {
                const selectedModule = modules.find(
                  (m: any) => (m.id || m._id) === e.target.value
                );

                setForm((f) => ({
                  ...f,
                  moduleId: e.target.value,
                  moduleName:
                    selectedModule?.name || selectedModule?.moduleName || '',
                }));
              }}
              className="hidden"
            >
              <option value="">Select module...</option>

              {modules.map((m: any) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name || m.moduleName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch
            </label>
            <CompactSelect
              value={form.batch}
              onChange={(value) => setForm((f) => ({ ...f, batch: value }))}
              options={BATCHES.map((batch) => ({ value: batch, label: batch }))}
            />
            <select
              value={form.batch}
              onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
              className="hidden"
            >
              {BATCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
              {form.batch && !BATCHES.includes(form.batch) && (
                <option value={form.batch}>{form.batch}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <CompactDatePicker
              value={form.date}
              onChange={(value) => setForm((f) => ({ ...f, date: value }))}
            />
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              required
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description optional
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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

      <DeleteModal
        open={!!deleteConfirm}
        title="Delete Exam"
        itemName={examToDelete?.title}
        message="This will permanently delete the exam and cannot be undone."
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}