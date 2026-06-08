import type { Book } from '../types.ts';
import { escapeHtml, hardcoverUrl } from '../format.ts';

function renderItem(book: Book): string {
  const authors = book.authors.length > 0 ? book.authors.join(' & ') : 'Unknown author';
  return `
    <li class="reading-item">
      <a class="reading-title" href="${hardcoverUrl(book.slug)}" target="_blank" rel="noopener noreferrer">${escapeHtml(book.title)}</a>
      <p class="reading-author">${escapeHtml(authors)}</p>
    </li>
  `;
}

export function renderCurrentlyReading(books: Book[]): string {
  if (books.length === 0) return '';
  return `
    <section class="now-reading" aria-label="Currently reading">
      <h2 class="now-reading-label">Now reading</h2>
      <ol class="reading-list">
        ${books.map(renderItem).join('')}
      </ol>
    </section>
  `;
}
