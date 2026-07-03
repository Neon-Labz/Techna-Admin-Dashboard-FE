'use client';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export default function CompactDatePicker({
  value,
  onChange,
  max,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const ref = useRef<HTMLDivElement>(null);
  const maxDate = max ? parseDateValue(max) : null;

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
    const startOffset = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: Array<number | null> = Array.from(
      { length: startOffset },
      () => null,
    );

    for (let day = 1; day <= totalDays; day += 1) days.push(day);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-xs outline-none focus:ring-2 focus:ring-indigo-500 sm:rounded-xl sm:text-sm"
      >
        <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
        <span className={value ? 'truncate text-gray-700' : 'truncate text-gray-400'}>
          {value || 'Select date'}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-gray-800">
              {viewDate.toLocaleString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-gray-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="h-8" />;

              const date = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                day,
              );
              const dayValue = formatDateValue(date);
              const disabled = !!maxDate && date > maxDate;
              const selected = dayValue === value;

              return (
                <button
                  key={dayValue}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(dayValue);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : 'text-gray-700 hover:bg-indigo-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
