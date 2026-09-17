import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(
        new URL('./src/index.ts', import.meta.url),
      ),
      name: 'KintoneCustomization', //TODO:若同一页面加载多个使用相同 `name` 的 IIFE bundle，可能产生全局变量冲突。
      formats: ['iife'],
      fileName: () => 'bundle.js',
      cssFileName: 'bundle',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});