'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export function TagInput({
  tags,
  onChange,
  placeholder,
  hint,
  showChevron = false,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
  showChevron?: boolean;
}) {
  const [val, setVal] = useState('');

  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          className="w-full border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-[#374151] placeholder:text-[#6B7280] bg-white"
          style={{ height: '46px', paddingLeft: '13px', paddingRight: showChevron ? '40px' : '13px' }}
        />
        {showChevron && (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#9CA3AF' }} />
        )}
      </div>
      {hint && (
        <p className="mt-1" style={{ fontSize: '10px', lineHeight: '15px', color: '#9CA3AF' }}>
          {hint}
        </p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
