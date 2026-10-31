
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
            'test/services/**/*.test.ts',
            'test/lib/**/*.test.ts',
        ],
        exclude: [
            'test/services/job-comparison-service.test.ts',
            'test/services/job-import-commit-service.test.ts',
        ],
    },
});
