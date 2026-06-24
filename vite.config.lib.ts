import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      outDir: 'dist/types',
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        'grid-css-toolkit': resolve(__dirname, 'src/index.ts'),
        editor: resolve(__dirname, 'src/editor/index.ts'),
        preview: resolve(__dirname, 'src/preview/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'js' : 'umd.cjs';
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      external: ['gridstack'],
      output: {
        globals: {
          gridstack: 'GridStack',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          return 'assets/[name][extname]';
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: false,
    cssMinify: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
