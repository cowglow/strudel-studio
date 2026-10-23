import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  // relative asset paths, so the site works under https://<user>.github.io/<repo>/
  base: './',
  build: {
    rollupOptions: {
      // the site only; render/ is used by the dev server during `npm run render`
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery/index.html'),
      },
    },
  },
})
