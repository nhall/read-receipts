import type { Book } from '../types.ts';
import {
  escapeHtml,
  formatDayMonth,
  formatPages,
  hardcoverUrl,
  starsHtml,
  topGenres,
  yearOf,
} from '../format.ts';
import type { SortBy } from './controls.ts';

function genreStrip(book: Book): string {
  const genres = topGenres(book.tags, 3);
  if (genres.length === 0) return '';
  return `<span class="genre">${escapeHtml(genres.join(' · '))}</span>`;
}

function renderEntry(book: Book, index: number): string {
  const authors = book.authors.length > 0 ? book.authors.join(' & ') : 'Unknown author';
  const genre = genreStrip(book);
  const metaParts = [escapeHtml(authors)];
  if (genre) metaParts.push(genre);

  return `
    <li style="--i: ${index}">
      <article class="entry">
        <div class="entry-head">
          <h3 class="entry-title">
            <a href="${hardcoverUrl(book.slug)}" target="_blank" rel="noopener noreferrer">${escapeHtml(book.title)}</a>
          </h3>
          <p class="entry-meta">${metaParts.join(' &nbsp;·&nbsp; ')}</p>
        </div>
        <div class="entry-stats">
          <span class="entry-pages">${escapeHtml(formatPages(book.pages))}</span>
          ${starsHtml(book.rating)}
          <span class="entry-date">${escapeHtml(formatDayMonth(book.dateRead))}</span>
        </div>
      </article>
    </li>
  `;
}

function yearMeta(books: Book[]): string {
  const pages = books.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  return `${books.length} book${books.length === 1 ? '' : 's'} &nbsp;·&nbsp; ${pages.toLocaleString('en-US')} pages`;
}

function renderYearSection(year: string, books: Book[], startIndex: number): string {
  const heading = year === 'undated' ? 'Undated' : year;
  return `
    <section class="year">
      <header class="year-head">
        <h2>${heading}</h2>
        <p class="year-meta">${yearMeta(books)}</p>
      </header>
      <ol class="entries">
        ${books.map((b, i) => renderEntry(b, startIndex + i)).join('')}
      </ol>
    </section>
  `;
}

function renderFlat(books: Book[]): string {
  return `
    <ol class="entries">
      ${books.map((b, i) => renderEntry(b, i)).join('')}
    </ol>
  `;
}

export function renderList(books: Book[], sort: SortBy): string {
  if (books.length === 0) {
    return `<p class="empty">No books match these filters.</p>`;
  }

  // Year groupings only make sense when reading chronologically.
  if (sort !== 'date') return renderFlat(books);

  const groups = new Map<string, Book[]>();
  for (const book of books) {
    const y = yearOf(book);
    let list = groups.get(y);
    if (!list) {
      list = [];
      groups.set(y, list);
    }
    list.push(book);
  }

  // Order: years descending, "undated" last.
  const keys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return Number(b) - Number(a);
  });

  let runningIndex = 0;
  const sections: string[] = [];
  for (const key of keys) {
    const list = groups.get(key)!;
    sections.push(renderYearSection(key, list, runningIndex));
    runningIndex += list.length;
  }
  return sections.join('');
}
