import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'grid-css-toolkit': resolve(__dirname, 'src/index.ts'),
        'editor': resolve(__dirname, 'src/editor/index.ts'),
        'preview': resolve(__dirname, 'src/preview/index.ts'),
      },
      formats: ['es', 'umd'],
      name: 'GridCssToolkit',
    },
    rollupOptions: {
      external: ['gridstack'],
      output: {
        globals: {
          gridstack: 'GridStack',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
