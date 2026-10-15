import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Os testes de integração compartilham o banco de teste; execução sequencial evita interferência.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
