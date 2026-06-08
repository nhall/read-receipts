// Shared data shape between the build-time fetch script and the frontend.
// The fetch script normalizes Hardcover's GraphQL response into this shape
// and writes it to src/data/books.json; the frontend imports the JSON
// and treats every entry as a Book.

export type Book = {
  /** Hardcover user_book id (stable per user/book pairing). */
  id: number;
  /** Hardcover book id (shared across all users). */
  bookId: number;
  /** Hardcover slug, used to link back to the book on hardcover.app. */
  slug: string;
  title: string;
  authors: string[];
  /** Cover image URL, or null if Hardcover has none on file. */
  coverUrl: string | null;
  /** Page count from Hardcover's edition metadata. */
  pages: number | null;
  /** Book's release date (YYYY-MM-DD), not when the user read it. */
  releaseDate: string | null;
  /** User's rating, 1–5 in half-star increments, or null if unrated. */
  rating: number | null;
  /** Date the user finished the book most recently (YYYY-MM-DD), or null. */
  dateRead: string | null;
  /** Date the user started reading (most recent attempt, YYYY-MM-DD), or null. */
  startedAt: string | null;
  /** Date the user added the book to their library (ISO datetime). */
  dateAdded: string | null;
  /**
   * Genre tags from Hardcover's `cached_tags.Genre`, with vote counts retained
   * so the UI can cap top-N or threshold by count without a re-fetch.
   * Sorted by count desc.
   */
  tags: { tag: string; count: number }[];
};

export type BooksData = {
  /** ISO datetime the fetch script ran. */
  generatedAt: string;
  /** Total number of read books (status_id 3 only). */
  count: number;
  /** Finished books, newest dateRead first. */
  books: Book[];
  /** Books with status_id 2 (currently reading), newest first. */
  currentlyReading: Book[];
};
