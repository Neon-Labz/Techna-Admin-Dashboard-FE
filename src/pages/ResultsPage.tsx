'use client';

import toast from 'react-hot-toast';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Send,
  Trash2,
  Edit2,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { resultsApi } from '@/api/results.api';
import { formatStudentId } from '@/utils/studentId';
import Modal from '@/components/ui/Modal';

type Student = {
  _id?: string;
  id?: string;
  studentId?: string;
  fullNameEnglish?: string;
  name?: string;
  batch?: string;
};

type ResultRow = {
  moduleName: string;
  examType: 'Mid exam' | 'Final exam';
  marks: number;
  grade?: 'A' | 'B' | 'C' | 'F';
};

type ResultItem = {
  _id?: string;
  id?: string;
  studentId: string;
  studentName: string;
  batch: string;
  modules: ResultRow[];
  createdAt?: string;
};

type FormRow = {
  moduleName: string;
  examType: 'Mid exam' | 'Final exam';
  marks: string;
};

const emptyRow: FormRow = {
  moduleName: '',
  examType: 'Mid exam',
  marks: '',
};

const calculateGrade = (marks: number) => {
  if (marks >= 75) return 'A';
  if (marks >= 65) return 'B';
  if (marks >= 35) return 'C';
  return 'F';
};

const gradeClass = (grade?: string) => {
  if (grade === 'A') return 'bg-green-50 text-green-700 border-green-200';
  if (grade === 'B') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (grade === 'C') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
};

type SelectOption = {
  value: string;
  label: string;
};

