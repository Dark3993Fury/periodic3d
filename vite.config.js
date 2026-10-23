import { defineConfig } from 'vite';

export default defineConfig({
  base: '/periodic3d/', // must match the GitHub repo name exactly
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
  },
});
