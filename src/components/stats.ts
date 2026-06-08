import type { Book } from '../types.ts';

const CURRENT_YEAR = new Date().getFullYear();

export function renderStats(books: Book[]): string {
  const total = books.length;
  const totalPages = books.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  const rated = books.filter((b) => b.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
      : null;
  const thisYear = books.filter(
    (b) => b.dateRead?.startsWith(String(CURRENT_YEAR)),
  ).length;

  return `
    <section class="stats" aria-label="Lifetime stats">
      <div class="stat">
        <b>${total.toLocaleString('en-US')}</b>
        <span>Books read</span>
      </div>
      <div class="stat">
        <b>${totalPages.toLocaleString('en-US')}</b>
        <span>Pages</span>
      </div>
      <div class="stat">
        <b>${avgRating != null ? avgRating.toFixed(1) : '—'}</b>
        <span>Average rating</span>
      </div>
      <div class="stat">
        <b>${thisYear.toLocaleString('en-US')}</b>
        <span>In ${CURRENT_YEAR}</span>
      </div>
    </section>
  `;
}
