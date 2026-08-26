import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    shopify({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
    }),
    tailwindcss(),
  ],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/assets/**', '**/snippets/vite-tag.liquid'],
    },
  },
})
