import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(
                new URL('./src', import.meta.url)
            ),
        },
    },

    test: {
        include: [
            'test/repositories/**/*.test.ts',
            'test/services/job-import-commit-service.test.ts',
        ],

        fileParallelism: false,
    },
});