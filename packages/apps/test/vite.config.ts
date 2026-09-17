import { defineConfig } from 'vite'; // 补上这一行
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'; // 如果用了css插件也需要导入

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    rollupOptions: {
      input: './src/index.ts',
      output: {
        entryFileNames: 'bundle.js',
      },
    },
    outDir: './dist',
  },
});