import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../source/assets/blog-profile',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        format: 'es',
        entryFileNames: 'profile.js',
        chunkFileNames: 'profile-[name].js',
        assetFileNames: 'profile[extname]',
        inlineDynamicImports: true,
      },
    },
  },
})
