import { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Teacher } from '../types';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, GraduationCap, Phone, Mail, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyTeacher: Omit<Teacher, 'id'> = {
  name: '', email: '', phone: '', subject: '', qualification: '',
  experience: '', address: '', joinDate: '', status: 'active',
};

export default function TeachersPage() {
  const { teachers, addTeacher, updateTeacher, deleteTeacher } = useDataStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Omit<Teacher, 'id'>>(emptyTeacher);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyTeacher); setEditTeacher(null); setModalOpen(true); };
  const openEdit = (t: Teacher) => { setForm({ ...t }); setEditTeacher(t); setModalOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTeacher) {
      updateTeacher(editTeacher.id, form);
      toast.success('Teacher updated!');
    } else {
      addTeacher(form);
      toast.success('Teacher added!');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteTeacher(id);
    setDeleteConfirm(null);
    toast.success('Teacher deleted');
  };

  const inp = (field: keyof Omit<Teacher, 'id'>, label: string, type = 'text', opts?: string[]) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {opts ? (
        <select value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
          <p className="text-gray-500 text-sm">{teachers.length} total teachers</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teachers..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-bold text-lg">{t.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium">{t.subject}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{t.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{t.phone}</div>
              <div className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-gray-400" />{t.qualification} · {t.experience}</div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setDeleteConfirm(t.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No teachers found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTeacher ? 'Edit Teacher' : 'Add New Teacher'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inp('name', 'Full Name')}
          {inp('email', 'Email', 'email')}
          {inp('phone', 'Phone')}
          {inp('subject', 'Subject')}
          {inp('qualification', 'Qualification')}
          {inp('experience', 'Experience (e.g. 5 years)')}
          {inp('address', 'Address')}
          {inp('joinDate', 'Join Date', 'date')}
          {inp('status', 'Status', 'text', ['active', 'inactive'])}
          <div className="md:col-span-2 flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              {editTeacher ? 'Update' : 'Add'} Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <p className="text-gray-600 text-sm mb-5">Are you sure you want to delete this teacher? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
