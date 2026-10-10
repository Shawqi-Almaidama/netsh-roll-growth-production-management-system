import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ARABIC_MONTHS,
  normalizeDigits,
  getDaysInMonth,
  validateGregorianParts,
  getLocalTodayDateString,
  getLocalDateDaysAgo,
  formatArabicDateDisplay
} from '../../utils/date.js';

export interface DateInputProps {
  id?: string;
  label?: string;
  value: string; // YYYY-MM-DD or ''
  onChange: (isoDate: string) => void;
  onValidityChange?: (isValid: boolean, errorMessage: string | null) => void;
  required?: boolean;
  emptyHelperText?: string;
  className?: string;
  compact?: boolean;
}

const WEEKDAYS_AR = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

export const DateInput: React.FC<DateInputProps> = ({
  id,
  label,
  value,
  onChange,
  onValidityChange,
  required = false,
  emptyHelperText = 'غير محدد (الكل)',
  className = '',
  compact = false
}) => {
  const parseIsoParts = (iso: string) => {
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return { year: y, month: m, day: d };
    }
    return { year: '', month: '', day: '' };
  };

  const initialParts = parseIsoParts(value);
  const [dayStr, setDayStr] = useState<string>(initialParts.day);
  const [monthStr, setMonthStr] = useState<string>(initialParts.month);
  const [yearStr, setYearStr] = useState<string>(initialParts.year);
  const [touched, setTouched] = useState<boolean>(false);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

  // Calendar popover view state (year & month 1..12)
  const todayIso = getLocalTodayDateString();
  const [todayY, todayM] = todayIso.split('-').map((n) => parseInt(n, 10));
  const [viewYear, setViewYear] = useState<number>(
    initialParts.year ? parseInt(initialParts.year, 10) : todayY
  );
  const [viewMonth, setViewMonth] = useState<number>(
    initialParts.month ? parseInt(initialParts.month, 10) : todayM
  );

  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external `value` prop changes (e.g. Reset button or preset selection)
  useEffect(() => {
    const parts = parseIsoParts(value);
    const currentValidation = validateGregorianParts(yearStr, monthStr, dayStr, required);
    if (value !== currentValidation.isoDate) {
      setDayStr(parts.day);
      setMonthStr(parts.month);
      setYearStr(parts.year);
      if (parts.year && parts.month) {
        setViewYear(parseInt(parts.year, 10));
        setViewMonth(parseInt(parts.month, 10));
      }
      if (!value) {
        setTouched(false);
      }
    }
  }, [value]);

  // Close calendar popover on outside click or Escape
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPickerOpen]);

  const evaluateAndNotify = (nextYear: string, nextMonth: string, nextDay: string) => {
    const result = validateGregorianParts(nextYear, nextMonth, nextDay, required);
    onValidityChange?.(result.valid, result.error);
    if (result.valid) {
      onChange(result.isoDate);
      if (result.isoDate) {
        const [y, m] = result.isoDate.split('-').map((n) => parseInt(n, 10));
        setViewYear(y);
        setViewMonth(m);
      }
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = normalizeDigits(e.target.value, true).slice(0, 2);
    setDayStr(digits);
    setTouched(true);
    evaluateAndNotify(yearStr, monthStr, digits);

    // Auto-advance to Month field on 2 digits or if single digit > 3 (4..9)
    if (digits.length === 2 || (digits.length === 1 && parseInt(digits, 10) > 3)) {
      const padded = digits.length === 1 ? `0${digits}` : digits;
      if (digits.length === 1) {
        setDayStr(padded);
        evaluateAndNotify(yearStr, monthStr, padded);
      }
      monthInputRef.current?.focus();
      monthInputRef.current?.select();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = normalizeDigits(e.target.value, true).slice(0, 2);
    setMonthStr(digits);
    setTouched(true);
    evaluateAndNotify(yearStr, digits, dayStr);

    // Auto-advance to Year field on 2 digits or if single digit > 1 (2..9)
    if (digits.length === 2 || (digits.length === 1 && parseInt(digits, 10) > 1)) {
      const padded = digits.length === 1 ? `0${digits}` : digits;
      if (digits.length === 1) {
        setMonthStr(padded);
        evaluateAndNotify(yearStr, padded, dayStr);
      }
      yearInputRef.current?.focus();
      yearInputRef.current?.select();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = normalizeDigits(e.target.value, true).slice(0, 4);
    setYearStr(digits);
    setTouched(true);
    evaluateAndNotify(digits, monthStr, dayStr);
  };

  const handleDayBlur = () => {
    setTouched(true);
    if (dayStr.length === 1 && dayStr !== '0') {
      const padded = `0${dayStr}`;
      setDayStr(padded);
      evaluateAndNotify(yearStr, monthStr, padded);
    } else {
      evaluateAndNotify(yearStr, monthStr, dayStr);
    }
  };

  const handleMonthBlur = () => {
    setTouched(true);
    if (monthStr.length === 1 && monthStr !== '0') {
      const padded = `0${monthStr}`;
      setMonthStr(padded);
      evaluateAndNotify(yearStr, padded, dayStr);
    } else {
      evaluateAndNotify(yearStr, monthStr, dayStr);
    }
  };

  const handleYearBlur = () => {
    setTouched(true);
    evaluateAndNotify(yearStr, monthStr, dayStr);
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !monthStr) {
      dayInputRef.current?.focus();
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !yearStr) {
      monthInputRef.current?.focus();
    }
  };

  const applyIsoDate = (iso: string) => {
    const parts = parseIsoParts(iso);
    setDayStr(parts.day);
    setMonthStr(parts.month);
    setYearStr(parts.year);
    setTouched(true);
    onValidityChange?.(true, null);
    onChange(iso);
    if (parts.year && parts.month) {
      setViewYear(parseInt(parts.year, 10));
      setViewMonth(parseInt(parts.month, 10));
    }
    setIsPickerOpen(false);
  };

  const handleClear = () => {
    setDayStr('');
    setMonthStr('');
    setYearStr('');
    setTouched(false);
    const valid = !required;
    onValidityChange?.(valid, valid ? null : 'يرجى إدخال التاريخ كاملاً (اليوم والشهر والسنة).');
    onChange('');
    setIsPickerOpen(false);
  };

  const handleSelectCalendarDay = (dayNum: number) => {
    const iso = `${String(viewYear).padStart(4, '0')}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    applyIsoDate(iso);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const validation = validateGregorianParts(yearStr, monthStr, dayStr, required);
  const hasAnyInput = Boolean(dayStr || monthStr || yearStr);
  const showError = (touched || (hasAnyInput && yearStr.length === 4)) && !validation.valid && Boolean(validation.error);

  // Calendar grid generation for (viewYear, viewMonth)
  const daysInViewMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayWeekIndex = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 = Sunday
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInViewMonth; d++) {
    calendarDays.push(d);
  }

  const yearOptions: number[] = [];
  for (let y = todayY - 6; y <= todayY + 5; y++) {
    yearOptions.push(y);
  }

  return (
    <div ref={containerRef} id={id} className={`relative w-full ${className}`} dir="rtl">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={id ? `${id}-day` : undefined}
            className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{label}</span>
            {required && <span className="text-rose-600">*</span>}
          </label>

          {/* Readable Selected Date Badge */}
          {validation.valid && validation.isoDate ? (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{formatArabicDateDisplay(validation.isoDate)}</span>
            </span>
          ) : !hasAnyInput && !required ? (
            <span className="text-[11px] text-slate-400 font-medium">{emptyHelperText}</span>
          ) : null}
        </div>
      )}

      {/* Main Segmented Date Input Container */}
      <div
        className={`flex items-stretch bg-white rounded-xl border transition-all shadow-2xs ${
          showError
            ? 'border-rose-400 ring-2 ring-rose-500/15'
            : isPickerOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/15'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/15'
        }`}
      >
        {/* Segmented Inputs: Day / Month / Year in clear RTL visual order */}
        <div className="flex-1 grid grid-cols-3 divide-x divide-x-reverse divide-slate-200">
          {/* 1. Day Field (اليوم) */}
          <div
            onClick={() => dayInputRef.current?.focus()}
            className={`flex flex-col justify-center px-2.5 cursor-text ${
              compact ? 'py-1' : 'py-1.5'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 leading-tight select-none">
              اليوم
            </span>
            <input
              ref={dayInputRef}
              id={id ? `${id}-day` : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              dir="ltr"
              placeholder="DD"
              aria-label={label ? `${label} - اليوم` : 'اليوم'}
              value={dayStr}
              onChange={handleDayChange}
              onBlur={handleDayBlur}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent text-center font-mono text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none mt-0.5"
            />
          </div>

          {/* 2. Month Field (الشهر) */}
          <div
            onClick={() => monthInputRef.current?.focus()}
            className={`flex flex-col justify-center px-2.5 cursor-text ${
              compact ? 'py-1' : 'py-1.5'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 leading-tight select-none">
              الشهر
            </span>
            <input
              ref={monthInputRef}
              id={id ? `${id}-month` : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              dir="ltr"
              placeholder="MM"
              aria-label={label ? `${label} - الشهر` : 'الشهر'}
              value={monthStr}
              onChange={handleMonthChange}
              onBlur={handleMonthBlur}
              onKeyDown={handleMonthKeyDown}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent text-center font-mono text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none mt-0.5"
            />
          </div>

          {/* 3. Year Field (السنة) */}
          <div
            onClick={() => yearInputRef.current?.focus()}
            className={`flex flex-col justify-center px-2.5 cursor-text ${
              compact ? 'py-1' : 'py-1.5'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 leading-tight select-none">
              السنة
            </span>
            <input
              ref={yearInputRef}
              id={id ? `${id}-year` : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              dir="ltr"
              placeholder="YYYY"
              aria-label={label ? `${label} - السنة` : 'السنة'}
              value={yearStr}
              onChange={handleYearChange}
              onBlur={handleYearBlur}
              onKeyDown={handleYearKeyDown}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent text-center font-mono text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none mt-0.5"
            />
          </div>
        </div>

        {/* Action Buttons: Clear (when optional & has input) + Calendar Popover Trigger */}
        <div className="flex items-center border-r border-slate-200 px-1 gap-0.5 bg-slate-50/70 rounded-l-xl">
          {!required && hasAnyInput && (
            <button
              type="button"
              onClick={handleClear}
              title="مسح التاريخ"
              aria-label="مسح التاريخ"
              className="w-8 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            title="فتح التقويم لاختيار التاريخ"
            aria-label="فتح التقويم لاختيار التاريخ"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              isPickerOpen
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-700 hover:bg-emerald-100/80'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Validation Error Message */}
      {showError && (
        <div
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Interactive Arabic Gregorian Calendar Popover */}
      {isPickerOpen && (
        <div
          className="absolute z-50 mt-1.5 right-0 left-0 sm:left-auto sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 space-y-3 animate-fadeIn"
          dir="rtl"
        >
          {/* Calendar Month & Year Navigation Header */}
          <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shrink-0"
              title="الشهر السابق"
              aria-label="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 flex-1 min-w-0">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                aria-label="اختر الشهر"
                className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                {ARABIC_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {String(m.value).padStart(2, '0')} - {m.shortName}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                aria-label="اختر السنة"
                dir="ltr"
                className="w-20 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shrink-0"
              title="الشهر التالي"
              aria-label="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS_AR.map((dayName) => (
              <span
                key={dayName}
                className="text-[11px] font-bold text-slate-400 py-1 select-none"
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="h-9" />;
              }

              const cellIso = `${String(viewYear).padStart(4, '0')}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = validation.valid && validation.isoDate === cellIso;
              const isToday = cellIso === todayIso;

              return (
                <button
                  key={cellIso}
                  type="button"
                  onClick={() => handleSelectCalendarDay(dayNum)}
                  className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-700/30'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Selection Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyIsoDate(getLocalTodayDateString())}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => applyIsoDate(getLocalDateDaysAgo(1))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                أمس
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {!required && hasAnyInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors"
                >
                  مسح
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
