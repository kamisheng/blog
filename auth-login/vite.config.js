import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/login/',
  plugins: [vue()],
  build: {
    outDir: '../source/login',
    emptyOutDir: true,
  },
})
