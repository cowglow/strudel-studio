import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { studioApi } from './studio/api.ts'

export default defineConfig({
  // relative asset paths, so the site works under https://<user>.github.io/<repo>/
  base: './',
  // local-only editor API for /studio/, dev server only
  plugins: [studioApi()],
  build: {
    rollupOptions: {
      // the site only; studio/ and render/ are local tools served by the dev server
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery/index.html'),
        about: resolve(import.meta.dirname, 'about/index.html'),
      },
    },
  },
})
