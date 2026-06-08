import { escapeHtml, formatLongDate } from '../format.ts';

export function renderHeader(generatedAt: string): string {
  return `
    <header class="site-head">
      <h1 class="site-title">read <em>receipts</em></h1>
      <p class="site-tagline">
        A log of every book I&rsquo;ve finished.
        <span class="muted">Pulled from Hardcover, refreshed daily. Last updated ${escapeHtml(formatLongDate(generatedAt))}.</span>
      </p>
    </header>
  `;
}
