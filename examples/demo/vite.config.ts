import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: [
      {
        find: /^grid-css-toolkit\/style\.css$/,
        replacement: resolve(__dirname, '../../src/style.css'),
      },
      {
        find: /^grid-css-toolkit$/,
        replacement: resolve(__dirname, '../../src/index.ts'),
      },
      {
        find: /^grid-css-toolkit\//,
        replacement: resolve(__dirname, '../../src') + '/',
      },
    ],
  },
  server: {
    port: 4444,
    open: false,
    host: 'localhost',
  },
  preview: {
    port: 3000,
    open: false,
    host: 'localhost',
  },
  optimizeDeps: {
    include: ['gridstack'],
    force: true,
  },
});
