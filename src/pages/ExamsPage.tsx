'use client';
import { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Exam } from '../types';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, ClipboardList, Download, Calendar, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const BATCHES = ['May 2024 Batch', 'September 2024 Batch', 'January 2025 Batch', 'May 2025 Batch'];

const emptyExam: Omit<Exam, 'id'> = {
  title: '', moduleId: '', moduleName: '', batch: BATCHES[0], date: '', startTime: '09:00', endTime: '11:00',
  venue: '', description: '', totalMarks: 100, status: 'upcoming', createdAt: new Date().toISOString(),
};

export default function ExamsPage() {
  const { exams, modules, addExam, updateExam, deleteExam } = useDataStore();
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<Omit<Exam, 'id'>>(emptyExam);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = exams.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.moduleName.toLowerCase().includes(search.toLowerCase());
    const matchBatch = !filterBatch || e.batch === filterBatch;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchBatch && matchStatus;
  });

  const openAdd = () => { setForm(emptyExam); setEditExam(null); setModalOpen(true); };
  const openEdit = (e: Exam) => { setForm({ ...e }); setEditExam(e); setModalOpen(true); };

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    const mod = modules.find(m => m.id === form.moduleId);
    const updated = { ...form, moduleName: mod?.name || '' };
    if (editExam) { updateExam(editExam.id, updated); toast.success('Exam updated!'); }
    else { addExam(updated); toast.success('Exam published!'); }
    setModalOpen(false);
  };

  const downloadTimetable = () => {
    if (filtered.length === 0) { toast.error('No exams to export'); return; }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();

    // Header
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, w, 22, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Techna', w / 2, 10, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Examination Timetable', w / 2, 17, { align: 'center' });

    let y = 35;
    pdf.setFontSize(9);

    const headers = ['Exam', 'Module', 'Batch', 'Date', 'Time', 'Venue', 'Marks', 'Status'];
    const colW = [35, 25, 40, 22, 28, 20, 15, 15];
    let x = 10;

    pdf.setFillColor(240, 240, 255);
    pdf.rect(8, y - 5, w - 16, 8, 'F');
    pdf.setTextColor(79, 70, 229);
    headers.forEach((h, i) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text(h, x, y); x += colW[i]; });
    y += 6;

    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    pdf.setTextColor(30, 30, 30);
    sorted.forEach(e => {
      if (y > 270) { pdf.addPage(); y = 20; }
      x = 10;
      [e.title, e.moduleName, e.batch, e.date, `${e.startTime}-${e.endTime}`, e.venue, `${e.totalMarks}`, e.status].forEach((cell, i) => {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
        pdf.text(cell, x, y);
        x += colW[i];
      });
      y += 7;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(8, y - 2, w - 8, y - 2);
    });

    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(7);
    pdf.text(`Generated on ${new Date().toLocaleDateString()} · Techna`, w / 2, 287, { align: 'center' });

    pdf.save('exam-timetable.pdf');
    toast.success('Timetable downloaded!');
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
          <button onClick={downloadTimetable} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Timetable PDF
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Publish Exam
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exams..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
        </div>
        <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Batches</option>
          {BATCHES.map(b => <option key={b}>{b}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Exam Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(e => (
          <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex flex-col items-center justify-center text-white">
                  <span className="text-sm font-bold">{new Date(e.date).getDate()}</span>
                  <span className="text-xs opacity-80">{new Date(e.date).toLocaleString('default', { month: 'short' })}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{e.title}</h3>
                  <p className="text-sm text-indigo-600">{e.moduleName}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[e.status]}`}>{e.status}</span>
            </div>

            <div className="space-y-1.5 text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" />{e.date} · {e.startTime} – {e.endTime}</p>
              <p>📍 {e.venue}</p>
              <p>📊 Total Marks: {e.totalMarks}</p>
              <p>🎓 {e.batch}</p>
              {e.description && <p className="text-gray-400 text-xs">{e.description}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => openEdit(e)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setDeleteConfirm(e.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium">
                <Trash2 className="w-3.5 h-3.5" /> Delete
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editExam ? 'Edit Exam' : 'Publish New Exam'} size="xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
            <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select required value={form.moduleId} onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Select module...</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              {BATCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
            <input type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Exam['status'] }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">{editExam ? 'Update' : 'Publish'} Exam</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Exam" size="sm">
        <p className="text-gray-600 text-sm mb-5">Are you sure you want to delete this exam?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={() => { deleteConfirm && deleteExam(deleteConfirm); setDeleteConfirm(null); toast.success('Exam deleted'); }} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
