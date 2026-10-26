import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../source/assets/kami-comments',
    // 目录里还有手写的 wall.js（留言板运行时），不能被 vite 清空
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        format: 'es',
        entryFileNames: 'comment-widget.js',
        chunkFileNames: 'comment-widget-[name].js',
        assetFileNames: 'comment-widget[extname]',
        inlineDynamicImports: true,
      },
    },
  },
})
