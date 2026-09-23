import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: [
            'test/repositories/**/*.test.ts',
        ],

        fileParallelism: false,
    },
});