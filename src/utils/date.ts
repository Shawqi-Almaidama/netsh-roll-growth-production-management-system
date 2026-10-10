/**
 * Utilities for local Gregorian date handling, Arabic/English digit normalization,
 * and strict calendar validation (including leap years).
 */

export const ARABIC_MONTHS: { value: number; name: string; shortName: string }[] = [
  { value: 1, name: 'يناير (كانون الثاني)', shortName: 'يناير' },
  { value: 2, name: 'فبراير (شباط)', shortName: 'فبراير' },
  { value: 3, name: 'مارس (آذار)', shortName: 'مارس' },
  { value: 4, name: 'أبريل (نيسان)', shortName: 'أبريل' },
  { value: 5, name: 'مايو (أيار)', shortName: 'مايو' },
  { value: 6, name: 'يونيو (حزيران)', shortName: 'يونيو' },
  { value: 7, name: 'يوليو (تموز)', shortName: 'يوليو' },
  { value: 8, name: 'أغسطس (آب)', shortName: 'أغسطس' },
  { value: 9, name: 'سبتمبر (أيلول)', shortName: 'سبتمبر' },
  { value: 10, name: 'أكتوبر (تشرين الأول)', shortName: 'أكتوبر' },
  { value: 11, name: 'نوفمبر (تشرين الثاني)', shortName: 'نوفمبر' },
  { value: 12, name: 'ديسمبر (كانون الأول)', shortName: 'ديسمبر' },
];

/**
 * Converts Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits to standard ASCII (0-9).
 * If stripNonDigits is true, removes any non-digit characters.
 */
export function normalizeDigits(raw: string | number, stripNonDigits = false): string {
  const converted = String(raw)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return stripNonDigits ? converted.replace(/[^0-9]/g, '') : converted;
}

/**
 * Extracts only ASCII digits after normalizing Arabic/Persian digits.
 */
export function extractNormalizedDigits(raw: string | number): string {
  return normalizeDigits(raw, true);
}

/**
 * Returns whether a given Gregorian year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum number of days in a given Gregorian month (1-12) and year.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 31;
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Validates whether (year, month, day) forms a real Gregorian calendar date.
 */
export function validateGregorianParts(
  yearInput: string | number,
  monthInput: string | number,
  dayInput: string | number,
  required = false
): { valid: boolean; isoDate: string; error: string | null } {
  const yClean = extractNormalizedDigits(yearInput);
  const mClean = extractNormalizedDigits(monthInput);
  const dClean = extractNormalizedDigits(dayInput);

  const isAllEmpty = !yClean && !mClean && !dClean;
  if (isAllEmpty) {
    if (required) {
      return {
        valid: false,
        isoDate: '',
        error: 'يرجى إدخال التاريخ كاملاً (اليوم والشهر والسنة).'
      };
    }
    return { valid: true, isoDate: '', error: null };
  }

  if (!dClean || !mClean || !yClean) {
    return {
      valid: false,
      isoDate: '',
      error: 'التاريخ غير مكتمل؛ يرجى تحديد اليوم والشهر والسنة معًا.'
    };
  }

  if (yClean.length !== 4) {
    return {
      valid: false,
      isoDate: '',
      error: 'يرجى إدخال السنة من 4 أرقام (مثال: 2026).'
    };
  }

  const year = parseInt(yClean, 10);
  const month = parseInt(mClean, 10);
  const day = parseInt(dClean, 10);

  if (isNaN(year) || year < 1990 || year > 2100) {
    return {
      valid: false,
      isoDate: '',
      error: 'السنة المدخلة غير صالحة (يجب أن تكون بين 1990 و 2100).'
    };
  }

  if (isNaN(month) || month < 1 || month > 12) {
    return {
      valid: false,
      isoDate: '',
      error: 'الشهر المدخل غير صالح (يجب أن يكون بين 01 و 12).'
    };
  }

  const maxDays = getDaysInMonth(year, month);
  if (isNaN(day) || day < 1 || day > maxDays) {
    const monthName = ARABIC_MONTHS[month - 1]?.shortName || String(month);
    return {
      valid: false,
      isoDate: '',
      error: `اليوم المدخل (${day}) غير صالح لشهر ${monthName} ${year} (الحد الأقصى ${maxDays} يومًا).`
    };
  }

  const isoDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, isoDate, error: null };
}

/**
 * Formats (year, month, day) into YYYY-MM-DD.
 */
export function formatIsoDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parses an ISO date string YYYY-MM-DD into { year, month, day } or null if invalid.
 */
export function parseIsoDateString(isoDate: string): { year: number; month: number; day: number } | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) return null;
  const [yStr, mStr, dStr] = isoDate.trim().split('-');
  const check = validateGregorianParts(yStr, mStr, dStr, true);
  if (!check.valid) return null;
  return {
    year: parseInt(yStr, 10),
    month: parseInt(mStr, 10),
    day: parseInt(dStr, 10)
  };
}

/**
 * Formats a local Date instance into YYYY-MM-DD without UTC timezone shift.
 */
export function formatDateToLocalIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns today's local date in YYYY-MM-DD format.
 */
export function getLocalTodayDateString(): string {
  return formatDateToLocalIso(new Date());
}

/**
 * Returns a local date N days ago in YYYY-MM-DD format.
 */
export function getLocalDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDateToLocalIso(d);
}

/**
 * Returns a local date offset by N days (negative for past, positive for future) in YYYY-MM-DD format.
 */
export function getRelativeLocalDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateToLocalIso(d);
}

/**
 * Returns the first day of the current local month in YYYY-MM-DD format.
 */
export function getLocalFirstDayOfMonth(): string {
  const now = new Date();
  return formatDateToLocalIso(new Date(now.getFullYear(), now.getMonth(), 1));
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a readable Arabic Gregorian string,
 * e.g., "16 سبتمبر 2026 م".
 */
export function formatArabicDateDisplay(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  const monthObj = ARABIC_MONTHS[month - 1];
  if (!monthObj) return isoDate;
  return `${day} ${monthObj.shortName} ${year} م`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into "16 سبتمبر 2026".
 */
export function formatArabicReadableDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  const monthObj = ARABIC_MONTHS[month - 1];
  if (!monthObj) return isoDate;
  return `${day} ${monthObj.shortName} ${year}`;
}
