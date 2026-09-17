import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(
        new URL('./src/index.ts', import.meta.url),
      ),

      name: 'Test5Customization',

      formats: ['iife'],

      fileName: () => 'bundle.js',

      cssFileName: 'bundle',
    },

    outDir: 'dist',
    emptyOutDir: true,
  },
});