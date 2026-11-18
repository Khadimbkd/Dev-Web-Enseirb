import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // Scripts de développement et point de démarrage : pas de tests unitaires
      exclude: ['src/db/reset.js', 'src/db/seed.js', 'src/main.js'],
      reporter: ['text', 'html'],
    },
  },
});
