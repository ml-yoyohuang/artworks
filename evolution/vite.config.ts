import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { port: 5183 },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), diagnostic: resolve(__dirname, 'diagnostic.html') },
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
} as any);
