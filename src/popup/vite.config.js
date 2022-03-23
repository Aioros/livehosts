import { fileURLToPath, URL } from 'url'

import { resolve } from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: "./",
  build: {
    assetsDir: "popup-assets",
    outDir: "../../dist/popup",
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'popup.html'),
      }
    }
  }
})
