/**
 * Build-time fetch script for Hardcover reading history.
 *
 * Reads HARDCOVER_API_TOKEN from the environment (loaded from .env locally,
 * supplied by GitHub Actions secrets in CI), pulls every book the user has
 * marked as "read" (status_id = 3), normalizes the response into the shape
 * defined in src/types.ts, and writes it to src/data/books.json.
 *
 * Run via:   npm run fetch
 * Or:        tsx scripts/fetch-books.ts
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

import type { Book, BooksData } from '../src/types.ts';

loadEnv();

const HARDCOVER_ENDPOINT = 'https://api.hardcover.app/v1/graphql';
const READ_STATUS_ID = 3;
const READING_STATUS_ID = 2;
const PAGE_SIZE = 100;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/books.json');

// ---------------------------------------------------------------------------
// GraphQL query
// ---------------------------------------------------------------------------
//
// `me` returns the authenticated user. `user_books` is paginated; we sort by
// `id` ascending so we can stably page through the full set with limit/offset.
// `cached_contributors` and `cached_tags` are denormalized JSON columns that
// avoid extra joins — much faster than the live `contributions`/`taggings`.
//
// `user_book_reads` is the per-read-attempt table; we grab the most recent
// finished read to surface `dateRead` (a user_book itself doesn't store the
// finish date directly in a normalized way).

const QUERY = /* GraphQL */ `
  query ReadingHistory($limit: Int!, $offset: Int!) {
    me {
      user_books(
        where: { status_id: { _in: [${READING_STATUS_ID}, ${READ_STATUS_ID}] } }
        order_by: { id: asc }
        limit: $limit
        offset: $offset
      ) {
        id
        status_id
        rating
        date_added
        user_book_reads(order_by: { finished_at: desc_nulls_last }, limit: 1) {
          finished_at
          started_at
        }
        book {
          id
          slug
          title
          pages
          release_date
          cached_contributors
          cached_tags
          cached_image
          image {
            url
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Hardcover response shapes (only the fields we ask for)
// ---------------------------------------------------------------------------

type HardcoverCachedContributor =
  | { author?: { name?: string | null } | null; contribution?: string | null }
  | { name?: string | null };

type HardcoverCachedTagEntry = {
  tag?: string | null;
  category?: string | null;
  count?: number | null;
};

// cached_tags is a JSON column shaped like:
// { "Genre": [{ tag: "Fiction", count: 100, ... }, ...], "Mood": [...], ... }
type HardcoverCachedTags = Record<string, HardcoverCachedTagEntry[]> | null;

type HardcoverImage = { url?: string | null } | null;

type HardcoverUserBook = {
  id: number;
  status_id: number;
  rating: number | null;
  date_added: string | null;
  user_book_reads: Array<{ finished_at: string | null; started_at: string | null }>;
  book: {
    id: number;
    slug: string;
    title: string;
    pages: number | null;
    release_date: string | null;
    cached_contributors: HardcoverCachedContributor[] | null;
    cached_tags: HardcoverCachedTags;
    cached_image: { url?: string | null } | null;
    image: HardcoverImage;
  } | null;
};

type GraphQLResponse = {
  data?: { me?: Array<{ user_books: HardcoverUserBook[] }> };
  errors?: Array<{ message: string }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  const raw = process.env.HARDCOVER_API_TOKEN?.trim();
  if (!raw) {
    throw new Error(
      'HARDCOVER_API_TOKEN is not set. Add it to .env locally or to GitHub Actions secrets.',
    );
  }
  // The token copied from Hardcover sometimes already includes "Bearer ".
  return raw.replace(/^Bearer\s+/i, '');
}

async function graphql(token: string, variables: { limit: number; offset: number }) {
  const res = await fetch(HARDCOVER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hardcover API returned ${res.status} ${res.statusText}: ${body}`);
  }

  const payload = (await res.json()) as GraphQLResponse;
  if (payload.errors?.length) {
    throw new Error(`Hardcover GraphQL errors: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  return payload.data?.me?.[0]?.user_books ?? [];
}

function normalizeAuthors(raw: HardcoverCachedContributor[] | null): string[] {
  if (!raw) return [];
  const names: string[] = [];
  for (const entry of raw) {
    if ('author' in entry && entry.author?.name) {
      names.push(entry.author.name);
    } else if ('name' in entry && entry.name) {
      names.push(entry.name);
    }
  }
  return Array.from(new Set(names));
}

// Categories Hardcover stores in `cached_tags`. We only surface Genre tags
// in the UI — Mood/Content Warnings/etc. tend to be noisy and off-topic for
// a reading log. The exact key name is captured at fetch time and logged so
// we can adjust if Hardcover renames it.
const GENRE_CATEGORY = 'Genre';

// Populated as we walk responses, so the script can report what category
// keys it actually saw on this run.
const seenCategories = new Set<string>();

function normalizeTags(raw: HardcoverCachedTags): { tag: string; count: number }[] {
  if (!raw) return [];
  for (const key of Object.keys(raw)) seenCategories.add(key);

  const entries = raw[GENRE_CATEGORY];
  if (!Array.isArray(entries)) return [];

  // Keep highest count per unique tag name (Hardcover occasionally has dupes).
  const byTag = new Map<string, number>();
  for (const entry of entries) {
    const tag = entry.tag?.trim();
    if (!tag) continue;
    const count = entry.count ?? 0;
    if ((byTag.get(tag) ?? -1) < count) byTag.set(tag, count);
  }
  return Array.from(byTag.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}

function normalizeCover(book: NonNullable<HardcoverUserBook['book']>): string | null {
  return book.image?.url ?? book.cached_image?.url ?? null;
}

function normalizeDateRead(reads: HardcoverUserBook['user_book_reads']): string | null {
  const finishedAt = reads[0]?.finished_at;
  if (!finishedAt) return null;
  return finishedAt.slice(0, 10);
}

function normalizeStartedAt(reads: HardcoverUserBook['user_book_reads']): string | null {
  const startedAt = reads[0]?.started_at;
  if (!startedAt) return null;
  return startedAt.slice(0, 10);
}

function toBook(userBook: HardcoverUserBook): Book | null {
  const { book } = userBook;
  if (!book) return null;
  return {
    id: userBook.id,
    bookId: book.id,
    slug: book.slug,
    title: book.title,
    authors: normalizeAuthors(book.cached_contributors),
    coverUrl: normalizeCover(book),
    pages: book.pages,
    releaseDate: book.release_date,
    rating: userBook.rating,
    dateRead: normalizeDateRead(userBook.user_book_reads),
    startedAt: normalizeStartedAt(userBook.user_book_reads),
    dateAdded: userBook.date_added,
    tags: normalizeTags(book.cached_tags),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = getToken();
  const read: Book[] = [];
  const reading: Book[] = [];

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await graphql(token, { limit: PAGE_SIZE, offset });
    if (page.length === 0) break;
    for (const userBook of page) {
      const book = toBook(userBook);
      if (!book) continue;
      if (userBook.status_id === READING_STATUS_ID) reading.push(book);
      else read.push(book);
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Read books: newest finish first.
  read.sort((a, b) => (b.dateRead ?? '').localeCompare(a.dateRead ?? ''));
  // Currently reading: most recently started first, then newest added.
  reading.sort((a, b) => {
    const s = (b.startedAt ?? '').localeCompare(a.startedAt ?? '');
    if (s !== 0) return s;
    return (b.dateAdded ?? '').localeCompare(a.dateAdded ?? '');
  });

  const out: BooksData = {
    generatedAt: new Date().toISOString(),
    count: read.length,
    books: read,
    currentlyReading: reading,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${read.length} read + ${reading.length} currently reading to ${OUTPUT_PATH}`);
  console.log(
    `cached_tags categories seen: ${Array.from(seenCategories).sort().join(', ') || '(none)'}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
