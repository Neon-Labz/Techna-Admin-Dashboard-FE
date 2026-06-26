'use client';
import { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Module, LectureVideo } from '../types';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, BookOpen, Play, Upload, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const BATCHES = ['May 2024 Batch', 'September 2024 Batch', 'January 2025 Batch', 'May 2025 Batch'];

export default function ModulesPage() {
  const { modules, teachers, videos, addModule, updateModule, deleteModule, addVideo, deleteVideo, students } = useDataStore();
  const [tab, setTab] = useState<'modules' | 'videos'>('modules');
  const [search, setSearch] = useState('');
  const [modModalOpen, setModModalOpen] = useState(false);
  const [vidModalOpen, setVidModalOpen] = useState(false);
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [deleteConfirmMod, setDeleteConfirmMod] = useState<string | null>(null);

  const [modForm, setModForm] = useState<Omit<Module, 'id' | 'videos'>>({
    name: '', teacherId: '', teacherName: '', description: '', duration: '', fee: 0, batch: BATCHES[0], status: 'active', createdAt: new Date().toISOString().split('T')[0],
  });

  const [vidForm, setVidForm] = useState<Omit<LectureVideo, 'id'>>({
    title: '', moduleId: '', moduleName: '', batch: BATCHES[0], thumbnailUrl: '', videoUrl: '', s3Key: '', uploadedAt: new Date().toISOString(), duration: '',
  });

  const filteredMods = modules.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.batch.toLowerCase().includes(search.toLowerCase()));
  const filteredVids = videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase()) || v.moduleName.toLowerCase().includes(search.toLowerCase()));

  const openAddMod = () => {
    setModForm({ name: '', teacherId: '', teacherName: '', description: '', duration: '', fee: 0, batch: BATCHES[0], status: 'active', createdAt: new Date().toISOString().split('T')[0] });
    setEditModule(null);
    setModModalOpen(true);
  };
  const openEditMod = (m: Module) => { setModForm({ ...m }); setEditModule(m); setModModalOpen(true); };

  const handleModSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === modForm.teacherId);
    const updated = { ...modForm, teacherName: teacher?.name || '' };
    if (editModule) { updateModule(editModule.id, updated); toast.success('Module updated!'); }
    else { addModule(updated); toast.success('Module created!'); }
    setModModalOpen(false);
  };

  const handleVidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mod = modules.find(m => m.id === vidForm.moduleId);
    addVideo({ ...vidForm, moduleName: mod?.name || '', batch: mod?.batch || BATCHES[0], uploadedAt: new Date().toISOString() });
    toast.success('Lecture video added!');
    setVidModalOpen(false);
    setVidForm({ title: '', moduleId: '', moduleName: '', batch: BATCHES[0], thumbnailUrl: '', videoUrl: '', s3Key: '', uploadedAt: new Date().toISOString(), duration: '' });
  };

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modules & Lectures</h1>
          <p className="text-gray-500 text-sm">{modules.length} modules · {videos.length} videos</p>
        </div>
        <div className="flex gap-2">
          {tab === 'modules' ? (
            <button onClick={openAddMod} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> New Module
            </button>
          ) : (
            <button onClick={() => setVidModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Upload className="w-4 h-4" /> Upload Video
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        <button onClick={() => setTab('modules')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'modules' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
          <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Modules</span>
        </button>
        <button onClick={() => setTab('videos')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'videos' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
          <span className="flex items-center gap-2"><Play className="w-4 h-4" /> Lecture Videos</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
      </div>

      {/* Modules Tab */}
      {tab === 'modules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredMods.map(m => {
            const enrolled = students.filter(s => s.modules.includes(m.id)).length;
            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{m.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">{m.description}</p>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <p>👨‍🏫 {m.teacherName}</p>
                  <p>📅 {m.batch}</p>
                  <p>⏱ {m.duration}</p>
                  <p>💰 LKR {m.fee.toLocaleString()}</p>
                  <p>👥 {enrolled} students enrolled</p>
                  <p>🎬 {m.videos.length} videos</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEditMod(m)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteConfirmMod(m.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
          {filteredMods.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No modules found</p></div>
          )}
        </div>
      )}

      {/* Videos Tab */}
      {tab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVids.map(v => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="relative bg-gray-900 h-36 flex items-center justify-center">
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    <Play className="w-10 h-10 mb-1 opacity-50" />
                    <span className="text-xs">No thumbnail</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 text-sm">{v.title}</h3>
                <p className="text-xs text-indigo-600 mt-1">{v.moduleName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{v.batch}</p>
                {v.s3Key && <p className="text-xs text-gray-400 mt-1 font-mono truncate">S3: {v.s3Key}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{new Date(v.uploadedAt).toLocaleDateString()}</span>
                  <button onClick={() => { deleteVideo(v.id); toast.success('Video removed'); }} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredVids.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400"><Play className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No videos uploaded yet</p></div>
          )}
        </div>
      )}

      {/* Module Add/Edit Modal */}
      <Modal isOpen={modModalOpen} onClose={() => setModModalOpen(false)} title={editModule ? 'Edit Module' : 'Create New Module'} size="xl">
        <form onSubmit={handleModSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { field: 'name', label: 'Module Name' },
            { field: 'description', label: 'Description' },
            { field: 'duration', label: 'Duration (e.g. 6 months)' },
          ].map(({ field, label }) => (
            <div key={field} className={field === 'description' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="text" value={(modForm as Record<string, unknown>)[field] as string || ''} onChange={e => setModForm(f => ({ ...f, [field]: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fee (LKR)</label>
            <input type="number" value={modForm.fee} onChange={e => setModForm(f => ({ ...f, fee: Number(e.target.value) }))} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
            <select value={modForm.teacherId} onChange={e => setModForm(f => ({ ...f, teacherId: e.target.value }))} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Select teacher...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select value={modForm.batch} onChange={e => setModForm(f => ({ ...f, batch: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              {BATCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={modForm.status} onChange={e => setModForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2 flex gap-3 pt-1">
            <button type="button" onClick={() => setModModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">{editModule ? 'Update' : 'Create'} Module</button>
          </div>
        </form>
      </Modal>

      {/* Video Upload Modal */}
      <Modal isOpen={vidModalOpen} onClose={() => setVidModalOpen(false)} title="Upload Lecture Video" size="lg">
        <form onSubmit={handleVidSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-600">
            📦 Videos are stored on Amazon S3. Enter the S3 URL or key below.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video Title</label>
            <input type="text" required value={vidForm.title} onChange={e => setVidForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="e.g. Lesson 1 - Introduction" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select required value={vidForm.moduleId} onChange={e => setVidForm(f => ({ ...f, moduleId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Select module...</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name} ({m.batch})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S3 Video URL</label>
            <input type="url" value={vidForm.videoUrl} onChange={e => setVidForm(f => ({ ...f, videoUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="https://s3.amazonaws.com/bucket/video.mp4" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S3 Thumbnail URL</label>
            <input type="url" value={vidForm.thumbnailUrl} onChange={e => setVidForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="https://s3.amazonaws.com/bucket/thumb.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S3 Key</label>
            <input type="text" value={vidForm.s3Key} onChange={e => setVidForm(f => ({ ...f, s3Key: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono" placeholder="videos/english/lesson-1.mp4" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <input type="text" value={vidForm.duration} onChange={e => setVidForm(f => ({ ...f, duration: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="e.g. 45:00" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setVidModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Upload Video</button>
          </div>
        </form>
      </Modal>

      {/* Delete Module Confirm */}
      <Modal isOpen={!!deleteConfirmMod} onClose={() => setDeleteConfirmMod(null)} title="Delete Module" size="sm">
        <p className="text-gray-600 text-sm mb-5">Delete this module? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteConfirmMod(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={() => { deleteConfirmMod && deleteModule(deleteConfirmMod); setDeleteConfirmMod(null); toast.success('Module deleted'); }} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
