import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5183 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
} as any);
