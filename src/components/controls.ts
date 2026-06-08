import type { Book } from '../types.ts';
import { yearOf } from '../format.ts';

export type SortBy = 'date' | 'rating' | 'pages';
export type YearFilter = number | 'all' | 'undated';
export type RatingFilter = 0 | 3 | 4 | 5;

export type ControlsState = {
  sort: SortBy;
  year: YearFilter;
  minRating: RatingFilter;
};

const SORT_OPTIONS: Array<{ key: SortBy; label: string }> = [
  { key: 'date', label: 'By date read' },
  { key: 'rating', label: 'By rating' },
  { key: 'pages', label: 'By length' },
];

const RATING_OPTIONS: Array<{ key: RatingFilter; label: string }> = [
  { key: 0, label: 'Any' },
  { key: 3, label: '3+' },
  { key: 4, label: '4+' },
  { key: 5, label: '5' },
];

function button<T extends string | number>(
  group: string,
  value: T,
  label: string,
  pressed: boolean,
): string {
  return `<button type="button" data-group="${group}" data-value="${value}" aria-pressed="${pressed}">${label}</button>`;
}

function sep(): string {
  return `<span class="sep" aria-hidden="true">·</span>`;
}

function join(buttons: string[]): string {
  const out: string[] = [];
  buttons.forEach((b, i) => {
    if (i > 0) out.push(sep());
    out.push(b);
  });
  return out.join('\n');
}

export function renderControls(books: Book[], state: ControlsState): string {
  // Years present in the data, descending.
  const yearSet = new Set<string>();
  let hasUndated = false;
  for (const b of books) {
    const y = yearOf(b);
    if (y === 'undated') hasUndated = true;
    else yearSet.add(y);
  }
  const years = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));

  const yearButtons: string[] = [button('year', 'all', 'All', state.year === 'all')];
  for (const y of years) {
    yearButtons.push(button('year', y, y, String(state.year) === y));
  }
  if (hasUndated) {
    yearButtons.push(button('year', 'undated', 'Undated', state.year === 'undated'));
  }

  const sortButtons = SORT_OPTIONS.map((o) =>
    button('sort', o.key, o.label, state.sort === o.key),
  );

  const ratingButtons = RATING_OPTIONS.map((o) =>
    button('rating', o.key, o.label, state.minRating === o.key),
  );

  return `
    <dl class="controls" aria-label="Filter and sort">
      <dt>Sort</dt>
      <dd>${join(sortButtons)}</dd>
      <dt>Year</dt>
      <dd>${join(yearButtons)}</dd>
      <dt>Rating</dt>
      <dd>${join(ratingButtons)}</dd>
    </dl>
  `;
}
