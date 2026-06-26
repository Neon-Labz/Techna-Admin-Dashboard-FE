'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MAX_SUBJECTS, isValidSubject } from '@/lib/teachers';

export function SubjectMultiSelect({
  selected,
  onChange,
  options,
  error,
}: {
  selected: string[];
  onChange: (subjects: string[]) => void;
  options: string[];
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLower = new Set(selected.map(s => s.toLowerCase()));
  const q = query.trim().toLowerCase();

  // Distinct options filtered by the search query (selected ones stay in the
  // list so they can be toggled off via their checkbox).
  const filtered = options.filter(o => o.toLowerCase().includes(q));

  const reachedMax = selected.length >= MAX_SUBJECTS;

  const isChecked = (subject: string) => selectedLower.has(subject.toLowerCase());

  const toggleSubject = (subject: string) => {
    const clean = subject.trim();
    if (!clean) return;
    if (isChecked(clean)) {
      onChange(selected.filter(s => s.toLowerCase() !== clean.toLowerCase()));
      return;
    }
    if (reachedMax) {
      toast.error(`You can select up to ${MAX_SUBJECTS} subjects`);
      return;
    }
    onChange([...selected, clean]);
  };

  // Allow typing a subject that is not in the module list (e.g. a brand new one)
  const canAddCustom =
    q.length > 0 &&
    !options.some(o => o.toLowerCase() === q) &&
    !selectedLower.has(q) &&
    isValidSubject(query.trim());

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full border rounded-lg bg-white flex items-center justify-between gap-2 text-left transition-colors hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-400' : 'border-[#E5E7EB]'}`}
        style={{ minHeight: '46px', padding: '6px 12px' }}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-base text-[#6B7280]">Select subjects</span>
          ) : (
            selected.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
              >
                {s}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={e => { e.stopPropagation(); toggleSubject(s); }}
                  className="hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#9CA3AF' }} />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <p className="mt-1" style={{ fontSize: '10px', lineHeight: '15px', color: '#9CA3AF' }}>
        {selected.length}/{MAX_SUBJECTS} selected · choose from module subjects
      </p>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canAddCustom) { toggleSubject(query.trim()); setQuery(''); }
                  }
                }}
                placeholder="Search subjects..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Options list with checkboxes */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && !canAddCustom && (
              <p className="px-3 py-2 text-sm text-gray-400">
                {options.length === 0 ? 'No module subjects available' : 'No matching subjects'}
              </p>
            )}
            {filtered.map((o, i) => {
              const checked = isChecked(o);
              const disabled = !checked && reachedMax;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleSubject(o)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {o}
                </button>
              );
            })}
            {canAddCustom && (
              <button
                type="button"
                onClick={() => { toggleSubject(query.trim()); setQuery(''); }}
                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                + Add &quot;{query.trim()}&quot;
              </button>
            )}
          </div>

          {/* Footer with Done button */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3 py-2">
            <span className="text-xs text-gray-400">{selected.length}/{MAX_SUBJECTS} selected</span>
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false); }}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
