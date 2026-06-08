import type { Book, BooksData } from './types.ts';
import data from './data/books.json' with { type: 'json' };

import { renderHeader } from './components/header.ts';
import { renderStats } from './components/stats.ts';
import {
  renderControls,
  type ControlsState,
  type SortBy,
  type YearFilter,
  type RatingFilter,
} from './components/controls.ts';
import { renderList } from './components/list.ts';
import { renderCurrentlyReading } from './components/currently-reading.ts';
import { formatLongDate } from './format.ts';

const booksData = data as BooksData;
const ALL_BOOKS: readonly Book[] = booksData.books;

const state: ControlsState = {
  sort: 'date',
  year: 'all',
  minRating: 0,
};

let isFirstRender = true;

function filterAndSort(): Book[] {
  const filtered = ALL_BOOKS.filter((b) => {
    if (state.year !== 'all') {
      const y = b.dateRead?.slice(0, 4);
      if (state.year === 'undated') {
        if (b.dateRead != null) return false;
      } else if (y !== String(state.year)) {
        return false;
      }
    }
    if (state.minRating > 0) {
      if (b.rating == null || b.rating < state.minRating) return false;
    }
    return true;
  });

  return [...filtered].sort(comparator(state.sort));
}

function comparator(sort: SortBy): (a: Book, b: Book) => number {
  switch (sort) {
    case 'date':
      return (a, b) => (b.dateRead ?? '').localeCompare(a.dateRead ?? '');
    case 'rating':
      return (a, b) => {
        const r = (b.rating ?? -1) - (a.rating ?? -1);
        if (r !== 0) return r;
        return (b.dateRead ?? '').localeCompare(a.dateRead ?? '');
      };
    case 'pages':
      return (a, b) => (b.pages ?? -1) - (a.pages ?? -1);
  }
}

function mount(app: HTMLElement) {
  app.setAttribute('aria-busy', 'false');
  app.classList.add('first-render');

  // Static shell — header, stats, and controls placeholder. Stats and controls
  // are scoped to filterable subsets, so we re-render them on state change.
  app.innerHTML = `
    ${renderHeader(booksData.generatedAt)}
    ${renderCurrentlyReading(booksData.currentlyReading ?? [])}
    <div data-region="stats"></div>
    <div data-region="controls"></div>
    <div data-region="list"></div>
    <footer class="site-foot">
      <p>${booksData.count.toLocaleString('en-US')} books on file. Data refreshed ${formatLongDate(booksData.generatedAt)}.</p>
    </footer>
  `;

  render(app);

  app.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>('button[data-group]');
    if (!button) return;
    handleControlClick(button, app);
  });
}

function handleControlClick(button: HTMLButtonElement, app: HTMLElement) {
  const group = button.dataset.group;
  const value = button.dataset.value;
  if (!group || !value) return;

  switch (group) {
    case 'sort':
      if (value === 'date' || value === 'rating' || value === 'pages') {
        state.sort = value;
      }
      break;
    case 'year':
      if (value === 'all' || value === 'undated') {
        state.year = value as YearFilter;
      } else {
        const n = Number(value);
        if (!Number.isNaN(n)) state.year = n;
      }
      break;
    case 'rating': {
      const n = Number(value);
      if (n === 0 || n === 3 || n === 4 || n === 5) {
        state.minRating = n as RatingFilter;
      }
      break;
    }
    default:
      return;
  }

  isFirstRender = false;
  render(app);
}

function render(app: HTMLElement) {
  const filtered = filterAndSort();

  const stats = app.querySelector<HTMLElement>('[data-region="stats"]');
  const controls = app.querySelector<HTMLElement>('[data-region="controls"]');
  const list = app.querySelector<HTMLElement>('[data-region="list"]');

  if (stats) stats.innerHTML = renderStats(ALL_BOOKS as Book[]);
  if (controls) controls.innerHTML = renderControls(ALL_BOOKS as Book[], state);
  if (list) list.innerHTML = renderList(filtered, state.sort);

  if (!isFirstRender) {
    app.classList.remove('first-render');
  }
}

const app = document.querySelector<HTMLElement>('#app');
if (app) mount(app);
