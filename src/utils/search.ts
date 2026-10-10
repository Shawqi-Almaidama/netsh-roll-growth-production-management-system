import { normalizeDigits } from './date.js';

/**
 * Normalizes Arabic text and digits for instant search comparison.
 */
export function normalizeSearchText(text: any): string {
  if (text === null || text === undefined) return '';
  return normalizeDigits(String(text))
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Checks whether a search query matches any of the candidate fields.
 */
export function matchesInstantSearch(query: string, fields: any[]): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return fields.some((field) => normalizeSearchText(field).includes(q));
}
