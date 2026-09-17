import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  resolve: {
    alias: {
      // 本 App 未使用 .vue SFC，而是用字符串 template（trading-input.ts）
      // 和 kintone view HTML 中的 in-DOM template（payment-entry.ts / payment-list.ts）。
      // 这两种写法都需要运行时模板编译器，而 Vite 默认解析的 "vue" 是不含编译器的
      // runtime-only 构建，会导致这些组件挂载后不渲染任何内容（且不报错）。
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },

  build: {
    lib: {
      entry: fileURLToPath(
        new URL('./src/index.ts', import.meta.url),
      ),

      name: 'KintoneCustomization',

      formats: ['iife'],

      fileName: () => 'bundle.js',

      cssFileName: 'bundle',
    },

    outDir: 'dist',
    emptyOutDir: true,
  },
});