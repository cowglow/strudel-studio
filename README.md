# COWGLOW's strudel studio & gallery

Strudel compositions, rendered to audio locally and published as a static gallery on GitHub Pages.

## Workflow

1. Write a composition in `compositions/<slug>.js` (try it at https://strudel.cc). Start it with a header:
   ```js
   // @title Jungle 01
   // @bars 24
   ```
   One bar = one cycle, so set the tempo with `setcpm(bpm / 4)`. Load samples with `await samples(...)`.
2. `npm run render` renders new or changed compositions in headless Chromium:
   - `renders/<slug>.wav` – master (git-ignored)
   - `public/audio/<slug>.mp3` – for the site (committed)
   - `src/tracks.json` – gallery data (committed)

   `npm run render -- <slug>` renders one, `npm run render -- --force` renders all.
3. `npm run dev` to preview the site, then commit and push; `.github/workflows/deploy.yml` publishes `dist/`.

First-time setup: `npm install && npx playwright install chromium`.

Strudel is AGPL-3.0-or-later.
