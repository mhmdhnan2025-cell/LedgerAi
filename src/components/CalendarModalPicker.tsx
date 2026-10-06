import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CalendarModalPickerProps {
  value: string; // "DD-MM-YYYY" or "YYYY-MM-DD"
  onChange: (formattedDate: string) => void;
  onClose: () => void;
  title?: string;
}

export const CalendarModalPicker: React.FC<CalendarModalPickerProps> = ({
  value,
  onChange,
  onClose,
  title = 'Select Date (تاریخ منتخب کریں)',
}) => {
  // Parse initial date
  const parseDate = (dStr: string): Date => {
    if (!dStr) return new Date();
    if (dStr.includes('-')) {
      const parts = dStr.split('-');
      if (parts[0].length === 2 && parts.length === 3) {
        // DD-MM-YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      } else if (parts[0].length === 4 && parts.length === 3) {
        // YYYY-MM-DD
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    const fallback = new Date(dStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  const initialDate = parseDate(value);
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Previous month days for padding
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const chosen = new Date(currentYear, currentMonth, day);
    setSelectedDate(chosen);
    const dd = String(day).padStart(2, '0');
    const mm = String(currentMonth + 1).padStart(2, '0');
    const yyyy = currentYear;
    onChange(`${dd}-${mm}-${yyyy}`);
    onClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    onChange(`${dd}-${mm}-${yyyy}`);
    onClose();
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="font-bold text-sm">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month & Year Navigation */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 font-bold text-base">
              <span>{months[currentMonth]}</span>
              <span className="text-slate-500 dark:text-slate-400">{currentYear}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysOfWeek.map((d) => (
              <div key={d} className="text-xs font-bold text-slate-400 dark:text-slate-500 py-1">
                {d}
              </div>
            ))}

            {/* Padding for days before month start */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div
                key={`prev-${i}`}
                className="text-xs text-slate-300 dark:text-slate-700 py-2 select-none"
              >
                {prevMonthDays - firstDayIndex + i + 1}
              </div>
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`text-xs py-2 rounded-lg font-semibold transition cursor-pointer ${
                    selected
                      ? 'bg-sky-600 text-white shadow-sm font-bold scale-105'
                      : today
                      ? 'border border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleSelectToday}
            className="px-3 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold rounded-lg hover:bg-sky-200 dark:hover:bg-sky-800 transition cursor-pointer"
          >
            Today (آج)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