function CompactSelect({
  value,
  options,
  placeholder,
  onChange,
  className = '',
}: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
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

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm outline-none focus:border-blue-500"
      >
        <span
          className={selected ? 'truncate text-slate-700' : 'truncate text-slate-400'}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 min-w-0 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                option.value === value
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'text-slate-700'
              }`}
            >
              <span className="block truncate">{option.label}</span>
            </button>
          ))}

          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No options</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdown, setStudentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultFormRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<{
    studentId: string;
    studentName: string;
    batch: string;
    modules: string[];
  } | null>(null);

  const [rows, setRows] = useState<FormRow[]>([{ ...emptyRow }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );

  const loadData = async () => {
    try {
      const [studentsData, resultsData] = await Promise.all([
        resultsApi.getStudents(),
        resultsApi.getAll(),
      ]);

      setStudents(studentsData);
      setResults(resultsData);
    } catch (error) {
      console.error('Load results error:', error);
      alert('Failed to load data');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const studentOptions = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();

    return students.filter((s) => {
      const sid = s.studentId?.toLowerCase() || '';
      const name = (s.fullNameEnglish || s.name || '').toLowerCase();
      if (!q) return true;
      return sid.includes(q) || name.includes(q);
    });
  }, [students, studentSearch]);

  const flatResults = useMemo(() => {
    return results.flatMap((result) =>
      (result.modules || []).map((module, index) => ({
        key: `${result._id || result.id}-${index}`,
        resultId: result._id || result.id || '',
        studentId: result.studentId,
        studentName: result.studentName,
        batch: result.batch,
        createdAt: result.createdAt,
        moduleName: module.moduleName,
        examType: module.examType,
        marks: module.marks,
        grade: module.grade,
      })),
    );
  }, [results]);

  const groupedResults = useMemo(() => {
    const q = search.toLowerCase().trim();

    return students
      .filter((student) => {
        if (q) {
          const sid = (student.studentId || '').toLowerCase();
          const name = (
            student.fullNameEnglish ||
            student.name ||
            ''
          ).toLowerCase();

          if (!sid.includes(q) && !name.includes(q)) return false;
        }

        if (batchFilter !== 'all' && student.batch !== batchFilter) {
          return false;
        }

        return true;
      })
      .map((student) => {
        const allItems = flatResults.filter(
          (r) => r.studentId === student.studentId,
        );

        const items = allItems.filter((item) => {
          if (moduleFilter !== 'all' && item.moduleName !== moduleFilter) {
            return false;
          }

          if (examFilter !== 'all' && item.examType !== examFilter) {
            return false;
          }

          return true;
        });

        return {
          studentId: student.studentId || '',
          studentName: student.fullNameEnglish || student.name || '-',
          batch: student.batch || '-',
          items,
          total: items.length,
          passed: items.filter((i) => i.grade !== 'F').length,
          failed: items.filter((i) => i.grade === 'F').length,
        };
      })
      .filter((group) => group.total > 0);
  }, [students, flatResults, search, batchFilter, moduleFilter, examFilter]);

  const batches = Array.from(
    new Set(students.map((s) => s.batch).filter((batch): batch is string => Boolean(batch))),
  );

  const modules = Array.from(
    new Set(flatResults.map((r) => r.moduleName).filter(Boolean)),
  );

  const selectStudent = async (student: Student) => {
    if (!student.studentId) return;

    try {
      const data = await resultsApi.getStudentModules(student.studentId);

      setSelectedStudent(data);
      setStudentSearch(`${data.studentId} - ${data.studentName}`);
      setStudentDropdown(false);
      setEditingId(null);
      setRows([
        {
          moduleName: data.modules?.[0] || '',
          examType: 'Mid exam',
          marks: '',
        },
      ]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to fetch student modules',
      );
    }
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        moduleName: selectedStudent?.modules?.[0] || '',
        examType: 'Mid exam',
        marks: '',
      },
    ]);
  };

  const updateRow = (index: number, key: keyof FormRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setRows([{ ...emptyRow }]);
    setEditingId(null);
  };

  const publishResult = async () => {
    if (!selectedStudent?.studentId) {
      toast.error('Please select student');
      return;
    }

    const modulesPayload = rows
      .filter((r) => r.moduleName && r.marks !== '')
      .map((r) => ({
        moduleName: r.moduleName,
        examType: r.examType,
        marks: Number(r.marks),
      }));

    if (modulesPayload.length === 0) {
      toast.error('Please add result rows');
      return;
    }

    const invalid = modulesPayload.find(
      (r) => Number.isNaN(r.marks) || r.marks < 0 || r.marks > 100,
    );

    if (invalid) {
      toast.error('Marks must be between 0 and 100');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await resultsApi.update(editingId, {
          studentId: selectedStudent.studentId,
          modules: modulesPayload,
        });
        toast.success('Result updated successfully');
      } else {
        await resultsApi.create({
          studentId: selectedStudent.studentId,
          modules: modulesPayload,
        });
        toast.success('Result published successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  const editResult = async (resultId: string) => {
    const result = results.find((r) => (r._id || r.id) === resultId);
    if (!result) return;

    try {
      const data = await resultsApi.getStudentModules(result.studentId);

      setSelectedStudent(data);
      setStudentSearch(`${data.studentId} - ${data.studentName}`);
      setRows(
        result.modules.map((m) => ({
          moduleName: m.moduleName,
          examType: m.examType,
          marks: String(m.marks),
        })),
      );
      setEditingId(resultId);
      requestAnimationFrame(() => {
        resultFormRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } catch {
      toast.error('Failed to edit result');
    }
  };

  const deleteResult = async (resultId: string) => {
    try {
      await resultsApi.remove(resultId);
      await loadData();
      toast.success('Result deleted');
    } catch {
      toast.error('Failed to delete result');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-5 sm:px-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Results</h1>
        <p className="mt-1 text-sm text-slate-500">Dashboard / Results</p>
      </div>

      <div
        ref={resultFormRef}
        className="scroll-mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-base font-bold text-slate-900">
          {editingId ? 'Edit Result' : 'Add New Result'}
        </h2>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Student ID
            </label>

            <div className="relative" ref={dropdownRef}>
              <input
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentDropdown(true);
                }}
                onFocus={() => setStudentDropdown(true)}
                placeholder="Search student ID..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm outline-none focus:border-blue-500"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />

              {studentDropdown && (
                <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg">
                  {studentOptions.map((student) => (
                    <button
                      key={student._id || student.id || student.studentId}
                      type="button"
                      onClick={() => selectStudent(student)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-blue-50"
                    >
                      <span className="truncate">
                        <span className="font-semibold text-blue-600">
                          {formatStudentId(student.studentId)}
                        </span>{' '}
                        - {student.fullNameEnglish || student.name || 'Student'}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {student.batch || '-'}
                      </span>
                    </button>
                  ))}

                  {studentOptions.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400">
                      No students found
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3">
            {selectedStudent ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {formatStudentId(selectedStudent.studentId)} - {selectedStudent.studentName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Batch:{' '}
                    <span className="font-semibold text-blue-600">
                      {selectedStudent.batch || '-'}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Select a student to load enrolled modules.
              </p>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-4 hidden overflow-visible rounded-lg border border-gray-100 lg:block">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Module / Subject</th>
                <th className="px-4 py-2">Exam Type</th>
                <th className="px-4 py-2">Marks</th>
                <th className="px-4 py-2">Result</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const marks = Number(row.marks);
                const grade =
                  row.marks !== '' &&
                  !Number.isNaN(marks) &&
                  marks >= 0 &&
                  marks <= 100
                    ? calculateGrade(marks)
                    : '-';

                return (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <CompactSelect
                        value={row.moduleName}
                        placeholder="Search module..."
                        onChange={(nextValue) =>
                          updateRow(index, 'moduleName', nextValue)
                        }
                        className="w-full"
                        options={(selectedStudent?.modules || []).map((module) => ({
                          value: module,
                          label: module,
                        }))}
                      />
                    </td>

                    <td className="px-4 py-2">
                      <CompactSelect
                        value={row.examType}
                        placeholder="Select exam type"
                        onChange={(nextValue) =>
                          updateRow(
                            index,
                            'examType',
                            nextValue as 'Mid exam' | 'Final exam',
                          )
                        }
                        className="w-full"
                        options={[
                          { value: 'Mid exam', label: 'MID EXAM' },
                          { value: 'Final exam', label: 'FINAL EXAM' },
                        ]}
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.marks}
                        onChange={(e) =>
                          updateRow(index, 'marks', e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex min-w-12 justify-center rounded-lg border px-3 py-1 font-semibold ${gradeClass(
                          grade,
                        )}`}
                      >
                        {grade}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-4 lg:hidden">
          {rows.map((row, index) => {
            const marks = Number(row.marks);
            const grade =
              row.marks !== '' &&
              !Number.isNaN(marks) &&
              marks >= 0 &&
              marks <= 100
                ? calculateGrade(marks)
                : '-';

            return (
              <div
                key={index}
                className="rounded-xl border border-gray-100 bg-slate-50/70 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    Subject {index + 1}
                  </p>

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Module / Subject
                    </label>
                    <CompactSelect
                      value={row.moduleName}
                      placeholder="Search module..."
                      onChange={(nextValue) =>
                        updateRow(index, 'moduleName', nextValue)
                      }
                      options={(selectedStudent?.modules || []).map((module) => ({
                        value: module,
                        label: module,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Exam Type
                    </label>
                    <CompactSelect
                      value={row.examType}
                      placeholder="Select exam type"
                      onChange={(nextValue) =>
                        updateRow(
                          index,
                          'examType',
                          nextValue as 'Mid exam' | 'Final exam',
                        )
                      }
                      options={[
                        { value: 'Mid exam', label: 'MID EXAM' },
                        { value: 'Final exam', label: 'FINAL EXAM' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Marks
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.marks}
                      onChange={(e) =>
                        updateRow(index, 'marks', e.target.value)
                      }
                      placeholder="Enter marks"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Result
                    </label>
                    <span
                      className={`inline-flex min-w-12 justify-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${gradeClass(
                        grade,
                      )}`}
                    >
                      {grade}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addRow}
            disabled={!selectedStudent}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>

          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={publishResult}
              disabled={saving || !selectedStudent}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Result'
                  : 'Publish Result'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Results List
          </h2>

          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 md:w-44"
            />

            <CompactSelect
              value={batchFilter}
              placeholder="All Batches"
              onChange={setBatchFilter}
              className="w-full md:w-36"
              options={[
                { value: 'all', label: 'All Batches' },
                ...batches.map((batch) => ({ value: batch, label: batch })),
              ]}
            />

            <CompactSelect
              value={moduleFilter}
              placeholder="All Modules"
              onChange={setModuleFilter}
              className="w-full md:flex-1"
              options={[
                { value: 'all', label: 'All Modules' },
                ...modules.map((module) => ({ value: module, label: module })),
              ]}
            />

            <CompactSelect
              value={examFilter}
              placeholder="ALL EXAM TYPES"
              onChange={setExamFilter}
              className="w-full md:w-40"
              options={[
                { value: 'all', label: 'ALL EXAM TYPES' },
                { value: 'Mid exam', label: 'MID EXAM' },
                { value: 'Final exam', label: 'FINAL EXAM' },
              ]}
            />

            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 md:w-auto">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

       {/* Desktop Results Table */}
<div className="hidden overflow-hidden rounded-xl border border-gray-100 xl:block">
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
      <tr>
        <th className="px-4 py-3">Student ID</th>
        <th className="px-4 py-3">Student Name</th>
        <th className="px-4 py-3">Batch</th>
        <th className="px-4 py-3">Total</th>
        <th className="px-4 py-3">Passed</th>
        <th className="px-4 py-3">Failed</th>
        <th className="px-4 py-3 text-center">Action</th>
      </tr>
    </thead>

    <tbody>
      {groupedResults.map((group) => {
        const isOpen = expandedStudentId === group.studentId;

        return (
          <Fragment key={group.studentId}>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStudentId(isOpen ? null : group.studentId)
                  }
                  className="font-bold text-blue-600 underline-offset-4 hover:underline"
                >
                  {group.studentId}
                </button>
              </td>

              <td className="px-4 py-4 font-semibold text-slate-900">
                {group.studentName}
              </td>

              <td className="px-4 py-4 text-slate-600">{group.batch}</td>

              <td className="px-4 py-4">{group.total}</td>

              <td className="px-4 py-4">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  {group.passed}
                </span>
              </td>

              <td className="px-4 py-4">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {group.failed}
                </span>
              </td>

              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStudentId(isOpen ? null : group.studentId)
                  }
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </td>
            </tr>

            {isOpen && (
              <tr>
                <td colSpan={7} className="bg-slate-50 px-6 py-4">
                  <div className="rounded-xl border border-gray-100 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Module</th>
                          <th className="px-4 py-3">Exam Type</th>
                          <th className="px-4 py-3">Marks</th>
                          <th className="px-4 py-3">Result</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.items.map((item, index) => (
                          <tr key={item.key} className="border-t border-gray-100">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">
                              {item.moduleName}
                            </td>
                            <td className="px-4 py-3">{item.examType.toUpperCase()}</td>
                            <td className="px-4 py-3">{item.marks}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-lg border px-3 py-1 font-semibold ${gradeClass(
                                  item.grade,
                                )}`}
                              >
                                {item.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => editResult(item.resultId)}
                                  className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteId(item.resultId)}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}

      {groupedResults.length === 0 && (
        <tr>
          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
            No results found.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

{/* Mobile + iPad Results Cards */}
<div className="space-y-3 xl:hidden">
  {groupedResults.map((group) => {
    const isOpen = expandedStudentId === group.studentId;

    return (
      <div
        key={group.studentId}
        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() =>
                setExpandedStudentId(isOpen ? null : group.studentId)
              }
              className="text-base font-bold text-blue-600"
            >
              {group.studentId}
            </button>

            <p className="mt-1 break-words font-semibold text-slate-900">
              {group.studentName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Batch : {group.batch}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setExpandedStudentId(isOpen ? null : group.studentId)
            }
            className="shrink-0 rounded-lg bg-slate-100 p-2 text-blue-600"
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 font-bold text-slate-900">{group.total}</p>
          </div>

          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-xs text-green-700">Passed</p>
            <p className="mt-1 font-bold text-green-700">{group.passed}</p>
          </div>

          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-xs text-red-700">Failed</p>
            <p className="mt-1 font-bold text-red-700">{group.failed}</p>
          </div>
        </div>

        {isOpen && (
          <div className="mt-4 space-y-3">
            {group.items.length > 0 ? (
              group.items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-gray-100 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-400">
                        #{index + 1}
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-slate-900">
                        {item.moduleName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.examType.toUpperCase()} • {formatDate(item.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg border px-3 py-1 text-sm font-semibold ${gradeClass(
                        item.grade,
                      )}`}
                    >
                      {item.grade}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Marks:{' '}
                      <span className="font-bold text-slate-900">
                        {item.marks}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editResult(item.resultId)}
                        className="rounded-lg bg-white p-2 text-indigo-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteResult(item.resultId)}
                        className="rounded-lg bg-white p-2 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-400">
                No result records.
              </p>
            )}
          </div>
        )}
      </div>
    );
  })}

  {groupedResults.length === 0 && (
    <p className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-slate-400">
      No results found.
    </p>
  )}
</div>
      </div>
     <Modal
  isOpen={!!deleteId}
  onClose={() => setDeleteId(null)}
  title="Delete Result"
  size="md"
  closeOnBackdrop={false}
>
  <div className="px-2 py-2 text-center">
    <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
      <Trash2 className="h-8 w-8 text-red-600" />
    </div>

    <h3 className="mb-4 text-lg font-bold text-slate-900">
      Remove this result?
    </h3>

    <p className="mx-auto mb-8 max-w-xs text-sm leading-6 text-slate-500">
      This will permanently delete the result record.
    </p>

    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setDeleteId(null)}
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={async () => {
          if (deleteId) {
            await deleteResult(deleteId);
            setDeleteId(null);
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
