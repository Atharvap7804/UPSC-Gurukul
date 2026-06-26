import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),],
  base: '/', // Enforces standard root path lookup matrix
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  css: {
    transformer: 'postcss',
    minify: 'esbuild'
  }
})
