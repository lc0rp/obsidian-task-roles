import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'c8',
            reporter: ['text', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            obsidian: path.resolve(__dirname, 'tests/__mocks__/obsidian.ts'),
        },
    },
}); 