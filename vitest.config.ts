import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // graphql 16 has no "exports" map: Vite would pick its ESM build while Node gives Yoga the
    // CommonJS one, and two GraphQLError classes break Yoga's error masking in tests.
    alias: [{ find: /^graphql$/, replacement: 'graphql/index.js' }],
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
