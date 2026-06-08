// Pure formatting helpers shared across components.

import type { Book } from './types.ts';

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatPages(n: number | null): string {
  if (n == null) return '';
  return `${n.toLocaleString('en-US')} pp.`;
}

/** "6 jun" — day + lowercase short month. Year is implied by the section. */
export function formatDayMonth(iso: string | null): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  if (!m || !d) return '';
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1] ?? ''}`;
}

/** "8 June 2026" — for the last-updated stamp. */
export function formatLongDate(iso: string): string {
  const dt = new Date(iso);
  return `${dt.getDate()} ${MONTHS_LONG[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function yearOf(book: Book): string {
  return book.dateRead?.slice(0, 4) ?? 'undated';
}

export function topGenres(tags: Book['tags'], n = 3): string[] {
  return tags.slice(0, n).map((t) => t.tag);
}

/** Stars rendered as HTML with a clip overlay for half-star precision. */
export function starsHtml(rating: number | null): string {
  if (rating == null) {
    return `<span class="entry-rating no-rating" aria-label="No rating"></span>`;
  }
  const pct = Math.max(0, Math.min(100, Math.round((rating / 5) * 100)));
  return (
    `<span class="entry-rating">` +
      `<span class="stars" style="--pct: ${pct}" role="img" aria-label="${rating} out of 5 stars">` +
        `<i aria-hidden="true"></i>` +
      `</span>` +
    `</span>`
  );
}

export function hardcoverUrl(slug: string): string {
  return `https://hardcover.app/books/${slug}`;
}

/** Escape user/external content before injecting via innerHTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
