import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'dist/',
        'build/',
        'functions/lib/',
        'src/yourstop/'
      ]
    },
    include: ['tests/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules/', 'dist/', 'build/']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, './src/backend'),
      '@frontend': path.resolve(__dirname, './src/frontend')
    }
  }
})

