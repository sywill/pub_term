import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules', 'dist', '**/*.d.ts', '**/*.test.ts'],
        },
        // Using pure mocks instead of database setup
        mockReset: true,
        env: {
            DATABASE_URL: 'file::memory:?cache=shared',
            JWT_SECRET: 'test-secret-key',
            JWT_EXPIRES_IN: '1h',
            NODE_ENV: 'test',
        },
    },
});
