import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/ when using a project page.
// Override with VITE_BASE in CI if the deploy path differs.
const base = process.env.VITE_BASE ?? '/read-receipts/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
